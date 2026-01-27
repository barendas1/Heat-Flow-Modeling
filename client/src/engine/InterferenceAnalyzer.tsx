import React from 'react';
import { Sample, Container } from '../types';
import { PIXELS_PER_INCH } from '../const';

interface Props {
  samples: Sample[];
  container: Container;
}

export const InterferenceAnalyzer: React.FC<Props> = ({ samples, container }) => {
  if (samples.length < 2) {
    return React.createElement('div', { className: "text-sm text-gray-500" }, "Add at least 2 samples to analyze interference.");
  }

  const pairs: any[] = [];

  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const s1 = samples[i];
      const s2 = samples[j];
      
      const dx = s1.x - s2.x;
      const dy = s1.y - s2.y;
      const distPixels = Math.sqrt(dx*dx + dy*dy);
      const distInches = distPixels / PIXELS_PER_INCH;
      
      const k = container.fill_material.thermal_conductivity;
      const dT = Math.abs(s1.temperature - s2.temperature);
      const distMeters = distInches * 0.0254;
      
      const flux = (k * dT) / Math.max(0.01, distMeters); 

      pairs.push({
        names: s1.name + " <-> " + s2.name,
        dist: distInches.toFixed(2),
        flux: flux.toFixed(2)
      });
    }
  }

  return React.createElement('div', { className: "interference-report" },
    React.createElement('table', { className: "w-full text-xs text-left" },
      React.createElement('thead', null,
        React.createElement('tr', null,
          React.createElement('th', { className: "pb-1" }, "Pair"),
          React.createElement('th', { className: "pb-1" }, "Dist (in)"),
          React.createElement('th', { className: "pb-1" }, "Flux (W/m²)")
        )
      ),
      React.createElement('tbody', null,
        pairs.map(function(p, idx) {
          return React.createElement('tr', { key: idx, className: "border-t border-gray-100" },
            React.createElement('td', { className: "py-1" }, p.names),
            React.createElement('td', { className: "py-1" }, p.dist),
            React.createElement('td', { className: "py-1 font-mono" }, p.flux)
          );
        })
      )
    ),
    React.createElement('div', { className: "mt-2 text-[10px] text-gray-400" }, "*Flux estimated via Fourier's Law")
  );
};