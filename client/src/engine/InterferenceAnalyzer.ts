import { Sample, Container } from '../types';
import { PIXELS_PER_INCH } from '../const';

export class InterferenceCalculator {
  // Calculate thermal interference between samples based on actual heat map overlap
  // Returns a score 0-100 where 0 is no interference and 100 is max interference
  static calculateInterference(
    s1: Sample, 
    s2: Sample, 
    container: Container, 
    elapsedTime: number,
    gridData: number[][] | null,
    canvasWidth: number,
    canvasHeight: number
  ): number {
    // If no grid data yet, return 0
    if (!gridData || gridData.length === 0) return 0;
    
    const ambientTemp = container.ambient_temperature;
    const threshold = 1.5; // °F - minimum elevation to consider as "heat halo" (captures growing halos early)
    
    const gridH = gridData.length;
    const gridW = gridData[0].length;
    
    // Calculate rim radii (sample radius + 1 inch)
    const rim1 = s1.radius + (1 * PIXELS_PER_INCH);
    const rim2 = s2.radius + (1 * PIXELS_PER_INCH);
    
    // Calculate distance between sample centers and rim edges
    const centerDist = Math.sqrt((s2.x - s1.x)**2 + (s2.y - s1.y)**2);
    const edgeDist = centerDist - rim1 - rim2;
    
    // If physically touching or overlapping
    if (edgeDist <= 0) return 100;
    
    // Helper function to get temperature at a point
    const getTempAt = (x: number, y: number): number => {
      const gx = Math.floor((x / canvasWidth) * gridW);
      const gy = Math.floor((y / canvasHeight) * gridH);
      
      if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
        return gridData[gy][gx];
      }
      return ambientTemp;
    };
    
    // NEW APPROACH: Sample temperatures along the line between samples
    // Calculate interference based on average temperature elevation in the gap
    // This gives gradual increase as heat spreads
    
    // Sample points along the line between the two sample rims
    const numSamples = 20;
    let totalTempElevation = 0;
    let samplesAboveThreshold = 0;
    
    // Vector from s1 to s2
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // Start sampling from edge of s1's rim to edge of s2's rim
    const startDist = rim1;
    const endDist = distance - rim2;
    const gapDistance = endDist - startDist;
    
    if (gapDistance <= 0) {
      // Samples are touching or overlapping
      return 100;
    }
    
    // Sample temperatures in the gap between the rims
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const dist = startDist + t * gapDistance;
      const x = s1.x + unitX * dist;
      const y = s1.y + unitY * dist;
      const temp = getTempAt(x, y);
      const elevation = temp - ambientTemp;
      
      if (elevation > threshold) {
        samplesAboveThreshold++;
        totalTempElevation += elevation;
      }
    }
    
    // If no samples are above threshold, no interference
    if (samplesAboveThreshold === 0) {
      return 0;
    }
    
    // Calculate average temperature elevation in the gap
    const avgElevation = totalTempElevation / samplesAboveThreshold;
    
    // Define a reference temperature for "significant" interference
    // This should be calibrated based on your application
    // For example, 10°F above ambient = significant interference
    const significantTempRise = 10.0; // °F
    
    // Calculate interference percentage based on:
    // 1. How many sample points show heat (coverage)
    // 2. How hot those points are (intensity)
    const coveragePercent = (samplesAboveThreshold / (numSamples + 1)) * 100;
    const intensityPercent = Math.min(100, (avgElevation / significantTempRise) * 100);
    
    // Combine coverage and intensity (weighted average)
    // Coverage is more important early on, intensity matters more later
    const interferencePercentage = (coveragePercent * 0.6) + (intensityPercent * 0.4);
    
    return Math.min(100, Math.max(0, interferencePercentage))
  }

  static getInterferenceReport(
    samples: Sample[], 
    container: Container, 
    elapsedTime: number = 0,
    gridData: number[][] | null = null,
    canvasWidth: number = 0,
    canvasHeight: number = 0
  ): string[] {
    const report: string[] = [];
    let maxInterference = 0;
    
    // Helper function to determine if two samples are neighbors
    // Neighbors are within 1 row or 1 column of each other
    const areNeighbors = (s1: Sample, s2: Sample): boolean => {
      const dx = Math.abs(s2.x - s1.x);
      const dy = Math.abs(s2.y - s1.y);
      
      // Calculate approximate grid spacing
      // Find minimum distance between any two samples to estimate grid spacing
      let minDist = Infinity;
      for (let i = 0; i < samples.length; i++) {
        for (let j = i + 1; j < samples.length; j++) {
          const dist = Math.sqrt(
            (samples[j].x - samples[i].x)**2 + 
            (samples[j].y - samples[i].y)**2
          );
          if (dist > 0) minDist = Math.min(minDist, dist);
        }
      }
      
      // If samples are within 1.5x the minimum grid spacing, they're neighbors
      // This accounts for both orthogonal and diagonal neighbors
      const distance = Math.sqrt(dx**2 + dy**2);
      const neighborThreshold = minDist * 1.5;
      
      return distance <= neighborThreshold;
    };
    
    // Check each sample against all others (not just unique pairs)
    // This ensures we show all relationships
    for (let i = 0; i < samples.length; i++) {
      for (let j = 0; j < samples.length; j++) {
        if (i === j) continue; // Skip self
        
        // Only check neighbors
        if (!areNeighbors(samples[i], samples[j])) continue;
        
        const score = this.calculateInterference(
          samples[i], 
          samples[j], 
          container, 
          elapsedTime,
          gridData,
          canvasWidth,
          canvasHeight
        );
        
        // Only report significant interference (> 1%)
        if (score > 1.0) { 
          report.push(`${samples[i].name} ↔ ${samples[j].name}: ${score.toFixed(1)}%`);
          maxInterference = Math.max(maxInterference, score);
        }
      }
    }
    
    if (report.length === 0) {
      if (elapsedTime === 0 || !gridData) {
        report.push("Simulation not started. No thermal interference.");
      } else {
        report.push("No thermal interference detected.");
      }
    }
    
    return report;
  }
}