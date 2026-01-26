import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GraphProps {
  data: any[];
}

export const TemperatureGraph: React.FC<GraphProps> = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Data</div>;

  // Get keys (sample names)
  const keys = Object.keys(data[0]).filter(k => k !== 'time');

  return (
    <div style={{ height: '250px', width: '100%', marginTop: '1rem', background: '#fff', padding: '10px', borderRadius: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} />
          <YAxis label={{ value: 'Temp (°F)', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
          <Tooltip />
          <Legend />
          {keys.map((key, index) => (
            <Line 
              key={key} 
              type="monotone" 
              dataKey={key} 
              stroke={`hsl(${index * 60}, 70%, 50%)`} 
              dot={false} 
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};