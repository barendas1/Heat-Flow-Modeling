import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GraphProps {
  data: any[];
}

export const TemperatureGraph: React.FC<GraphProps> = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Data</div>;

  // Get keys (sample names)
  const keys = Object.keys(data[0]).filter(k => k !== 'time');

  // Determine Time Scale
  const maxTime = data[data.length - 1].time;
  let timeUnit = 'Seconds';
  let timeDivisor = 1;

  if (maxTime > 36000) { // > 10 hours (600 mins) -> Switch to Hours
    timeUnit = 'Hours';
    timeDivisor = 3600;
  } else if (maxTime > 600) { // > 600 seconds -> Switch to Minutes
    timeUnit = 'Minutes';
    timeDivisor = 60;
  }

  // Format Data for Display
  const formattedData = data.map(d => ({
    ...d,
    displayTime: Number((d.time / timeDivisor).toFixed(1))
  }));

  return (
    <div style={{ height: '250px', width: '100%', marginTop: '1rem', background: '#fff', padding: '10px', borderRadius: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="displayTime" 
            label={{ value: `Time (${timeUnit})`, position: 'insideBottomRight', offset: -5 }} 
            type="number"
            domain={['auto', 'auto']}
          />
          <YAxis label={{ value: 'Temp (°F)', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
          <Tooltip labelFormatter={(value) => `${value} ${timeUnit}`} />
          <Legend />
          {keys.map((key, index) => (
            <Line 
              key={key} 
              type="monotone" 
              dataKey={key} 
              stroke={`hsl(${index * 60}, 70%, 50%)`} 
              dot={false} 
              strokeWidth={2}
              isAnimationActive={false} // Disable animation for performance
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};