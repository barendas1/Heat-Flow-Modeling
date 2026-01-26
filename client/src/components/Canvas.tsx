import React, { useRef, useEffect, useState } from 'react';
import { Container, Sample, ToolType } from '../types';

interface CanvasProps {
  container: Container | null;
  samples: Sample[];
  tool: ToolType;
  selectedId: string | null;
  showHeatmap: boolean;
  showHeatRings: boolean;
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
  showHeatRings,
  onContainerUpdate,
  onSampleUpdate,
  onSelect,
  onAddSample
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null); // 'container' or sample ID
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  // Helper to get mouse position relative to canvas
  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Draw everything
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Container
    if (container) {
      // Container body
      ctx.fillStyle = showHeatmap ? getTemperatureColor(container.ambient_temperature) : '#e0e0e0';
      ctx.strokeStyle = selectedId === 'container' ? '#f8a24b' : '#3f4492';
      ctx.lineWidth = selectedId === 'container' ? 3 : 2;
      
      ctx.beginPath();
      ctx.rect(container.x, container.y, container.width, container.height);
      ctx.fill();
      ctx.stroke();

      // Resize handles if selected
      if (selectedId === 'container') {
        const handles = [
          { x: container.x, y: container.y }, // TL
          { x: container.x + container.width, y: container.y }, // TR
          { x: container.x, y: container.y + container.height }, // BL
          { x: container.x + container.width, y: container.y + container.height } // BR
        ];
        
        ctx.fillStyle = '#f8a24b';
        handles.forEach(h => {
          ctx.beginPath();
          ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Draw Samples
    samples.forEach(sample => {
      const isSelected = selectedId === sample.id;
      
      // Heat rings animation (simplified)
      if (showHeatRings && sample.heat_loss_rate && Math.abs(sample.heat_loss_rate) > 0.1) {
        const ringColor = sample.heat_loss_rate > 0 ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, sample.radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = ringColor;
        ctx.fill();
      }

      // Outer Layer
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, sample.radius * sample.outer_radius_fraction, 0, Math.PI * 2);
      ctx.fillStyle = showHeatmap ? getTemperatureColor(sample.temperature) : '#A0A0A0';
      ctx.fill();
      
      // Middle Layer
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, sample.radius * sample.middle_radius_fraction, 0, Math.PI * 2);
      ctx.fillStyle = showHeatmap ? getTemperatureColor(sample.temperature * 0.95) : '#D0D0D0'; // Slight variation
      ctx.fill();

      // Core Layer
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, sample.radius * sample.core_radius_fraction, 0, Math.PI * 2);
      ctx.fillStyle = showHeatmap ? getTemperatureColor(sample.temperature * 0.9) : '#F0F0F0';
      ctx.fill();

      // Selection outline
      if (isSelected) {
        ctx.strokeStyle = '#f8a24b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, sample.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = '#000';
      ctx.font = '12px Urbanist';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(sample.temperature)}°F`, sample.x, sample.y - sample.radius - 10);
    });

  }, [container, samples, selectedId, showHeatmap, showHeatRings]);

  // Temperature to Color Gradient (Blue -> Green -> Red)
  const getTemperatureColor = (tempF: number) => {
    const min = 32;
    const max = 130;
    const t = Math.max(0, Math.min(1, (tempF - min) / (max - min)));
    
    // Simple heatmap gradient
    const r = Math.round(255 * t);
    const b = Math.round(255 * (1 - t));
    const g = Math.round(100 * (1 - Math.abs(t - 0.5) * 2));
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    setDragStart({ x, y });

    if (tool === 'add_sample') {
      onAddSample(x, y);
      return;
    }

    if (tool === 'draw_container') {
      onContainerUpdate({
        x, y, width: 0, height: 0,
        material: { name: 'Aluminum', thermal_conductivity: 205, specific_heat: 900, density: 2700, emissivity: 0.9, thickness: 0.002 },
        ambient_temperature: 70
      });
      setIsDragging(true);
      setDragItem('new_container');
      return;
    }

    // Check for sample click
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

    // Check for container click
    if (container && x >= container.x && x <= container.x + container.width &&
        y >= container.y && y <= container.y + container.height) {
      
      // Check resize handles
      const handleSize = 10;
      if (Math.abs(x - (container.x + container.width)) < handleSize && Math.abs(y - (container.y + container.height)) < handleSize) {
        setResizeHandle('br');
        setIsDragging(true);
        setDragItem('container');
        return;
      }
      
      onSelect('container');
      setDragItem('container');
      setIsDragging(true);
      return;
    }

    onSelect(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const { x, y } = getMousePos(e);
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (dragItem === 'new_container' && container) {
      onContainerUpdate({
        ...container,
        width: Math.abs(x - container.x),
        height: Math.abs(y - container.y)
      });
    } else if (dragItem === 'container' && container) {
      if (resizeHandle === 'br') {
        onContainerUpdate({
          ...container,
          width: Math.max(50, container.width + dx),
          height: Math.max(50, container.height + dy)
        });
        setDragStart({ x, y });
      } else {
        onContainerUpdate({
          ...container,
          x: container.x + dx,
          y: container.y + dy
        });
        setDragStart({ x, y });
      }
    } else if (dragItem) {
      const sample = samples.find(s => s.id === dragItem);
      if (sample) {
        onSampleUpdate({
          ...sample,
          x: sample.x + dx,
          y: sample.y + dy
        });
        setDragStart({ x, y });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragItem(null);
    setResizeHandle(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth - 350} // Subtract sidebar width
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: tool === 'add_sample' ? 'crosshair' : 'default' }}
    />
  );
};
