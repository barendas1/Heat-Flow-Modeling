import { Material } from '../types';

export class MaterialLibrary {
  static getMaterials(): Record<string, Material> {
    return {
      'Aluminum': {
        name: 'Aluminum',
        thermal_conductivity: 205,
        specific_heat: 900,
        density: 2700,
        emissivity: 0.9,
        thickness: 0.002
      },
      'Plastic': {
        name: 'Plastic',
        thermal_conductivity: 0.2,
        specific_heat: 1250,
        density: 950,
        emissivity: 0.95,
        thickness: 0.001
      },
      'Water': {
        name: 'Water',
        thermal_conductivity: 0.6,
        specific_heat: 4186,
        density: 1000,
        emissivity: 0.96,
        thickness: 0.01
      },
      'Air': {
        name: 'Air',
        thermal_conductivity: 0.026,
        specific_heat: 1005,
        density: 1.2,
        emissivity: 1.0,
        thickness: 0.01
      },
      'Steel': {
        name: 'Steel',
        thermal_conductivity: 50,
        specific_heat: 500,
        density: 7850,
        emissivity: 0.8,
        thickness: 0.002
      },
      'Copper': {
        name: 'Copper',
        thermal_conductivity: 385,
        specific_heat: 385,
        density: 8960,
        emissivity: 0.85,
        thickness: 0.002
      },
      'Glass': {
        name: 'Glass',
        thermal_conductivity: 1.0,
        specific_heat: 840,
        density: 2500,
        emissivity: 0.92,
        thickness: 0.003
      }
    };
  }

  static getDefaultMaterial(): Material {
    return this.getMaterials()['Aluminum'];
  }
}
