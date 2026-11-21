import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsSample } from '../../state/analytics';

/** Time series of kinetic, potential and total mechanical energy. */
export function EnergyChart({ samples }: { samples: AnalyticsSample[] }) {
  const data = samples.map((sample, index) => ({
    index,
    kinetic: sample.kinetic,
    potential: sample.potential,
    total: sample.total,
  }));

  if (data.length < 2) {
    return <div className="py-8 text-center text-[10px] text-faint">Collecting energy samples…</div>;
  }

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#18202d" strokeDasharray="2 4" />
          <XAxis dataKey="index" tick={{ fill: '#5d6a7d', fontSize: 9 }} stroke="#202939" />
          <YAxis tick={{ fill: '#5d6a7d', fontSize: 9 }} stroke="#202939" tickFormatter={(value: number) => value.toExponential(1)} />
          <Tooltip
            contentStyle={{ background: '#0f141e', border: '1px solid #202939', fontSize: 10 }}
            labelFormatter={(value) => `Sample ${value}`}
          />
          <Line type="monotone" dataKey="kinetic" stroke="#55e0e8" dot={false} strokeWidth={1.4} />
          <Line type="monotone" dataKey="potential" stroke="#a78bfa" dot={false} strokeWidth={1.4} />
          <Line type="monotone" dataKey="total" stroke="#e9b56b" dot={false} strokeWidth={1.6} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
