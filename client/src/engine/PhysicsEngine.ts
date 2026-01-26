import { Container, Sample, Material } from '../types';
import { MaterialLibrary } from './MaterialLibrary';

// Constants
const PIXEL_SIZE_MM = 2; // 1 pixel = 2mm (Balance between accuracy and performance)
const PIXEL_AREA = (PIXEL_SIZE_MM / 1000) ** 2; // m²
const TIME_STEP = 0.05; // Seconds

interface GridCell {
  temp: number; // Celsius
  nextTemp: number; // Celsius
  material: Material;
  isBoundary: boolean; // Is this a fixed boundary condition?
  sampleId?: string; // ID of the sample this cell belongs to (if any)
}

export class GridPhysicsEngine {
  private grid: GridCell[][] = [];
  private width: number = 0;
  private height: number = 0;
  private time: number = 0;
  private samples: Sample[] = []; // Keep reference to samples for Peltier logic

  constructor() {}

  // Convert F to C
  f2c(f: number): number { return (f - 32) * 5 / 9; }
  // Convert C to F
  c2f(c: number): number { return c * 9 / 5 + 32; }

  // Initialize the grid based on container and samples
  initialize(container: Container, samples: Sample[], canvasWidth: number, canvasHeight: number) {
    // Increase resolution: 1 grid cell = 1 canvas pixel (High Fidelity)
    // Previously it was canvasWidth / 2
    this.width = Math.ceil(canvasWidth); 
    this.height = Math.ceil(canvasHeight);
    this.grid = [];
    this.time = 0;
    this.samples = samples;

    const ambientC = this.f2c(container.ambient_temperature);

    for (let y = 0; y < this.height; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < this.width; x++) {
        // Map grid coordinates back to world coordinates (pixels)
        // Now 1:1 mapping
        const worldX = x;
        const worldY = y;

        // Determine material at this point
        let material = container.fill_material;
        let temp = ambientC;
        let isBoundary = false;
        let sampleId: string | undefined = undefined;

        // Check if inside container
        let insideContainer = false;
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;

        if (container.shape === 'circle') {
          const r = container.width / 2;
          const dist = Math.sqrt((worldX - cx) ** 2 + (worldY - cy) ** 2);
          if (dist <= r) insideContainer = true;
        } else {
          const w = container.width;
          const h = container.height;
          if (worldX >= cx - w/2 && worldX <= cx + w/2 && 
              worldY >= cy - h/2 && worldY <= cy + h/2) {
            insideContainer = true;
          }
        }

        if (!insideContainer) {
          // Outside container = Ambient Air
          material = MaterialLibrary.getMaterials()['Air'];
          isBoundary = true; // Fixed ambient temp
        } else {
          // Check if inside any sample
          for (const sample of samples) {
            const dx = worldX - sample.x;
            const dy = worldY - sample.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist <= sample.radius) {
              sampleId = sample.id;
              // Determine layer
              if (dist <= sample.radius * sample.core_radius_fraction) {
                material = sample.core_material;
                temp = this.f2c(sample.initial_temperature);
              } else if (dist <= sample.radius * sample.middle_radius_fraction) {
                material = sample.middle_material;
                temp = this.f2c(sample.initial_temperature); // Simplified: whole sample starts at init temp
              } else {
                material = sample.outer_material;
                temp = this.f2c(sample.initial_temperature);
              }
              break;
            }
          }
        }

        row.push({
          temp,
          nextTemp: temp,
          material,
          isBoundary,
          sampleId
        });
      }
      this.grid.push(row);
    }
  }

  // Perform one simulation step (Finite Difference Method)
  step(): { grid: number[][], samples: Sample[] } {
    this.time += TIME_STEP;
    const dx = PIXEL_SIZE_MM / 1000; // meters
    const dx2 = dx * dx;

    // Update Grid Temperatures
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const cell = this.grid[y][x];
        if (cell.isBoundary) continue;

        // Peltier Logic: If this cell belongs to a sample with active heating, hold temp
        if (cell.sampleId) {
          const sample = this.samples.find(s => s.id === cell.sampleId);
          if (sample && sample.peltier_active && sample.target_temperature !== undefined) {
             cell.nextTemp = this.f2c(sample.target_temperature);
             continue; // Skip physics update for this cell (it's clamped)
          }
        }

        const top = this.grid[y-1][x];
        const bottom = this.grid[y+1][x];
        const left = this.grid[y][x-1];
        const right = this.grid[y][x+1];

        // 2D Heat Equation: dT/dt = alpha * (d2T/dx2 + d2T/dy2)
        // alpha = k / (rho * cp)
        const k = cell.material.thermal_conductivity;
        const rho = cell.material.density;
        const cp = cell.material.specific_heat;
        const alpha = k / (rho * cp);

        // Laplacian (Finite Difference)
        const d2T = (top.temp + bottom.temp + left.temp + right.temp - 4 * cell.temp) / dx2;

        // Update temperature
        const change = alpha * d2T * TIME_STEP;
        cell.nextTemp = cell.temp + change;
      }
    }

    // Apply updates and calculate average sample temps
    const tempGrid: number[][] = [];
    const sampleTemps: Record<string, { sum: number, count: number }> = {};

    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x].temp = this.grid[y][x].nextTemp;
        const tempF = this.c2f(this.grid[y][x].temp);
        row.push(tempF);

        // Accumulate sample temps
        if (this.grid[y][x].sampleId) {
          const id = this.grid[y][x].sampleId!;
          if (!sampleTemps[id]) sampleTemps[id] = { sum: 0, count: 0 };
          sampleTemps[id].sum += tempF;
          sampleTemps[id].count++;
        }
      }
      tempGrid.push(row);
    }

    // Update sample objects with new average temperatures
    const updatedSamples = this.samples.map(s => {
      if (sampleTemps[s.id]) {
        return {
          ...s,
          current_temperature: sampleTemps[s.id].sum / sampleTemps[s.id].count
        };
      }
      return s;
    });
    this.samples = updatedSamples; // Keep local state synced

    return { grid: tempGrid, samples: updatedSamples };
  }

  getGrid() {
    return this.grid.map(row => row.map(cell => this.c2f(cell.temp)));
  }
}