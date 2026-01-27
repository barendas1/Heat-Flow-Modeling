import React, { useRef, useEffect, useState } from 'react';
import { Container, Sample, ToolType } from '../types';
import { PIXELS_PER_INCH } from '../const';

interface CanvasProps {
  container: Container;
  samples: Sample[];
  tool: ToolType;
  showMeasurements: boolean;
  selectedId: string | null;
  showHeatmap: boolean;
  gridData: number[][] | null; // Temperature grid
  onContainerUpdate: (container: Container) => void;
  onSampleUpdate: (sample: Sample) => void;
  onSelect: (id: string | null) => void;
  onAddSample: (x: number, y: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  container,
  samples,
  tool,
  selectedId,
  showHeatmap,
  showMeasurements,
  gridData,
  onContainerUpdate,
  onSampleUpdate,
  onSelect,
  onAddSample
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Turbo Colormap (Google AI) - smoother and more perceptually uniform than Jet/Rainbow
  const getTurboColor = (t: number) => {
    // kRed, kGreen, kBlue coefficients for Turbo colormap approximation
    const kRedVec4 = [0.13572138, 4.61539260, -42.66032258, 132.13108234, -152.94239396, 59.28637943];
    const kGreenVec4 = [0.09140261, 2.19418839, 4.84296658, -14.18503333, 4.27729857, 2.82956604];
    const kBlueVec4 = [0.10667330, 12.64194608, -60.58204836, 110.36276771, -89.90310912, 27.34824973];

    const x = Math.max(0, Math.min(1, t));
    
    const v4 = [1, x, x * x, x * x * x, x * x * x * x, x * x * x * x * x];
    
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < 6; i++) {
      r += v4[i] * kRedVec4[i];
      g += v4[i] * kGreenVec4[i];
      b += v4[i] * kBlueVec4[i];
    }

    return {
      r: Math.floor(Math.max(0, Math.min(1, r)) * 255),
      g: Math.floor(Math.max(0, Math.min(1, g)) * 255),
      b: Math.floor(Math.max(0, Math.min(1, b)) * 255)
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 0. Draw Background (Blander)
    ctx.fillStyle = container.fill_type === 'Water' ? '#E6F3FF' : '#FFF8E1'; // Light Blue or Light Yellow/Orange
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Heatmap Grid (if available)
    if (showHeatmap && gridData) {
      const width = canvas.width;
      const height = canvas.height;
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      const minTemp = 70;
      const maxTemp = 120;

      const gridH = gridData.length;
      const gridW = gridData[0].length;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const gx = Math.floor((x / width) * gridW);
          const gy = Math.floor((y / height) * gridH);
          
          const temp = gridData[gy][gx];
          
          const t = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
          const color = getTurboColor(t);
          
          const index = (y * width + x) * 4;
          data[index] = color.r;
          data[index + 1] = color.g;
          data[index + 2] = color.b;
          data[index + 3] = 255; // Full opacity
        }
      }
      
      ctx.putImageData(imageData, 0, 0);

      // Draw Isotherm Lines (Contours every 5 degrees)
      ctx.lineWidth = 1;
      const cellW = width / gridW;
      const cellH = height / gridH;
      
      for (let y = 1; y < gridH; y++) {
        for (let x = 1; x < gridW; x++) {
           const temp = gridData[y][x];
           const prevTemp = gridData[y][x-1];
           const topTemp = gridData[y-1][x];
           
           for (let t = 80; t <= 120; t += 5) {
             if ((temp >= t && prevTemp < t) || (temp < t && prevTemp >= t)) {
               ctx.fillStyle = 'rgba(255,255,255,0.4)';
               ctx.fillRect(x * cellW, y * cellH, 2, cellH);
             }
             if ((temp >= t && topTemp < t) || (temp < t && topTemp >= t)) {
               ctx.fillStyle = 'rgba(255,255,255,0.4)';
               ctx.fillRect(x * cellW, y * cellH, cellW, 2);
             }
           }
        }
      }
    }

    // 2. Draw Container Boundary
    ctx.strokeStyle = selectedId === 'container' ? '#f8a24b' : '#3f4492';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (container.shape === 'circle') {
      ctx.arc(cx, cy, container.width / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(cx - container.width / 2, cy - container.height / 2, container.width, container.height);
    }
    ctx.stroke();

    // 3. Draw Samples
    samples.forEach(sample => {
      const isSelected = selectedId === sample.id;
      
      // Outer
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, sample.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#A0A0A0'; // Aluminum color
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = '#f8a24b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Middle (Insulation/Plastic)
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, sample.radius * sample.middle_radius_fraction, 0, Math.PI * 2);
      ctx.fillStyle = '#D0D0D0';
      ctx.fill();

      // Core (Water)
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, sample.radius * sample.core_radius_fraction, 0, Math.PI * 2);
      ctx.fillStyle = '#4A90E2'; // Water color
      ctx.fill();
    });

    // 4. Draw Measurements (Toggle)
    if (showMeasurements) {
      ctx.font = '14px Inter';
      ctx.lineWidth = 1;
      
      const drawLabel = (x: number, y: number, text: string, align: CanvasTextAlign = 'center') => {
        const padding = 4;
        const width = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(x - width/2 - padding, y - 10, width + padding*2, 20);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
      };

      // Container Dimensions
      if (container.shape === 'rectangle') {
        // Width
        drawLabel(cx, cy - container.height/2 - 20, `${(container.width / PIXELS_PER_INCH).toFixed(1)}"`);
        // Height
        drawLabel(cx - container.width/2 - 20, cy, `${(container.height / PIXELS_PER_INCH).toFixed(1)}"`);
      } else {
        // Diameter
        drawLabel(cx, cy - container.width/2 - 20, `Ø ${(container.width / PIXELS_PER_INCH).toFixed(1)}"`);
      }

      // Sample to Wall / Edge
      samples.forEach(s => {
        // Draw Label Name
        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(s.name, s.x, s.y - s.radius - 15);
        
        ctx.font = '12px Inter';
        // Distance to closest walls
        if (container.shape === 'rectangle') {
           const leftWall = cx - container.width/2;
           const rightWall = cx + container.width/2;
           const topWall = cy - container.height/2;
           const bottomWall = cy + container.height/2;
           
           // Draw lines to closest X and Y walls
           ctx.strokeStyle = 'rgba(0,0,0,0.5)';
           ctx.setLineDash([4, 4]);
           
           // X distance
           const distLeft = s.x - leftWall;
           const distRight = rightWall - s.x;
           if (distLeft < distRight) {
             ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(leftWall, s.y); ctx.stroke();
             drawLabel((s.x + leftWall)/2, s.y, `${(distLeft/PIXELS_PER_INCH).toFixed(1)}"`);
           } else {
             ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(rightWall, s.y); ctx.stroke();
             drawLabel((s.x + rightWall)/2, s.y, `${(distRight/PIXELS_PER_INCH).toFixed(1)}"`);
           }

           // Y distance
           const distTop = s.y - topWall;
           const distBottom = bottomWall - s.y;
           if (distTop < distBottom) {
             ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, topWall); ctx.stroke();
             drawLabel(s.x, (s.y + topWall)/2, `${(distTop/PIXELS_PER_INCH).toFixed(1)}"`);
           } else {
             ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, bottomWall); ctx.stroke();
             drawLabel(s.x, (s.y + bottomWall)/2, `${(distBottom/PIXELS_PER_INCH).toFixed(1)}"`);
           }
           ctx.setLineDash([]);
        } else {
           // Distance to edge (Drum)
           const dx = s.x - cx;
           const dy = s.y - cy;
           const distCenter = Math.sqrt(dx*dx + dy*dy);
           const angle = Math.atan2(dy, dx);
           const wallX = cx + Math.cos(angle) * (container.width/2);
           const wallY = cy + Math.sin(angle) * (container.width/2);
           
           const distToWall = Math.sqrt((wallX - s.x)**2 + (wallY - s.y)**2);
           
           ctx.strokeStyle = 'rgba(0,0,0,0.5)';
           ctx.setLineDash([4, 4]);
           ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(wallX, wallY); ctx.stroke();
           ctx.setLineDash([]);
           
           drawLabel((s.x + wallX)/2, (s.y + wallY)/2, `${(distToWall/PIXELS_PER_INCH).toFixed(1)}"`);
        }
      });
    }

  }, [container, samples, selectedId, showHeatmap, showMeasurements, gridData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    setDragStart({ x, y });

    if (tool === 'add_sample') {
      onAddSample(x, y);
      return;
    }

    // Check sample click
    const clickedSample = samples.find(s => {
      const dx = s.x - x;
      const dy = s.y - y;
      return Math.sqrt(dx*dx + dy*dy) <= s.radius;
    });

    if (clickedSample) {
      onSelect(clickedSample.id);
      setDragItem(clickedSample.id);
      setIsDragging(true);
      return;
    }

    // Check container click (simplified)
    onSelect('container');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !dragItem) return;
    const { x, y } = getMousePos(e);
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    const sample = samples.find(s => s.id === dragItem);
    if (sample) {
      onSampleUpdate({
        ...sample,
        x: sample.x + dx,
        y: sample.y + dy
      });
      setDragStart({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragItem(null);
  };

  return (
    <>
    <canvas
      ref={canvasRef}
      width={window.innerWidth - 350}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: tool === 'add_sample' ? 'crosshair' : 'default' }}
    />
    {/* In-Canvas Legend */}
    {showHeatmap && (
      <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-sm border border-gray-200 text-xs pointer-events-none">
        <div className="font-semibold mb-2">Temperature (°F)</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-32 rounded bg-gradient-to-t from-[rgb(70,130,180)] via-[rgb(144,238,144)] to-[rgb(255,69,0)]"></div>
          <div className="flex flex-col justify-between h-32 text-gray-600">
            <span>120°F</span>
            <span>110°F</span>
            <span>100°F</span>
            <span>90°F</span>
            <span>80°F</span>
            <span>70°F</span>
          </div>
        </div>
      </div>
    )}
    </>
  );
};