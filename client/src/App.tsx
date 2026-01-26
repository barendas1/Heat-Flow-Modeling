import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { Container, Sample, ToolType, Material } from './types';
import { GridPhysicsEngine } from './engine/PhysicsEngine';
import { MaterialLibrary } from './engine/MaterialLibrary';
import { InterferenceAnalyzer } from './engine/InterferenceAnalyzer';
import { TemperatureGraph } from './components/TemperatureGraph';
import './styles/main.scss';

// Icons (using simple SVG for now to avoid dependencies)
const Icons = {
  Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  Pause: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  Reset: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>,
  Add: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  Save: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
};

const App: React.FC = () => {
  // State
  const [container, setContainer] = useState<Container>({
    shape: 'circle',
    width: 600,
    height: 400,
    fill_material: MaterialLibrary.getMaterials()['Phenolic Foam'],
    wall_material: MaterialLibrary.getMaterials()['Plastic (PVC)'],
    ambient_temperature: 70
  });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [isRunning, setIsRunning] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showHeatRings, setShowHeatRings] = useState(true);
  
  const physicsRef = useRef(new GridPhysicsEngine());
  const [gridData, setGridData] = useState<number[][] | null>(null);
  const [graphData, setGraphData] = useState<any[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);

  // Initialize Grid on Start
  useEffect(() => {
    physicsRef.current.initialize(container, samples, window.innerWidth - 350, window.innerHeight);
  }, [container, samples.length]); // Re-init on structural changes

  // Simulation Loop
  useEffect(() => {
    if (isRunning) {
      const loop = () => {
        const result = physicsRef.current.step();
        setGridData(result.grid);
        
        // Update Graph Data every 10 frames (approx 0.5s)
        timeRef.current += 0.05;
        if (Math.round(timeRef.current * 100) % 50 === 0) {
          const point: any = { time: Math.round(timeRef.current) };
          // Calculate average temp for each sample from grid (simplified)
          // In a real app, we'd do this in the engine
          samples.forEach(s => {
             // Just using current temp state for now, ideally fetch from engine
             point[s.name] = s.temperature; 
          });
          setGraphData(prev => [...prev.slice(-50), point]); // Keep last 50 points
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
      temperature: 110
    };
    setSamples([...samples, newSample]);
    setTool('select');
    // Re-init grid when geometry changes
    physicsRef.current.initialize(container, [...samples, newSample], window.innerWidth - 350, window.innerHeight);
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

  const selectedObject = selectedId === 'container' ? container : samples.find(s => s.id === selectedId);

  return (
    <div className="app-container">
      {/* Canvas Area */}
      <div className="canvas-area">
        <div className="toolbar neumorphic-panel">
          <button 
            className={`neumorphic-btn ${tool === 'select' ? 'active' : ''}`}
            onClick={() => setTool('select')}
            title="Select / Move"
          >
            Select
          </button>
          <button 
            className={`neumorphic-btn ${tool === 'ruler' ? 'active' : ''}`}
            onClick={() => setTool('ruler')}
            title="Measure Distances"
          >
            Ruler
          </button>
          <button 
            className={`neumorphic-btn ${tool === 'add_sample' ? 'active' : ''}`}
            onClick={() => setTool('add_sample')}
            title="Add Sample"
          >
            <Icons.Add /> Sample
          </button>
          <button 
            className="neumorphic-btn"
            onClick={() => {
               // Auto-Arrange Logic: Hexagonal Packing
               const cx = window.innerWidth / 2 - 175; // Adjust for sidebar
               const cy = window.innerHeight / 2;
               const r = 60; // Spacing
               const newSamples = samples.map((s, i) => {
                 const angle = (i / samples.length) * Math.PI * 2;
                 return {
                   ...s,
                   x: cx + Math.cos(angle) * r,
                   y: cy + Math.sin(angle) * r
                 };
               });
               setSamples(newSamples);
               physicsRef.current.initialize(container, newSamples, window.innerWidth - 350, window.innerHeight);
            }}
            title="Auto-Arrange Samples"
          >
            Auto-Layout
          </button>
          <div style={{ width: 1, background: '#ccc', margin: '0 10px' }} />
          <button 
            className={`neumorphic-btn ${isRunning ? 'active' : ''}`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <Icons.Pause /> : <Icons.Play />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button 
            className="neumorphic-btn"
            onClick={() => {
              setIsRunning(false);
              setSamples(samples.map(s => ({ ...s, temperature: s.initial_temperature })));
            }}
          >
            <Icons.Reset /> Reset
          </button>
        </div>

        <Canvas 
          container={container}
          samples={samples}
          tool={tool}
          selectedId={selectedId}
          showHeatmap={showHeatmap}
          showDimensions={tool === 'ruler'}
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <label><input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} /> Heatmap</label>
            <label><input type="checkbox" checked={showHeatRings} onChange={e => setShowHeatRings(e.target.checked)} /> Heat Rings</label>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <h2 className="section-title">Heat Flow Sim</h2>
        
        <div className="property-group">
          <h3 className="section-title">File Operations</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="neumorphic-btn" onClick={handleSave}><Icons.Save /> Save</button>
            <label className="neumorphic-btn" style={{ cursor: 'pointer' }}>
              Load
              <input type="file" accept=".json" onChange={handleLoad} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {selectedObject ? (
          <div className="property-group">
            <h3 className="section-title">Properties</h3>
            
            {selectedId === 'container' ? (
              <>
                <div className="form-row">
                  <label>Shape</label>
                  <select 
                    className="neumorphic-input"
                    value={container.shape}
                    onChange={e => setContainer({ ...container, shape: e.target.value as any })}
                  >
                    <option value="circle">Circular Drum</option>
                    <option value="rectangle">Rectangular Box</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Size (px)</label>
                  <input 
                    className="neumorphic-input"
                    type="number"
                    value={container.width}
                    onChange={e => setContainer({ ...container, width: parseFloat(e.target.value), height: container.shape === 'circle' ? parseFloat(e.target.value) : container.height })}
                  />
                </div>
                <div className="form-row">
                  <label>Fill Material</label>
                  <select 
                    className="neumorphic-input"
                    value={container.fill_material.name}
                    onChange={e => setContainer({ ...container, fill_material: MaterialLibrary.getMaterials()[e.target.value] })}
                  >
                    {Object.keys(MaterialLibrary.getMaterials()).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Ambient Temp (°F)</label>
                  <input 
                    className="neumorphic-input"
                    type="number"
                    value={container.ambient_temperature}
                    onChange={e => setContainer({ ...container, ambient_temperature: parseFloat(e.target.value) })}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <label>Name</label>
                  <input 
                    className="neumorphic-input"
                    value={(selectedObject as Sample).name} 
                    onChange={e => setSamples(samples.map(s => s.id === selectedId ? { ...s, name: e.target.value } : s))}
                  />
                </div>
                <div className="form-row">
                  <label>Start Temp (°F)</label>
                  <input 
                    className="neumorphic-input"
                    type="number"
                    value={(selectedObject as Sample).initial_temperature}
                    onChange={e => setSamples(samples.map(s => s.id === selectedId ? { ...s, initial_temperature: parseFloat(e.target.value), temperature: parseFloat(e.target.value) } : s))}
                  />
                </div>
                <div className="form-row">
                  <label>Peltier Mode</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
                    <input 
                      type="checkbox"
                      checked={!!(selectedObject as Sample).target_temperature}
                      onChange={e => setSamples(samples.map(s => s.id === selectedId ? { ...s, target_temperature: e.target.checked ? (selectedObject as Sample).initial_temperature : undefined } : s))}
                    />
                    Maintain Temp
                  </label>
                </div>
              </>
            )}

            {selectedId !== 'container' && (
              <>
                <div className="form-row">
                  <label>Radius (px)</label>
                  <input 
                    className="neumorphic-input"
                    type="number"
                    value={(selectedObject as Sample).radius}
                    onChange={e => setSamples(samples.map(s => s.id === selectedId ? { ...s, radius: parseFloat(e.target.value) } : s))}
                  />
                </div>
                
                <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: '#6569A8' }}>Materials</h4>
                {['outer', 'middle', 'core'].map(layer => (
                  <div key={layer} className={`material-card mat-${(selectedObject as any)[`${layer}_material`].name}`}>
                    <div className="material-name">{layer.charAt(0).toUpperCase() + layer.slice(1)} Layer</div>
                    <select 
                      className="neumorphic-input"
                      style={{ marginTop: '0.5rem' }}
                      value={(selectedObject as any)[`${layer}_material`].name}
                      onChange={e => {
                        const mat = MaterialLibrary.getMaterials()[e.target.value];
                        setSamples(samples.map(s => s.id === selectedId ? { ...s, [`${layer}_material`]: mat } : s));
                      }}
                    >
                      {Object.keys(MaterialLibrary.getMaterials()).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="property-group">
            <p style={{ color: '#999', textAlign: 'center', marginTop: '2rem' }}>
              Select an object to edit properties
            </p>
          </div>
        )}

        <div className="property-group">
          <h3 className="section-title">Interference Analysis</h3>
          <div style={{ fontSize: '0.8rem', color: '#666', background: '#f5f5f5', padding: '0.5rem', borderRadius: '4px' }}>
            {InterferenceAnalyzer.getInterferenceReport(samples, container).map((line, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>{line}</div>
            ))}
          </div>
        </div>

        <div className="property-group">
          <h3 className="section-title">Data & Analysis</h3>
          <button className="neumorphic-btn" onClick={() => {
             const csv = InterferenceAnalyzer.getInterferenceReport(samples, container).join('\n');
             const blob = new Blob([csv], { type: 'text/csv' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = 'interference_report.csv';
             a.click();
          }}>Export Report (CSV)</button>
          
          <TemperatureGraph data={graphData} />
        </div>

        <div className="property-group" style={{ marginTop: 'auto' }}>
          <h3 className="section-title">Legend</h3>
          <div className="color-scale"></div>
        </div>
      </div>
    </div>
  );
};

export default App;