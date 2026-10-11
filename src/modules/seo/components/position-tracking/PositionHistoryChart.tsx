import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PositionHistoryEntry } from '../../types';

interface PositionHistoryChartProps {
  history: PositionHistoryEntry[];
}

export function PositionHistoryChart({ history }: PositionHistoryChartProps) {
  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4">
        No position history available yet.
      </p>
    );
  }

  return (
    <div className="h-40 pr-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            reversed
            domain={[1, 'auto']}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="position"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
