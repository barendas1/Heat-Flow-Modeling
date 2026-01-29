import { Container, Sample, Material } from '../types';
import { MaterialLibrary } from './MaterialLibrary';
import { PIXELS_PER_INCH } from '../const';

// Constants
const PIXEL_SIZE_MM = 4; // 1 grid cell = 4x4 screen pixels
const PIXEL_AREA = (PIXEL_SIZE_MM / 1000) ** 2; // m²
const TIME_STEP = 0.05; // Seconds

interface GridCell {
  temp: number; // Celsius
  nextTemp: number; // Celsius
  material: Material;
  isBoundary: boolean; // Is this a fixed boundary condition?
}

export class GridPhysicsEngine {
  private grid: GridCell[][] = [];
  private width: number = 0;
  private height: number = 0;
  private time: number = 0;
  // Cache sample ID to grid cells mapping for fast temperature lookup
  private sampleCells: Map<string, {x: number, y: number}[]> = new Map();

  constructor() {}

  // Convert F to C
  f2c(f: number): number { return (f - 32) * 5 / 9; }
  // Convert C to F
  c2f(c: number): number { return c * 9 / 5 + 32; }

  // Initialize the grid based on container and samples
  initialize(container: Container, samples: Sample[], canvasWidth: number, canvasHeight: number) {
    // Downsample by 4 for performance (4x4 pixels = 1 grid cell)
    this.width = Math.ceil(canvasWidth / 4); 
    this.height = Math.ceil(canvasHeight / 4);
    this.grid = [];
    this.time = 0;
    this.sampleCells.clear();

    const ambientC = this.f2c(container.ambient_temperature);
    // Use water temperature for fill material if water is selected, otherwise use ambient
    const fillTempC = container.fill_type === 'Water' && container.water_temperature !== undefined
      ? this.f2c(container.water_temperature)
      : ambientC;

    // Pre-calculate Sample Geometry & Physics
    const processedSamples = samples.map(s => {
      // 1. Calculate Radii in Pixels
      const outerRadius = s.radius;
      const middleRadius = outerRadius - (s.outer_thickness_in * PIXELS_PER_INCH);
      const coreRadius = middleRadius - (s.middle_thickness_in * PIXELS_PER_INCH);

      // 2. Calculate Core Density based on Water Mass
      // Volume = PI * r^2 * h
      // We need r and h in meters for density (kg/m^3)
      // But user inputs are in inches and lbs
      
      const heightIn = s.size === '2x4' ? 4 : 8;
      const coreRadiusIn = coreRadius / PIXELS_PER_INCH;
      
      const volumeIn3 = Math.PI * (coreRadiusIn ** 2) * heightIn;
      const volumeFt3 = volumeIn3 / 1728; // 1728 in^3 = 1 ft^3
      const volumeM3 = volumeFt3 * 0.0283168; // 1 ft^3 = 0.0283168 m^3

      const massKg = s.water_mass_lbs * 0.453592; // 1 lb = 0.453592 kg
      
      // Effective Density of the Core Material
      const effectiveDensity = massKg / volumeM3;

      // Create a custom material for the core with this density
      const coreMat: Material = {
        ...s.core_material,
        density: effectiveDensity
      };

      return {
        ...s,
        calculated: {
          outerRadius,
          middleRadius,
          coreRadius,
          coreMat
        }
      };
    });

    for (let y = 0; y < this.height; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < this.width; x++) {
        // Map grid coordinates back to world coordinates (pixels)
        const worldX = x * 4;
        const worldY = y * 4;

        // Determine material at this point
        let material = container.fill_material;
        let temp = ambientC;
        let isBoundary = false;

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
          // Inside container: use fill material temperature
          temp = fillTempC;
          // If water is selected, make it a boundary condition (controlled temperature)
          if (container.fill_type === 'Water') {
            isBoundary = true;
          }
          // Check if inside any sample
          for (const sample of processedSamples) {
            const dx = worldX - sample.x;
            const dy = worldY - sample.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist <= sample.calculated.outerRadius) {
              // Determine layer based on calculated radii
              if (dist <= sample.calculated.coreRadius) {
                material = sample.calculated.coreMat;
                temp = this.f2c(sample.initial_temperature);
              } else if (dist <= sample.calculated.middleRadius) {
                material = sample.middle_material;
                temp = this.f2c(sample.initial_temperature); 
              } else {
                material = sample.outer_material;
                temp = this.f2c(sample.initial_temperature);
              }
              
              // Samples are not boundary conditions - they exchange heat with surroundings
              isBoundary = false;
              
              // Cache cell location for this sample
              if (!this.sampleCells.has(sample.id)) {
                this.sampleCells.set(sample.id, []);
              }
              this.sampleCells.get(sample.id)?.push({x, y});
              
              break;
            }
          }
        }

        row.push({
          temp,
          nextTemp: temp,
          material,
          isBoundary
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

    // Apply updates
    const tempGrid: number[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x].temp = this.grid[y][x].nextTemp;
        row.push(this.c2f(this.grid[y][x].temp));
      }
      tempGrid.push(row);
    }

    return { grid: tempGrid, samples: [] };
  }

  // Get average temperature for a specific sample
  getSampleTemp(sampleId: string): number {
    const cells = this.sampleCells.get(sampleId);
    if (!cells || cells.length === 0) return 0;

    let sum = 0;
    for (const pos of cells) {
      sum += this.grid[pos.y][pos.x].temp;
    }
    return this.c2f(sum / cells.length);
  }

  getGrid() {
    return this.grid.map(row => row.map(cell => this.c2f(cell.temp)));
  }
}