import { Sample, Container } from '../types';
import { PIXELS_PER_INCH } from '../const';

export class InterferenceCalculator {
  // Calculate thermal interference between samples based on actual heat map data
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
    
    const dist = Math.sqrt((s2.x - s1.x)**2 + (s2.y - s1.y)**2);
    
    // Measure from RIM EDGE (Radius + 1 inch)
    const rim1 = s1.radius + (1 * PIXELS_PER_INCH);
    const rim2 = s2.radius + (1 * PIXELS_PER_INCH);
    const edgeDist = dist - rim1 - rim2;
    
    // If physically touching or overlapping
    if (edgeDist <= 0) return 100;

    // Sample points around the rim of each sample to check for heat overlap
    // We'll check if the temperature at s2's rim is elevated due to s1's heat
    const ambientTemp = container.ambient_temperature;
    const threshold = 0.5; // °F - minimum temperature elevation to consider interference
    
    const gridH = gridData.length;
    const gridW = gridData[0].length;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    
    // Sample 16 points around each sample's rim
    const numSamples = 16;
    let maxTempElevation1 = 0; // Max temp elevation at s2's location due to s1
    let maxTempElevation2 = 0; // Max temp elevation at s1's location due to s2
    
    for (let i = 0; i < numSamples; i++) {
      const angle = (i / numSamples) * Math.PI * 2;
      
      // Check point on s1's rim for heat from s2
      const x1 = s1.x + Math.cos(angle) * rim1;
      const y1 = s1.y + Math.sin(angle) * rim1;
      
      // Convert to grid coordinates (grid is downsampled by 4)
      const gx1 = Math.floor((x1 / canvasWidth) * gridW);
      const gy1 = Math.floor((y1 / canvasHeight) * gridH);
      
      if (gx1 >= 0 && gx1 < gridW && gy1 >= 0 && gy1 < gridH) {
        const temp1 = gridData[gy1][gx1];
        maxTempElevation2 = Math.max(maxTempElevation2, temp1 - ambientTemp);
      }
      
      // Check point on s2's rim for heat from s1
      const x2 = s2.x + Math.cos(angle) * rim2;
      const y2 = s2.y + Math.sin(angle) * rim2;
      
      const gx2 = Math.floor((x2 / canvasWidth) * gridW);
      const gy2 = Math.floor((y2 / canvasHeight) * gridH);
      
      if (gx2 >= 0 && gx2 < gridW && gy2 >= 0 && gy2 < gridH) {
        const temp2 = gridData[gy2][gx2];
        maxTempElevation1 = Math.max(maxTempElevation1, temp2 - ambientTemp);
      }
    }
    
    // Check midpoint between samples for heat overlap
    const midX = (s1.x + s2.x) / 2;
    const midY = (s1.y + s2.y) / 2;
    const gxMid = Math.floor((midX / canvasWidth) * gridW);
    const gyMid = Math.floor((midY / canvasHeight) * gridH);
    
    let midTempElevation = 0;
    if (gxMid >= 0 && gxMid < gridW && gyMid >= 0 && gyMid < gridH) {
      midTempElevation = gridData[gyMid][gxMid] - ambientTemp;
    }
    
    // Interference occurs when:
    // 1. Temperature at one sample's rim is elevated above ambient (heat from other sample reached it)
    // 2. Or temperature at midpoint is significantly elevated (heat halos overlap)
    
    const maxElevation = Math.max(maxTempElevation1, maxTempElevation2, midTempElevation);
    
    if (maxElevation < threshold) return 0;
    
    // Calculate interference percentage based on temperature elevation
    // Assume initial sample temp is around 110°F and ambient is 70°F
    // Max possible elevation is 40°F
    const maxPossibleElevation = Math.max(
      Math.abs(s1.initial_temperature - ambientTemp),
      Math.abs(s2.initial_temperature - ambientTemp)
    );
    
    // Interference score: 0-100% based on how much heat has reached the other sample
    const interferenceScore = Math.min(100, (maxElevation / maxPossibleElevation) * 100);
    
    return interferenceScore;
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
    
    for (let i = 0; i < samples.length; i++) {
      for (let j = i + 1; j < samples.length; j++) {
        const score = this.calculateInterference(
          samples[i], 
          samples[j], 
          container, 
          elapsedTime,
          gridData,
          canvasWidth,
          canvasHeight
        );
        // Report even tiny interference > 0.1% to ensure early detection
        if (score > 0.1) { 
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