import { Container, Sample } from '../types';

export class PhysicsEngine {
  private dt: number = 0.1; // Time step in seconds
  private pixelToMeter: number = 0.001; // 1 pixel = 1mm

  constructor() {}

  fahrenheitToCelsius(f: number): number {
    return (f - 32) * 5 / 9;
  }

  celsiusToFahrenheit(c: number): number {
    return c * 9 / 5 + 32;
  }

  getEffectiveProperties(sample: Sample) {
    const rOuter = sample.radius * sample.outer_radius_fraction;
    const rMiddle = sample.radius * sample.middle_radius_fraction;
    const rCore = sample.radius * sample.core_radius_fraction;

    // Area-weighted average for composite cylinder
    const totalArea = Math.PI * Math.pow(rOuter, 2);
    const coreArea = Math.PI * Math.pow(rCore, 2);
    const middleArea = Math.PI * Math.pow(rMiddle, 2) - coreArea;
    const outerArea = totalArea - Math.PI * Math.pow(rMiddle, 2);

    // Weighted thermal conductivity
    const kEff = (
      sample.core_material.thermal_conductivity * coreArea +
      sample.middle_material.thermal_conductivity * middleArea +
      sample.outer_material.thermal_conductivity * outerArea
    ) / totalArea;

    // Weighted specific heat
    const cEff = (
      sample.core_material.specific_heat * coreArea +
      sample.middle_material.specific_heat * middleArea +
      sample.outer_material.specific_heat * outerArea
    ) / totalArea;

    // Weighted density
    const rhoEff = (
      sample.core_material.density * coreArea +
      sample.middle_material.density * middleArea +
      sample.outer_material.density * outerArea
    ) / totalArea;

    return { kEff, cEff, rhoEff, totalArea };
  }

  calculateStep(container: Container | null, samples: Sample[]): Sample[] {
    if (!container || samples.length === 0) return samples;

    const nextSamples = samples.map(s => ({ ...s }));
    const ambientTempC = this.fahrenheitToCelsius(container.ambient_temperature);

    // Calculate heat transfer for each sample
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const currentTempC = this.fahrenheitToCelsius(sample.temperature);
      let heatFlux = 0.0;

      const { kEff, cEff, rhoEff, totalArea } = this.getEffectiveProperties(sample);
      
      // 1. Heat transfer to other samples (Conduction approximation)
      for (let j = 0; j < samples.length; j++) {
        if (i === j) continue;
        
        const other = samples[j];
        const dx = other.x - sample.x;
        const dy = other.y - sample.y;
        const distance = Math.sqrt(dx * dx + dy * dy) * this.pixelToMeter;
        
        // Skip if too far (interaction range is sum of diameters)
        if (distance > (sample.radius + other.radius) * 2 * this.pixelToMeter) continue;
        
        const otherTempC = this.fahrenheitToCelsius(other.temperature);
        
        // Simplified conduction: Q = k * A * dT / dx
        // We approximate contact area based on proximity
        const contactFactor = Math.max(0, 1 - distance / ((sample.radius + other.radius) * 2 * this.pixelToMeter));
        const area = (sample.radius * this.pixelToMeter) * (sample.outer_material.thickness); // Cross-sectional area approximation
        
        const conduction = kEff * area * (otherTempC - currentTempC) / Math.max(distance, 0.001) * contactFactor;
        heatFlux += conduction;
      }

      // 2. Convection to ambient (from top/bottom surfaces)
      // Q = h * A * (T_inf - T)
      const h = 10; // Convection coefficient W/(m²·K)
      const surfaceArea = 2 * (Math.PI * Math.pow(sample.radius * this.pixelToMeter, 2)); // Top and bottom
      const convection = h * surfaceArea * (ambientTempC - currentTempC);
      heatFlux += convection;

      // 3. Conduction to container floor (if inside)
      // Assuming container floor is at ambient temp for simplicity in this 2D model
      // Q = k * A * dT / dx
      const floorConduction = kEff * surfaceArea * (ambientTempC - currentTempC) / 0.01; // 1cm gap
      heatFlux += floorConduction * 0.1; // Reduced factor

      // Update temperature
      // dT/dt = Q / (m * c)
      // m = rho * V = rho * Area * thickness
      const volume = totalArea * this.pixelToMeter * this.pixelToMeter * sample.outer_material.thickness;
      const mass = rhoEff * volume;
      
      const dT = (heatFlux / (mass * cEff)) * this.dt;
      
      nextSamples[i].temperature = this.celsiusToFahrenheit(currentTempC + dT);
      nextSamples[i].heat_loss_rate = heatFlux;
    }

    return nextSamples;
  }
}
