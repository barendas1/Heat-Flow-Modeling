import { Material } from '../types';

export class MaterialLibrary {
  static getMaterials(): Record<string, Material> {
    return {
      'Aluminum': {
        name: 'Aluminum',
        thermal_conductivity: 205, // W/(m·K) - Highly conductive
        specific_heat: 900,
        density: 2700,
        color: '#A0A0A0' // Light Grey
      },
      'Plastic (PVC)': {
        name: 'Plastic (PVC)',
        thermal_conductivity: 0.19, // Insulator
        specific_heat: 1000,
        density: 1400,
        color: '#E0E0E0' // White/Grey
      },
      'Water': {
        name: 'Water',
        thermal_conductivity: 0.6,
        specific_heat: 4186, // High heat capacity
        density: 1000,
        color: '#4FC3F7' // Light Blue
      },
      'Phenolic Foam': {
        name: 'Phenolic Foam',
        thermal_conductivity: 0.03, // Excellent insulator
        specific_heat: 1400,
        density: 50, // Very light
        color: '#FFF59D' // Light Yellow
      },
      'Air': {
        name: 'Air',
        thermal_conductivity: 0.026,
        specific_heat: 1005,
        density: 1.2,
        color: '#E1F5FE' // Very Light Blue
      },
      'Steel': {
        name: 'Steel',
        thermal_conductivity: 50,
        specific_heat: 500,
        density: 7850,
        color: '#607D8B' // Blue Grey
      },
      'Copper': {
        name: 'Copper',
        thermal_conductivity: 385,
        specific_heat: 385,
        density: 8960,
        color: '#FF8A65' // Copper/Orange
      }
    };
  }

  static getDefaultMaterial(): Material {
    return this.getMaterials()['Aluminum'];
  }
}