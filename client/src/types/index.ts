export interface Material {
  name: string;
  thermal_conductivity: number; // W/(m·K)
  specific_heat: number; // J/(kg·K)
  density: number; // kg/m³
  color: string;
}

export type SampleSize = '2x4' | '4x8';

export interface Sample {
  id: string;
  x: number;
  y: number;
  radius: number; // Calculated from size
  name: string;
  
  // Size Config
  size: SampleSize; // '2x4' or '4x8'

  // Layers
  outer_material: Material;
  middle_material: Material;
  core_material: Material;
  
  // Physical Properties (User Inputs)
  outer_thickness_in: number; // Aluminum thickness
  middle_thickness_in: number; // Plastic thickness
  water_mass_lbs: number; // Water mass

  // Geometry (Calculated for rendering/physics)
  outer_radius_fraction: number; // Always 1.0
  middle_radius_fraction: number;
  core_radius_fraction: number;

  // Thermal State
  initial_temperature: number; // Fahrenheit
  temperature: number; // Current Temp (F)
  
  // Removed Peltier Mode as requested
}

export interface Container {
  shape: 'circle' | 'rectangle';
  width: number; // Diameter if circle
  height: number; // Ignored if circle
  depth: number; // New: Depth/Height of container for volume calc
  
  fill_type: 'Phenolic Foam' | 'Water';
  fill_material: Material;
  
  wall_material: Material;
  ambient_temperature: number; // Fahrenheit
}

export type ToolType = 'select' | 'add_sample';