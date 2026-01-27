import { Sample, Container } from '../types';
import { PIXELS_PER_INCH } from '../const';

export class InterferenceCalculator {
  // Calculate thermal interference between samples
  // Returns a score 0-100 where 0 is no interference and 100 is max interference
  static calculateInterference(s1: Sample, s2: Sample, container: Container): number {
    const dist = Math.sqrt((s2.x - s1.x)**2 + (s2.y - s1.y)**2);
    const edgeDist = dist - s1.radius - s2.radius;
    
    // Physics-based heuristic:
    // Interference drops off with distance squared
    // Increases with thermal conductivity of fill material
    
    const k = container.fill_material.thermal_conductivity;
    
    // Critical distance where interference becomes negligible (< 1%)
    // For Phenolic Foam (k=0.03), this is small (~20px)
    // For Water (k=0.6), this is large (~100px)
    
    // UPDATE: Increased sensitivity base from 50 to 150 to match visual "heat halo"
    // Even with foam, heat spreads significantly over 20 mins
    const criticalDist = 150 * (Math.max(0.1, k) / 0.03); 
    
    if (edgeDist > criticalDist) return 0;
    
    // Linear falloff for now, could be exponential
    return Math.min(100, (1 - edgeDist / criticalDist) * 100);
  }

  static getInterferenceReport(samples: Sample[], container: Container): string[] {
    const report: string[] = [];
    
    for (let i = 0; i < samples.length; i++) {
      for (let j = i + 1; j < samples.length; j++) {
        const score = this.calculateInterference(samples[i], samples[j], container);
        // Lowered threshold from 5% to 1% to catch early interference
        if (score > 1) {
          report.push(`${samples[i].name} ↔ ${samples[j].name}: ${score.toFixed(1)}% Interference`);
        }
      }
    }
    
    if (report.length === 0) report.push("No significant thermal interference detected.");
    
    return report;
  }
}