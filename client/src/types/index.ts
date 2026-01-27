export interface Material {
  name: string;
  thermal_conductivity: number; // W/(m·K)
  specific_heat: number; // J/(kg·K)
  density: number; // kg/m³
  color: string;
}

export interface Sample {
  id: string;
  x: number;
  y: number;
  radius: number;
  name: string;
  
  // Layers
  outer_material: Material;
  middle_material: Material;
  core_material: Material;
  
  // Geometry (fractions of total radius)
  outer_radius_fraction: number; // Always 1.0
  middle_radius_fraction: number;
  core_radius_fraction: number;

  // Thermal State
  initial_temperature: number; // Fahrenheit
  temperature: number; // Current Temp (F)
  
  // Peltier Control
  peltier_active: boolean;
  target_temperature?: number; // Fahrenheit
}

export interface Container {
  shape: 'circle' | 'rectangle';
  width: number; // Diameter if circle
  height: number; // Ignored if circle
  
  fill_type: 'Phenolic Foam' | 'Water';
  fill_material: Material;
  
  wall_material: Material;
  ambient_temperature: number; // Fahrenheit
}

export type ToolType = 'select' | 'add_sample';