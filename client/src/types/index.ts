export interface Material {
  name: string;
  thermal_conductivity: number; // W/(m·K)
  specific_heat: number; // J/(kg·K)
  density: number; // kg/m³
  emissivity: number; // 0-1
  thickness: number; // meters
}

export interface SampleLayer {
  material: Material;
  radius_fraction: number;
}

export interface Sample {
  id: string;
  x: number;
  y: number;
  radius: number;
  name: string;
  outer_material: Material;
  middle_material: Material;
  core_material: Material;
  outer_radius_fraction: number;
  middle_radius_fraction: number;
  core_radius_fraction: number;
  initial_temperature: number; // Fahrenheit
  temperature: number; // Fahrenheit
  heat_loss_rate?: number;
}

export interface Container {
  x: number;
  y: number;
  width: number;
  height: number;
  material: Material;
  ambient_temperature: number; // Fahrenheit
  water_temperature?: number; // Fahrenheit
}

export interface SimulationConfig {
  container: Container;
  samples: Sample[];
}

export interface SimulationStats {
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  timeElapsed: number;
  isRunning: boolean;
}

export type ToolType = 'select' | 'pan' | 'draw_container' | 'add_sample';

export interface AppState {
  container: Container | null;
  samples: Sample[];
  selectedId: string | null; // 'container' or sample ID
  tool: ToolType;
  isRunning: boolean;
  showHeatmap: boolean;
  showHeatRings: boolean;
}
