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
    
    // Calculate heat halo radius for each sample
    // Halo radius = distance from sample center where temp drops to ambient + threshold
    const calculateHaloRadius = (sample: Sample): number => {
      const sampleRim = sample.radius + (1 * PIXELS_PER_INCH);
      let maxHaloRadius = 0;
      
      // Check in 8 directions from sample center
      const directions = 8;
      for (let i = 0; i < directions; i++) {
        const angle = (i / directions) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        
        // Start from rim edge and move outward
        let distance = sampleRim;
        const maxDistance = Math.min(canvasWidth, canvasHeight) / 2; // Don't check beyond half canvas
        
        while (distance < maxDistance) {
          const x = sample.x + dx * distance;
          const y = sample.y + dy * distance;
          const temp = getTempAt(x, y);
          
          // If temperature has dropped to near ambient, this is the halo edge
          if (temp - ambientTemp < threshold) {
            maxHaloRadius = Math.max(maxHaloRadius, distance - sampleRim);
            break;
          }
          
          distance += 5; // Check every 5 pixels
        }
      }
      
      return maxHaloRadius;
    };
    
    // Get halo radii for both samples
    const halo1 = calculateHaloRadius(s1);
    const halo2 = calculateHaloRadius(s2);
    
    // Check if halos overlap
    // Halos overlap when: distance_between_rims < (halo1_radius + halo2_radius)
    const totalHaloReach = halo1 + halo2;
    
    if (edgeDist >= totalHaloReach) {
      // No overlap - no interference
      return 0;
    }
    
    // Calculate overlap amount
    const overlapAmount = totalHaloReach - edgeDist;
    
    // FIXED GRADUAL FORMULA:
    // Calculate interference as a percentage of the total possible halo reach.
    // This provides a smooth, gradual increase from 0% to 100%.
    // 
    // When halos just start to touch: small overlap / large total reach = low %
    // As halos grow and overlap more: larger overlap / total reach = medium %
    // When halos deeply overlap: large overlap / total reach = high %
    // When samples touch physically: returns 100% (handled above)
    const interferencePercentage = (overlapAmount / totalHaloReach) * 100;
    
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