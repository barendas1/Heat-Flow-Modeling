import React from 'react';
import { Sample, Container } from '../types';

interface Props {
  samples: Sample[];
  container: Container;
}

export const InterferenceAnalyzer: React.FC<Props> = ({ samples, container }) => {
  const calculateInterference = (s1: Sample, s2: Sample, container: Container): number => {
    const dist = Math.sqrt((s2.x - s1.x)**2 + (s2.y - s1.y)**2);
    const edgeDist = dist - s1.radius - s2.radius;
    const k = container.fill_material.thermal_conductivity;
    const criticalDist = 50 * (k / 0.03);
    
    if (edgeDist > criticalDist) return 0;
    return Math.min(100, (1 - edgeDist / criticalDist) * 100);
  };

  const report: string[] = [];
    
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const score = calculateInterference(samples[i], samples[j], container);
      if (score > 5) {
        report.push(`${samples[i].name} - ${samples[j].name}: ${score.toFixed(1)}% Interference`);
      }
    }
  }
  
  if (report.length === 0) report.push("No significant thermal interference detected.");

  return (
    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
      {report.map(function(line, i) {
        return <div key={i} className="mb-1 last:mb-0">{line}</div>;
      })}
    </div>
  );
};