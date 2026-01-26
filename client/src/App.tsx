import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { Container, Sample, ToolType, Material } from './types';
import { PhysicsEngine } from './engine/PhysicsEngine';
import { MaterialLibrary } from './engine/MaterialLibrary';
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
  const [container, setContainer] = useState<Container | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [isRunning, setIsRunning] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showHeatRings, setShowHeatRings] = useState(true);
  
  const physicsRef = useRef(new PhysicsEngine());
  const animationRef = useRef<number | undefined>(undefined);

  // Simulation Loop
  useEffect(() => {
    if (isRunning) {
      const loop = () => {
        setSamples(prevSamples => physicsRef.current.calculateStep(container, prevSamples));
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
      middle_material: materials['Plastic'],
      core_material: materials['Water'],
      outer_radius_fraction: 1.0,
      middle_radius_fraction: 0.8,
      core_radius_fraction: 0.6,
      initial_temperature: 110,
      temperature: 110
    };
    setSamples([...samples, newSample]);
    setTool('select');
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
            className={`neumorphic-btn ${tool === 'draw_container' ? 'active' : ''}`}
            onClick={() => setTool('draw_container')}
            title="Draw Container"
          >
            Draw Container
          </button>
          <button 
            className={`neumorphic-btn ${tool === 'add_sample' ? 'active' : ''}`}
            onClick={() => setTool('add_sample')}
            title="Add Sample"
          >
            <Icons.Add /> Sample
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
          showHeatRings={showHeatRings}
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
            
            {selectedId !== 'container' && (
              <div className="form-row">
                <label>Name</label>
                <input 
                  className="neumorphic-input"
                  value={(selectedObject as Sample).name} 
                  onChange={e => setSamples(samples.map(s => s.id === selectedId ? { ...s, name: e.target.value } : s))}
                />
              </div>
            )}

            <div className="form-row">
              <label>Temperature (°F)</label>
              <input 
                className="neumorphic-input"
                type="number"
                value={Math.round((selectedObject as any).temperature || (selectedObject as any).ambient_temperature)}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (selectedId === 'container') {
                    setContainer({ ...container!, ambient_temperature: val });
                  } else {
                    setSamples(samples.map(s => s.id === selectedId ? { ...s, temperature: val, initial_temperature: val } : s));
                  }
                }}
              />
            </div>

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

        <div className="property-group" style={{ marginTop: 'auto' }}>
          <h3 className="section-title">Legend</h3>
          <div className="color-scale"></div>
        </div>
      </div>
    </div>
  );
};

export default App;
