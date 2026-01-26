export interface Material {
  name: string;
  thermal_conductivity: number; // W/(m·K)
  specific_heat: number; // J/(kg·K)
  density: number; // kg/m³
  emissivity: number; // 0-1
  thickness: number; // meters (used for layer thickness in samples)
}

export interface SampleLayer {
  material: Material;
  radius_fraction: number;
}

export interface Sample {
  id: string;
  x: number; // Center X (pixels)
  y: number; // Center Y (pixels)
  radius: number; // Outer radius (pixels)
  name: string;
  
  // Layers (Core -> Middle -> Outer)
  core_material: Material;
  middle_material: Material;
  outer_material: Material;
  
  // Radius fractions (0.0 to 1.0)
  core_radius_fraction: number;
  middle_radius_fraction: number;
  outer_radius_fraction: number; // Always 1.0 effectively
  
  initial_temperature: number; // Fahrenheit
  temperature: number; // Fahrenheit (Current average temp)
  
  // Real-time metrics
  heat_loss_rate?: number; // Watts
  cooling_rate?: number; // °F/min
  
  // Peltier Mode
  target_temperature?: number; // If set, this sample acts as a thermostat
  power_consumption?: number; // Watts required to maintain target temp
}

export type ContainerShape = 'rectangle' | 'circle';

export interface Container {
  shape: ContainerShape;
  width: number; // Width or Diameter (pixels)
  height: number; // Height (pixels) - ignored if circle
  fill_material: Material; // Insulation between samples (Phenolic Foam / Water)
  wall_material: Material; // Container wall material
  ambient_temperature: number; // Fahrenheit (Outside temp)
}

export interface SimulationConfig {
  container: Container;
  samples: Sample[];
  pixel_size_mm: number; // How many mm is 1 pixel?
}

export type ToolType = 'select' | 'pan' | 'add_sample' | 'ruler';

export interface AppState {
  container: Container;
  samples: Sample[];
  selectedId: string | null;
  tool: ToolType;
  isRunning: boolean;
  showHeatmap: boolean;
  showDimensions: boolean;
  simulationTime: number; // Seconds
}