import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { Container, Sample, ToolType, Material, SampleSize } from './types';
import { GridPhysicsEngine } from './engine/PhysicsEngine';
import { MaterialLibrary } from './engine/MaterialLibrary';
import { InterferenceCalculator } from './engine/InterferenceAnalyzer';
import { TemperatureGraph } from './components/TemperatureGraph';
import { PIXELS_PER_INCH } from './const';
import './styles/main.scss';

// Icons
const Icons = {
  Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  Pause: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  Reset: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>,
  Save: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>,
  Ruler: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6v12h20V6H2zm2 10V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v8H4z"/></svg>,
  Export: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>,
  ZoomIn: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/></svg>,
  ZoomOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M7 9h5v1H7z"/></svg>
};

const App: React.FC = () => {
  // State
  const [container, setContainer] = useState<Container>({
    shape: 'rectangle', // Default to Rectangle
    width: 600,
    height: 400,
    depth: 12 * PIXELS_PER_INCH, // Default 12 inches
    fill_material: MaterialLibrary.getMaterials()['Phenolic Foam'],
    fill_type: 'Phenolic Foam',
    wall_material: MaterialLibrary.getMaterials()['Plastic (PVC)'],
    ambient_temperature: 70
  });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [isRunning, setIsRunning] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [autoLayoutCount, setAutoLayoutCount] = useState(4);
  const [simSpeed, setSimSpeed] = useState(1); // 1x to 2400x
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [layoutWarning, setLayoutWarning] = useState<string | null>(null);
  
  const physicsRef = useRef(new GridPhysicsEngine());
  const [gridData, setGridData] = useState<number[][] | null>(null);
  const [graphData, setGraphData] = useState<any[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  
  // Ref to access latest samples inside the loop without restarting effect
  const samplesRef = useRef(samples);
  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);

  // Initialize Grid on Start
  useEffect(() => {
    physicsRef.current.initialize(container, samples, window.innerWidth - 600, window.innerHeight);
  }, [container, samples.length]);

  // Simulation Loop
  useEffect(() => {
    if (isRunning) {
      let frameCount = 0;
      const loop = () => {
        // Adaptive Time Step for High Speed
        // Base step is 0.05s
        // At 2400x, we need 120s per frame (assuming 60fps is too slow, we do multiple steps)
        // We can increase dt per step to reduce loop count
        
        let steps = simSpeed;
        let dt = 0.05;
        
        // Optimization for high speeds: Increase dt, decrease steps
        if (simSpeed > 100) {
           dt = 0.5; // 10x larger step
           steps = simSpeed / 10;
        }
        if (simSpeed > 1000) {
           dt = 2.0; // 40x larger step
           steps = simSpeed / 40;
        }

        for (let i = 0; i < steps; i++) {
          physicsRef.current.step();
          timeRef.current += dt;
        }
        
        setElapsedTime(timeRef.current);

        const result = physicsRef.current.getGrid(); // Get latest grid state
        
        // Throttle Grid Updates to 30 FPS (every 2nd frame)
        if (frameCount % 2 === 0) {
          setGridData(result);
        }
        
        frameCount++;

        // Update Graph Data every 30 frames (approx 0.5s real time)
        if (frameCount % 30 === 0) {
          const currentSamples = samplesRef.current;
          const point: any = { time: Math.round(timeRef.current) };
          
          const updatedSamples = currentSamples.map(s => {
             const temp = physicsRef.current.getSampleTemp(s.id);
             point[s.name] = temp; 
             return { ...s, temperature: temp };
          });

          setGraphData(prev => {
            const newData = [...prev, point];
            return newData.slice(-100); // Keep last 100 points for better history
          });
          
          // Update UI values
          setSamples(updatedSamples);
        }
        
        animationRef.current = requestAnimationFrame(loop);
      };
      animationRef.current = requestAnimationFrame(loop);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, container, simSpeed]);

  // Handlers
  const handleSave = () => {
    const data = JSON.stringify({ container, samples }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'heat-flow-setup.json';
    a.click();
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setContainer(data.container);
        setSamples(data.samples);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = ['Time (s)', ...samples.map(s => s.name)].join(',');
    const rows = graphData.map(pt => {
      return [pt.time, ...samples.map(s => pt[s.name] || '')].join(',');
    }).join('\n');
    
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "heat_flow_data.csv");
    document.body.appendChild(link);
    link.click();
  };

  const handleAutoLayout = (count: number) => {
    setLayoutWarning(null); // Reset warning
    if (count <= 0) return;

    const cx = (window.innerWidth - 600) / 2;
    const cy = window.innerHeight / 2;
    const materials = MaterialLibrary.getMaterials();
    const newSamples: Sample[] = [];
    
    const sampleRadius = (4 * PIXELS_PER_INCH) / 2; // Default 4" diameter
    const sampleDiameter = sampleRadius * 2;
    
    // 1. Margin from Edge of Sample (not center)
    // User requested 4 inches from sample edge
    // PLUS 1 inch for the rim = 5 inches from center to wall
    const edgeMargin = 4 * PIXELS_PER_INCH;
    const rimWidth = 1 * PIXELS_PER_INCH;
    
    // Total margin from wall to center = edgeMargin + radius + rimWidth
    // Wait, user said "4 inches from the sample edge". 
    // The "sample edge" usually implies the main body. 
    // But if there is a rim, we should probably measure from the rim edge?
    // Let's assume "sample edge" means the outer boundary of the main cylinder (radius).
    // The rim is an "extra" feature.
    // So margin = 4" + radius.
    const centerMargin = edgeMargin + sampleRadius;

    if (container.shape === 'circle') {
      // Circular Layout
      // Ensure we fit within radius - centerMargin
      const maxR = (container.width / 2) - centerMargin;
      
      if (maxR <= 0) {
         setLayoutWarning("Container too small for 4-inch edge clearance.");
         return;
      }

      const r = maxR * 0.8; // Use 80% of available space to be safe
      
      // Check circumference spacing
      const circumference = 2 * Math.PI * r;
      const requiredArc = count * (sampleDiameter + 2 * PIXELS_PER_INCH); // Diameter + 2" gap
      
      if (requiredArc > circumference) {
         setLayoutWarning("Warning: Samples may be too close for accurate thermal isolation.");
      }

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        newSamples.push(createSample(i, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, materials));
      }
    } else {
      // Rectangular Layout
      const availW = container.width - centerMargin * 2;
      const availH = container.height - centerMargin * 2;
      
      if (availW <= 0 || availH <= 0) {
         setLayoutWarning("Container too small for 4-inch edge clearance.");
         return;
      }
      
      let bestLayout = { rows: 1, cols: count, spacing: 0 };
      
      // Try all factors
      for (let r = 1; r <= count; r++) {
        const c = Math.ceil(count / r);
        const spaceX = c > 1 ? availW / (c - 1) : 0;
        const spaceY = r > 1 ? availH / (r - 1) : 0;
        
        let minSpacing = 0;
        if (count === 1) minSpacing = Infinity;
        else if (r === 1) minSpacing = spaceX;
        else if (c === 1) minSpacing = spaceY;
        else minSpacing = Math.min(spaceX, spaceY);
        
        if (minSpacing > bestLayout.spacing) {
          bestLayout = { rows: r, cols: c, spacing: minSpacing };
        }
      }
      
      // Check if spacing is sufficient (e.g., at least 2 inches between edges)
      const minGap = bestLayout.spacing - sampleDiameter;
      if (count > 1 && minGap < 2 * PIXELS_PER_INCH) {
         setLayoutWarning("Warning: High packing density detected. Thermal interference likely.");
      }
      
      // Apply Best Layout
      const { rows, cols } = bestLayout;
      const cellW = cols > 1 ? availW / (cols - 1) : 0;
      const cellH = rows > 1 ? availH / (rows - 1) : 0;
      
      const startX = cx - availW / 2;
      const startY = cy - availH / 2;

      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        let x = startX + col * cellW;
        let y = startY + row * cellH;
        
        if (cols === 1) x = cx;
        if (rows === 1) y = cy;
        
        if (row === rows - 1 && count % cols !== 0) {
           const itemsInLastRow = count % cols;
           const rowWidth = (itemsInLastRow - 1) * cellW;
           const rowStart = cx - rowWidth / 2;
           x = rowStart + (i % cols) * cellW;
        }

        newSamples.push(createSample(i, x, y, materials));
      }
    }
    
    setSamples(newSamples);
    physicsRef.current.initialize(container, newSamples, window.innerWidth - 600, window.innerHeight);
  };

  const createSample = (i: number, x: number, y: number, materials: any): Sample => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      x, y,
      radius: (4 * PIXELS_PER_INCH) / 2,
      name: `Sample ${i + 1}`,
      size: '4x8',
      outer_material: materials['Aluminum'],
      middle_material: materials['Plastic (PVC)'],
      core_material: materials['Water'],
      outer_thickness_in: 0.1,
      middle_thickness_in: 0.1,
      water_mass_lbs: 3.5,
      outer_radius_fraction: 1.0,
      middle_radius_fraction: 0.9,
      core_radius_fraction: 0.8,
      initial_temperature: 110,
      temperature: 110
    };
  };

  const handleReset = () => {
    setIsRunning(false);
    setSamples([]); 
    setGraphData([]); 
    timeRef.current = 0;
    setElapsedTime(0);
    setGridData(null); 
    setLayoutWarning(null);
    setTimeout(() => {
        physicsRef.current.initialize(container, [], window.innerWidth - 600, window.innerHeight);
    }, 0);
  };

  const updateSampleSize = (sample: Sample, newSize: SampleSize) => {
    const diameter = newSize === '2x4' ? 2 : 4;
    const radius = (diameter * PIXELS_PER_INCH) / 2;
    const defaultMass = newSize === '2x4' ? 0.8 : 3.5; 

    const updated = { 
      ...sample, 
      size: newSize, 
      radius,
      water_mass_lbs: defaultMass
    };
    setSamples(samples.map(s => s.id === updated.id ? updated : s));
  };

  // Canvas Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const selectedObject = selectedId === 'container' ? container : samples.find(s => s.id === selectedId);
  const interferenceReport = InterferenceCalculator.getInterferenceReport(samples, container, elapsedTime);

  return (
    <div className="app-container">
      {/* Left Sidebar: Properties */}
      <div className="sidebar sidebar-left neumorphic-panel">
        <h2 className="section-title">Properties</h2>
        
        {!selectedObject && <div className="empty-state">Select an object to edit properties</div>}

        {selectedId === 'container' && (
          <div className="property-group">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Container</h3>
            
            <div className="form-row">
              <label>Shape</label>
              <select 
                className="neumorphic-input"
                value={container.shape}
                onChange={(e) => setContainer({ ...container, shape: e.target.value as any })}
              >
                <option value="rectangle">Rectangular Box</option>
                <option value="circle">Circular Drum</option>
              </select>
            </div>

            <div className="form-row">
              <label>{container.shape === 'circle' ? 'Diameter' : 'Length'} (in)</label>
              <input 
                type="number" 
                className="neumorphic-input"
                value={Math.round(container.width / PIXELS_PER_INCH)}
                onChange={(e) => setContainer({ ...container, width: Number(e.target.value) * PIXELS_PER_INCH })}
              />
            </div>

            {container.shape === 'rectangle' && (
              <div className="form-row">
                <label>Width (in)</label>
                <input 
                  type="number" 
                  className="neumorphic-input"
                  value={Math.round(container.height / PIXELS_PER_INCH)}
                  onChange={(e) => setContainer({ ...container, height: Number(e.target.value) * PIXELS_PER_INCH })}
                />
              </div>
            )}

            <div className="form-row">
              <label>Fill Material</label>
              <select 
                className="neumorphic-input"
                value={container.fill_type}
                onChange={(e) => {
                  const val = e.target.value as any;
                  const mat = MaterialLibrary.getMaterials()[val];
                  setContainer({ ...container, fill_type: val, fill_material: mat });
                }}
              >
                <option value="Phenolic Foam">Phenolic Foam</option>
                <option value="Water">Water</option>
              </select>
            </div>

            {/* Water Temperature Field */}
            {container.fill_type === 'Water' && (
              <div className="form-row animate-fade-in">
                <label>Water Temp (°F)</label>
                <input 
                  type="number" 
                  className="neumorphic-input"
                  value={container.ambient_temperature}
                  onChange={(e) => setContainer({ ...container, ambient_temperature: Number(e.target.value) })}
                />
              </div>
            )}

            <div className="property-details mt-4">
               <div className="form-row">
                 <label>Conductivity (W/m·K)</label>
                 <input 
                   type="number" step="0.01"
                   className="neumorphic-input"
                   value={container.fill_material.thermal_conductivity}
                   onChange={(e) => {
                     const newMat = { ...container.fill_material, thermal_conductivity: Number(e.target.value) };
                     setContainer({ ...container, fill_material: newMat });
                   }}
                 />
               </div>
               <div className="form-row">
                 <label>Specific Heat (J/kg·K)</label>
                 <input 
                   type="number" step="10"
                   className="neumorphic-input"
                   value={container.fill_material.specific_heat}
                   onChange={(e) => {
                     const newMat = { ...container.fill_material, specific_heat: Number(e.target.value) };
                     setContainer({ ...container, fill_material: newMat });
                   }}
                 />
               </div>
               <div className="form-row">
                 <label>Density (kg/m³)</label>
                 <input 
                   type="number" step="10"
                   className="neumorphic-input"
                   value={container.fill_material.density}
                   onChange={(e) => {
                     const newMat = { ...container.fill_material, density: Number(e.target.value) };
                     setContainer({ ...container, fill_material: newMat });
                   }}
                 />
               </div>
            </div>
          </div>
        )}

        {selectedId && selectedId !== 'container' && (
          <div className="property-group">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Sample: {(selectedObject as Sample)?.name}</h3>
            
            <div className="form-row">
              <label>Size</label>
              <div className="toggle-group">
                <button 
                  className={`toggle-btn ${(selectedObject as Sample).size === '2x4' ? 'active' : ''}`}
                  onClick={() => updateSampleSize(selectedObject as Sample, '2x4')}
                >
                  2" x 4"
                </button>
                <button 
                  className={`toggle-btn ${(selectedObject as Sample).size === '4x8' ? 'active' : ''}`}
                  onClick={() => updateSampleSize(selectedObject as Sample, '4x8')}
                >
                  4" x 8"
                </button>
              </div>
            </div>

            <div className="form-row">
              <label>Initial Temp (°F)</label>
              <input 
                type="number" 
                className="neumorphic-input"
                value={(selectedObject as Sample).initial_temperature}
                onChange={(e) => {
                  const updated = { ...selectedObject, initial_temperature: Number(e.target.value) } as Sample;
                  setSamples(samples.map(s => s.id === updated.id ? updated : s));
                }}
              />
            </div>

            <h4 className="subsection-title mt-4">Layers</h4>
            
            <div className="form-row">
              <label>Aluminum Thick (in)</label>
              <input 
                type="number" step="0.01"
                className="neumorphic-input"
                value={(selectedObject as Sample).outer_thickness_in}
                onChange={(e) => {
                  const updated = { ...selectedObject, outer_thickness_in: Number(e.target.value) } as Sample;
                  setSamples(samples.map(s => s.id === updated.id ? updated : s));
                }}
              />
            </div>

            <div className="form-row">
              <label>Plastic Thick (in)</label>
              <input 
                type="number" step="0.01"
                className="neumorphic-input"
                value={(selectedObject as Sample).middle_thickness_in}
                onChange={(e) => {
                  const updated = { ...selectedObject, middle_thickness_in: Number(e.target.value) } as Sample;
                  setSamples(samples.map(s => s.id === updated.id ? updated : s));
                }}
              />
            </div>

            <div className="form-row">
              <label>Water Mass (lbs)</label>
              <input 
                type="number" step="0.1"
                className="neumorphic-input"
                value={(selectedObject as Sample).water_mass_lbs}
                onChange={(e) => {
                  const updated = { ...selectedObject, water_mass_lbs: Number(e.target.value) } as Sample;
                  setSamples(samples.map(s => s.id === updated.id ? updated : s));
                }}
              />
            </div>
          </div>
        )}

        <div className="legend mt-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-bold mb-2">Temperature Map</h4>
          <div className="gradient-bar h-4 w-full rounded mb-1" style={{ background: 'linear-gradient(to right, #30123b, #4686fa, #1ae4b6, #a9f759, #fbb41a, #e64616, #7a0403)' }}></div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>70°F</span>
            <span>95°F</span>
            <span>120°F</span>
          </div>
        </div>
      </div>

      {/* Center: Canvas Area */}
      <div 
        className="canvas-area"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="toolbar neumorphic-panel">
          <button className="tool-btn" onClick={handleSave} title="Save Setup"><Icons.Save /></button>
          <label className="tool-btn" title="Load Setup">
            <input type="file" hidden onChange={handleLoad} accept=".json" />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
          </label>
          <button className="tool-btn" onClick={handleExportCSV} title="Export Data"><Icons.Export /></button>
          
          <div className="divider"></div>
          
          <button 
            className={`tool-btn ${tool === 'select' ? 'active' : ''}`} 
            onClick={() => setTool('select')}
          >
            Select
          </button>
          <button 
            className={`tool-btn ${showMeasurements ? 'active' : ''}`} 
            onClick={() => setShowMeasurements(!showMeasurements)}
          >
            <Icons.Ruler />
          </button>

          <div className="divider"></div>

          <div className="layout-controls">
            <select 
              className="neumorphic-input small-select"
              value={autoLayoutCount}
              onChange={(e) => setAutoLayoutCount(Number(e.target.value))}
              style={{ width: '120px' }}
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                <option key={n} value={n}>{n} Samples</option>
              ))}
            </select>
            <button className="tool-btn" onClick={() => handleAutoLayout(autoLayoutCount)}>Layout</button>
          </div>

          <div className="divider"></div>

          <button className="tool-btn primary" onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? <Icons.Pause /> : <Icons.Play />}
          </button>
          <button className="tool-btn" onClick={handleReset}><Icons.Reset /></button>

          <div className="divider"></div>
          
          <div className="speed-control flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Speed:</span>
            <input 
              type="range" min="1" max="2400" step="1" 
              value={simSpeed} 
              onChange={(e) => setSimSpeed(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-xs w-10 text-right">{simSpeed}x</span>
          </div>
        </div>

        {layoutWarning && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <span className="text-sm font-medium">{layoutWarning}</span>
            <button onClick={() => setLayoutWarning(null)} className="ml-2 text-red-400 hover:text-red-700">×</button>
          </div>
        )}

        <div className="canvas-wrapper" style={{ overflow: 'visible', position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="zoom-controls absolute bottom-4 right-4 flex gap-2 z-10">
             <button className="tool-btn bg-white" onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.1)); }}><Icons.ZoomIn /></button>
             <button className="tool-btn bg-white" onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.1)); }}><Icons.ZoomOut /></button>
          </div>
          
          <div style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center center', transition: 'transform 0.1s' }}>
            <Canvas 
              container={container}
              samples={samples}
              tool={tool}
              selectedId={selectedId}
              showHeatmap={showHeatmap}
              showMeasurements={showMeasurements}
              gridData={gridData}
              onContainerUpdate={setContainer}
              onSampleUpdate={(updated) => setSamples(samples.map(s => s.id === updated.id ? updated : s))}
              onSelect={(id) => {
                if (!isDragging) setSelectedId(id);
              }}
              onAddSample={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar: Analysis */}
      <div className="sidebar sidebar-right neumorphic-panel">
        <h2 className="section-title">Analysis</h2>
        
        <div className="chart-container" style={{ height: '250px' }}>
          <TemperatureGraph data={graphData} />
        </div>

        <div className="interference-report mt-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Interference Report</h3>
          <div className="report-list">
            {interferenceReport.map((line: string, i: number) => (
              <div key={i} className={`report-item ${line.includes('No significant') || line.includes('not started') ? 'text-green-600' : 'text-red-600'}`}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;