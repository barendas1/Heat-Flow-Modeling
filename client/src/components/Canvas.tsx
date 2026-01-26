import React, { useRef, useEffect, useState } from 'react';
import { Container, Sample, ToolType } from '../types';

interface CanvasProps {
  container: Container;
  samples: Sample[];
  tool: ToolType;
  selectedId: string | null;
  showHeatmap: boolean;
  showDimensions: boolean;
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
  showDimensions,
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

  // Temperature Color Map (Blue -> Green -> Red)
  const getTempColor = (tempF: number) => {
    const min = 70; // Ambient
    const max = 120; // Hot sample
    const t = Math.max(0, Math.min(1, (tempF - min) / (max - min)));
    const r = Math.round(255 * t);
    const b = Math.round(255 * (1 - t));
    const g = Math.round(100 * (1 - Math.abs(t - 0.5) * 2));
    return `rgb(${r}, ${g}, ${b})`;
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

    // 1. Draw Heatmap Grid (if available)
    if (showHeatmap && gridData) {
      const cellWidth = canvas.width / gridData[0].length;
      const cellHeight = canvas.height / gridData.length;
      
      for (let y = 0; y < gridData.length; y++) {
        for (let x = 0; x < gridData[y].length; x++) {
          const temp = gridData[y][x];
          if (temp > container.ambient_temperature + 0.5) { // Only draw if warmer than ambient
            ctx.fillStyle = getTempColor(temp);
            ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
          }
          
          // Isotherm Lines (Contours every 5 degrees)
          if (x > 0 && y > 0) {
             const prevTemp = gridData[y][x-1];
             const topTemp = gridData[y-1][x];
             
             // Check horizontal crossing
             for (let t = 80; t <= 120; t += 5) {
               if ((temp >= t && prevTemp < t) || (temp < t && prevTemp >= t)) {
                 ctx.fillStyle = 'rgba(255,255,255,0.3)';
                 ctx.fillRect(x * cellWidth, y * cellHeight, 2, cellHeight);
               }
               if ((temp >= t && topTemp < t) || (temp < t && topTemp >= t)) {
                 ctx.fillStyle = 'rgba(255,255,255,0.3)';
                 ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, 2);
               }
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

    // 4. Draw Dimensions (The "Ruler")
    if (showDimensions) {
      ctx.font = '12px JetBrains Mono';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Helper to draw dimension line
      const drawDim = (x1: number, y1: number, x2: number, y2: number, text: string) => {
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        // Background pill
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(midX - textWidth/2 - 4, midY - 10, textWidth + 8, 20);
        
        // Text
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, midX, midY);
      };

      // Distance between samples
      for (let i = 0; i < samples.length; i++) {
        for (let j = i + 1; j < samples.length; j++) {
          const s1 = samples[i];
          const s2 = samples[j];
          
          const distCenter = Math.sqrt((s2.x - s1.x)**2 + (s2.y - s1.y)**2);
          const distEdge = distCenter - s1.radius - s2.radius;
          
          // Draw line between closest edges
          const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
          const x1 = s1.x + Math.cos(angle) * s1.radius;
          const y1 = s1.y + Math.sin(angle) * s1.radius;
          const x2 = s2.x - Math.cos(angle) * s2.radius;
          const y2 = s2.y - Math.sin(angle) * s2.radius;

          drawDim(x1, y1, x2, y2, `${Math.round(distEdge)}px`);
        }
      }

      // Distance to Container Walls (if close)
      samples.forEach(s => {
        // Find closest point on container
        if (container.shape === 'circle') {
          const dx = s.x - cx; // cx is canvas center
          const dy = s.y - cy; // cy is canvas center
          const angle = Math.atan2(dy, dx);
          const r = container.width / 2;
          const wallX = cx + Math.cos(angle) * r;
          const wallY = cy + Math.sin(angle) * r;
          
          const distToWall = Math.sqrt((wallX - s.x)**2 + (wallY - s.y)**2) - s.radius;
          if (distToWall < 200) { // Only show if relevant
             const sx = s.x + Math.cos(angle) * s.radius;
             const sy = s.y + Math.sin(angle) * s.radius;
             drawDim(sx, sy, wallX, wallY, `${Math.round(distToWall)}px`);
          }
        }
      });

      ctx.setLineDash([]);
    }

  }, [container, samples, selectedId, showHeatmap, showDimensions, gridData]);

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
    <canvas
      ref={canvasRef}
      width={window.innerWidth - 350}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: tool === 'add_sample' ? 'crosshair' : 'default' }}
    />
  );
};