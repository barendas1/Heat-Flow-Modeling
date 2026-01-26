import { Sample, Container } from '../types';

export class InterferenceAnalyzer {
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
    
    const criticalDist = 50 * (k / 0.03); // Baseline 50px for foam
    
    if (edgeDist > criticalDist) return 0;
    
    return Math.min(100, (1 - edgeDist / criticalDist) * 100);
  }

  static getInterferenceReport(samples: Sample[], container: Container): string[] {
    const report: string[] = [];
    
    for (let i = 0; i < samples.length; i++) {
      for (let j = i + 1; j < samples.length; j++) {
        const score = this.calculateInterference(samples[i], samples[j], container);
        if (score > 5) {
          report.push(`${samples[i].name} ↔ ${samples[j].name}: ${score.toFixed(1)}% Interference`);
        }
      }
    }
    
    if (report.length === 0) report.push("No significant thermal interference detected.");
    
    return report;
  }
}