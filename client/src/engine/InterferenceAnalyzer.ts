import { Sample, Container } from '../types';
import { PIXELS_PER_INCH } from '../const';

export class InterferenceCalculator {
  // Calculate thermal interference between samples based on current simulation state
  // Returns a score 0-100 where 0 is no interference and 100 is max interference
  static calculateInterference(s1: Sample, s2: Sample, container: Container, elapsedTime: number): number {
    const dist = Math.sqrt((s2.x - s1.x)**2 + (s2.y - s1.y)**2);
    const edgeDist = dist - s1.radius - s2.radius;
    
    // If physically touching or overlapping
    if (edgeDist <= 0) return 100;

    // Thermal Diffusivity (alpha) = k / (rho * cp)
    // This determines how fast heat spreads
    // k: W/mK, rho: kg/m3, cp: J/kgK
    const k = container.fill_material.thermal_conductivity;
    const rho = container.fill_material.density;
    const cp = container.fill_material.specific_heat;
    
    const alpha = k / (rho * cp); // m²/s
    
    // Thermal Diffusion Length ~ 2 * sqrt(alpha * t)
    // Convert to pixels (1 meter approx 39.37 inches * PIXELS_PER_INCH)
    const metersToPixels = 39.37 * PIXELS_PER_INCH;
    
    // INCREASED SENSITIVITY:
    // We multiply the diffusion length by 3.0 (instead of 2.0) to account for the visual "halo"
    // which extends further than the strict 1/e decay point.
    // This ensures we catch interference as soon as the visual colors touch.
    const diffusionLengthMeters = 3.0 * Math.sqrt(alpha * Math.max(1, elapsedTime));
    const diffusionLengthPixels = diffusionLengthMeters * metersToPixels;

    // The "Heat Halo" radius is effectively the diffusion length
    // If the halos of two samples overlap, we have interference
    // Halo 1 + Halo 2 >= Edge Distance -> Interference
    
    const totalHaloReach = diffusionLengthPixels * 2; // Two samples reaching out
    
    if (edgeDist > totalHaloReach) return 0;
    
    // Calculate percentage overlap
    // 0% at edgeDist == totalHaloReach
    // 100% at edgeDist == 0
    return Math.min(100, (1 - edgeDist / totalHaloReach) * 100);
  }

  static getInterferenceReport(samples: Sample[], container: Container, elapsedTime: number = 0): string[] {
    const report: string[] = [];
    let maxInterference = 0;
    
    for (let i = 0; i < samples.length; i++) {
      for (let j = i + 1; j < samples.length; j++) {
        const score = this.calculateInterference(samples[i], samples[j], container, elapsedTime);
        // Report even tiny interference > 0.1% to ensure early detection
        if (score > 0.1) { 
          report.push(`${samples[i].name} ↔ ${samples[j].name}: ${score.toFixed(1)}%`);
          maxInterference = Math.max(maxInterference, score);
        }
      }
    }
    
    if (report.length === 0) {
      if (elapsedTime === 0) {
        report.push("Simulation not started. No thermal interference.");
      } else {
        report.push("No significant thermal interference detected yet.");
      }
    }
    
    return report;
  }
}