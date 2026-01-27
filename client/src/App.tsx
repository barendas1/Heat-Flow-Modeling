import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { Container, Sample, ToolType, Material } from './types';
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
  Add: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  Save: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>,
  Ruler: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6v12h20V6H2zm2 10V8h2v3h2V8h2v3h2V8h2v3h2V8h2v3h2V8h2v8H4z"/></svg>,
  Export: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
};

const App: React.FC = () => {
  // State
  const [container, setContainer] = useState<Container>({
    shape: 'circle',
    width: 600,
    height: 400,
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
        const result = physicsRef.current.step();
        
        // Throttle Grid Updates to 30 FPS (every 2nd frame)
        if (frameCount % 2 === 0) {
          setGridData(result.grid);
        }
        
        // Update Graph Data every 30 frames (approx 0.5s)
        timeRef.current += 0.05; // 0.05s per tick
        frameCount++;

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
            return newData.slice(-50); // Keep last 50 points
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
  }, [isRunning, container]);

  // Handlers
  const handleAddSample = (x: number, y: number) => {
    const materials = MaterialLibrary.getMaterials();
    const newSample: Sample = {
      id: Math.random().toString(36).substr(2, 9),
      x, y,
      radius: 30,
      name: `Sample ${samples.length + 1}`,
      outer_material: materials['Aluminum'],
      middle_material: materials['Plastic (PVC)'],
      core_material: materials['Water'],
      outer_radius_fraction: 1.0,
      middle_radius_fraction: 0.8,
      core_radius_fraction: 0.6,
      initial_temperature: 110,
      temperature: 110,
      peltier_active: false,
      target_temperature: 110
    };
    setSamples([...samples, newSample]);
    setTool('select');
    physicsRef.current.initialize(container, [...samples, newSample], window.innerWidth - 600, window.innerHeight);
  };

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
    const cx = (window.innerWidth - 600) / 2;
    const cy = window.innerHeight / 2;
    const r = Math.min(container.width, container.height) / 3;
    
    const materials = MaterialLibrary.getMaterials();
    const newSamples: Sample[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      newSamples.push({
        id: Math.random().toString(36).substr(2, 9),
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        radius: 30,
        name: `Sample ${i + 1}`,
        outer_material: materials['Aluminum'],
        middle_material: materials['Plastic (PVC)'],
        core_material: materials['Water'],
        outer_radius_fraction: 1.0,
        middle_radius_fraction: 0.8,
        core_radius_fraction: 0.6,
        initial_temperature: 110,
        temperature: 110,
        peltier_active: false,
        target_temperature: 110
      });
    }
    setSamples(newSamples);
    physicsRef.current.initialize(container, newSamples, window.innerWidth - 600, window.innerHeight);
  };

  const selectedObject = selectedId === 'container' ? container : samples.find(s => s.id === selectedId);
  const interferenceReport = InterferenceCalculator.getInterferenceReport(samples, container);

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
                <option value="circle">Circular Drum</option>
                <option value="rectangle">Rectangular Box</option>
              </select>
            </div>

            <div className="form-row">
              <label>{container.shape === 'circle' ? 'Diameter (in)' : 'Width (in)'}</label>
              <input 
                className="neumorphic-input"
                type="number" 
                value={(container.width / PIXELS_PER_INCH).toFixed(1)}
                onChange={(e) => setContainer({ ...container, width: parseFloat(e.target.value) * PIXELS_PER_INCH })}
              />
            </div>

            {container.shape === 'rectangle' && (
              <div className="form-row">
                <label>Height (in)</label>
                <input 
                  className="neumorphic-input"
                  type="number" 
                  value={(container.height / PIXELS_PER_INCH).toFixed(1)}
                  onChange={(e) => setContainer({ ...container, height: parseFloat(e.target.value) * PIXELS_PER_INCH })}
                />
              </div>
            )}

            <div className="form-row">
              <label>Fill Material</label>
              <select 
                className="neumorphic-input"
                value={container.fill_type}
                onChange={(e) => {
                  const type = e.target.value as any;
                  setContainer({ 
                    ...container, 
                    fill_type: type,
                    fill_material: MaterialLibrary.getMaterials()[type]
                  });
                }}
              >
                <option value="Phenolic Foam">Phenolic Foam</option>
                <option value="Water">Water</option>
              </select>
            </div>

            <div className="sub-group">
              <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Fill Properties</h4>
              <div className="form-row">
                <label>Conductivity</label>
                <input 
                  className="neumorphic-input"
                  type="number" step="0.01"
                  value={container.fill_material.thermal_conductivity}
                  onChange={(e) => setContainer({
                    ...container,
                    fill_material: { ...container.fill_material, thermal_conductivity: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div className="form-row">
                <label>Specific Heat</label>
                <input 
                  className="neumorphic-input"
                  type="number"
                  value={container.fill_material.specific_heat}
                  onChange={(e) => setContainer({
                    ...container,
                    fill_material: { ...container.fill_material, specific_heat: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div className="form-row">
                <label>Density</label>
                <input 
                  className="neumorphic-input"
                  type="number"
                  value={container.fill_material.density}
                  onChange={(e) => setContainer({
                    ...container,
                    fill_material: { ...container.fill_material, density: parseFloat(e.target.value) }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {selectedId && selectedId !== 'container' && (
          <div className="property-group">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Sample: {(selectedObject as Sample).name}</h3>
            
            <div className="form-row checkbox-row">
              <label>Peltier Mode</label>
              <input 
                type="checkbox"
                checked={(selectedObject as Sample).peltier_active}
                onChange={(e) => {
                  const updated = { ...(selectedObject as Sample), peltier_active: e.target.checked };
                  setSamples(samples.map(s => s.id === updated.id ? updated : s));
                }}
              />
            </div>

            {(selectedObject as Sample).peltier_active && (
              <div className="form-row">
                <label>Target Temp (°F)</label>
                <input 
                  className="neumorphic-input"
                  type="number"
                  value={(selectedObject as Sample).target_temperature}
                  onChange={(e) => {
                    const updated = { ...(selectedObject as Sample), target_temperature: parseFloat(e.target.value) };
                    setSamples(samples.map(s => s.id === updated.id ? updated : s));
                  }}
                />
              </div>
            )}

            <div className="sub-group">
              <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Layer Conductivity</h4>
              
              <div className="form-row">
                <label>Outer (Al)</label>
                <input 
                  className="neumorphic-input"
                  type="number" step="1"
                  value={(selectedObject as Sample).outer_material.thermal_conductivity}
                  onChange={(e) => {
                    const s = selectedObject as Sample;
                    const updated = { ...s, outer_material: { ...s.outer_material, thermal_conductivity: parseFloat(e.target.value) } };
                    setSamples(samples.map(sam => sam.id === updated.id ? updated : sam));
                  }}
                />
              </div>

              <div className="form-row">
                <label>Middle (PVC)</label>
                <input 
                  className="neumorphic-input"
                  type="number" step="0.01"
                  value={(selectedObject as Sample).middle_material.thermal_conductivity}
                  onChange={(e) => {
                    const s = selectedObject as Sample;
                    const updated = { ...s, middle_material: { ...s.middle_material, thermal_conductivity: parseFloat(e.target.value) } };
                    setSamples(samples.map(sam => sam.id === updated.id ? updated : sam));
                  }}
                />
              </div>

              <div className="form-row">
                <label>Core (Water)</label>
                <input 
                  className="neumorphic-input"
                  type="number" step="0.1"
                  value={(selectedObject as Sample).core_material.thermal_conductivity}
                  onChange={(e) => {
                    const s = selectedObject as Sample;
                    const updated = { ...s, core_material: { ...s.core_material, thermal_conductivity: parseFloat(e.target.value) } };
                    setSamples(samples.map(sam => sam.id === updated.id ? updated : sam));
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Center: Canvas Area */}
      <div className="canvas-area">
        <div className="toolbar neumorphic-panel compact-toolbar">
          <div className="toolbar-group">
             <button className="neumorphic-btn small-btn" onClick={handleSave} title="Save Setup"><Icons.Save /></button>
             <label className="neumorphic-btn small-btn" title="Load Setup">
               <input type="file" accept=".json" onChange={handleLoad} style={{ display: 'none' }} />
               Load
             </label>
             <button className="neumorphic-btn small-btn" onClick={handleExportCSV} title="Export CSV"><Icons.Export /></button>
          </div>
          
          <div className="toolbar-divider" />

          <button 
            className={`neumorphic-btn small-btn ${tool === 'select' ? 'active' : ''}`}
            onClick={() => setTool('select')}
            title="Select / Move"
          >
            Select
          </button>
          <button 
            className={`neumorphic-btn small-btn ${showMeasurements ? 'active' : ''}`}
            onClick={() => setShowMeasurements(!showMeasurements)}
            title="Toggle Measurements"
          >
            <Icons.Ruler />
          </button>
          {/* Removed Add Button as requested */}

          <div className="toolbar-divider" />

          <div className="flex items-center gap-2">
            <select 
              className="neumorphic-input small-input" 
              style={{ width: '120px' }} // Widened dropdown
              value={autoLayoutCount}
              onChange={(e) => setAutoLayoutCount(parseInt(e.target.value))}
            >
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Samples</option>)}
            </select>
            <button 
              className="neumorphic-btn small-btn"
              onClick={() => handleAutoLayout(autoLayoutCount)}
              title="Auto-Arrange"
            >
              Layout
            </button>
          </div>

          <div className="toolbar-divider" />

          <button 
            className={`neumorphic-btn small-btn ${isRunning ? 'active' : ''}`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <Icons.Pause /> : <Icons.Play />}
          </button>
          <button 
            className="neumorphic-btn small-btn"
            onClick={() => {
              setIsRunning(false);
              setSamples(samples.map(s => ({ ...s, temperature: s.initial_temperature })));
              setGraphData([]);
              timeRef.current = 0;
            }}
          >
            <Icons.Reset />
          </button>
        </div>

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
          onSelect={setSelectedId}
          onAddSample={handleAddSample}
        />

        <div className="stats-bar">
          <span>Samples: {samples.length}</span>
          <span>Avg Temp: {samples.length > 0 ? Math.round(samples.reduce((acc, s) => acc + s.temperature, 0) / samples.length) : 0}°F</span>
          <span>Status: {isRunning ? 'Running' : 'Paused'}</span>
        </div>
      </div>

      {/* Right Sidebar: Analysis */}
      <div className="sidebar sidebar-right neumorphic-panel">
        <div className="analysis-panel">
          <h3 className="section-title">Analysis</h3>
          
          <div className="property-group">
            <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Interference Report</h4>
            <div className="text-xs text-gray-600 max-h-40 overflow-y-auto">
              {interferenceReport.map((line: string, i: number) => (
                <div key={i} className="mb-1 pb-1 border-b border-gray-100 last:border-0">{line}</div>
              ))}
            </div>
          </div>

          <div className="h-60 mt-4">
            <TemperatureGraph data={graphData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;