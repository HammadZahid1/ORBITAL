import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsSample } from '../../state/analytics';

/** Selected-body distance, speed and eccentricity history. */
export function OrbitChart({ samples }: { samples: AnalyticsSample[] }) {
  const data = samples.map((sample, index) => ({
    index,
    distance: sample.distance,
    speed: sample.speed,
    eccentricity: sample.eccentricity,
  }));

  if (data.length < 2) {
    return <div className="py-8 text-center text-[10px] text-faint">Collecting orbital samples…</div>;
  }

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#18202d" strokeDasharray="2 4" />
          <XAxis dataKey="index" tick={{ fill: '#5d6a7d', fontSize: 9 }} stroke="#202939" />
          <YAxis tick={{ fill: '#5d6a7d', fontSize: 9 }} stroke="#202939" />
          <Tooltip contentStyle={{ background: '#0f141e', border: '1px solid #202939', fontSize: 10 }} />
          <Line type="monotone" dataKey="distance" stroke="#3ea8ff" dot={false} strokeWidth={1.4} />
          <Line type="monotone" dataKey="speed" stroke="#63d6a0" dot={false} strokeWidth={1.4} />
          <Line type="monotone" dataKey="eccentricity" stroke="#e9b56b" dot={false} strokeWidth={1.4} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
