import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TrendDataPoint {
  month: string;
  aioPercent: number;
  ctrImpact: number;
}

interface AIOverviewTrendChartProps {
  data: TrendDataPoint[];
}

export function AIOverviewTrendChart({ data }: AIOverviewTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          AI Overview Trend
        </h3>
        <p className="text-xs text-muted-foreground py-8 text-center">
          No trend data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        AI Overview Trend
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--accent))"
              unit="%"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--destructive))"
              unit="%"
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="aioPercent"
              name="% with AI Overview"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ctrImpact"
              name="CTR Impact %"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
