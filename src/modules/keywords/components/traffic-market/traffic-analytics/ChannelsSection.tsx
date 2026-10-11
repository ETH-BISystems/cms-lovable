import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartCard } from '../../analytics/ChartCard';
import { formatCompact } from '../../analytics/format';
import {
  CHART_AXIS_STROKE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
} from '../../analytics/chartTheme';
import { useAnalyticsQuery } from '../../../hooks/useAnalyticsQuery';
import { trafficMarketService } from '../../../services/trafficMarketService';
import { TRAFFIC_CHANNEL_LABELS } from '../../../types/trafficMarket';
import type { TrafficChannel, TrafficMarketInput } from '../../../types/trafficMarket';
import { MultiDomainTrendChart } from '../shared/MultiDomainTrendChart';
import { domainColor, InlineEmpty, InlineError } from './common';

const CHANNEL_KEYS = Object.keys(TRAFFIC_CHANNEL_LABELS) as TrafficChannel[];

interface ChannelsSectionProps {
  /** Shared domain-set input — a new reference triggers a refetch (Apply). */
  input: TrafficMarketInput;
  orderedDomains: string[];
}

/**
 * TA-02 — traffic channel distribution (grouped bars: one bar per domain per
 * channel, latest month) plus a per-channel multi-domain trend chart with a
 * channel selector. The selector offers only `availableChannels` — the four
 * search channels on 'dataforseo', the full clickstream taxonomy with
 * Similarweb.
 */
export function ChannelsSection({ input, orderedDomains }: ChannelsSectionProps) {
  const query = useAnalyticsQuery(trafficMarketService.channels);
  const { run } = query;
  const [channel, setChannel] = useState<TrafficChannel>('organic_search');

  useEffect(() => {
    run(input);
  }, [input, run]);

  const data = query.data;
  const showSkeleton = query.loading || (!data && !query.error);

  /** Channels the active provider(s) can serve; pre-data fallback is the full list. */
  const availableChannels = useMemo<TrafficChannel[]>(() => {
    const available = data?.availableChannels ?? [];
    return available.length > 0 ? available : CHANNEL_KEYS;
  }, [data]);

  // Keep the trend selector valid when the provider narrows the channel set.
  useEffect(() => {
    if (!availableChannels.includes(channel)) {
      setChannel(availableChannels[0]);
    }
  }, [availableChannels, channel]);

  /** Domain order for the grouped bars — page order first, then any extras. */
  const domains = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    data.distribution.forEach(entry => Object.keys(entry.visitsByDomain).forEach(d => seen.add(d)));
    const ordered = orderedDomains.filter(d => seen.has(d));
    seen.forEach(d => {
      if (!ordered.includes(d)) ordered.push(d);
    });
    return ordered;
  }, [data, orderedDomains]);

  const distributionRows = useMemo(() => {
    if (!data) return [];
    return data.distribution.map(entry => {
      // Domains contain dots (path syntax to recharts) — key series by index.
      const row: Record<string, string | number> = { channel: TRAFFIC_CHANNEL_LABELS[entry.channel] };
      domains.forEach((domain, i) => {
        row[`d${i}`] = entry.visitsByDomain[domain] ?? 0;
      });
      return row;
    });
  }, [data, domains]);

  const trendSeries = data?.trends[channel] ?? [];

  return (
    <>
      <ChartCard
        title="Traffic Channels"
        description="Latest-month visits by channel, one bar per domain"
        loading={showSkeleton}
        skeletonHeight={340}
      >
        {query.error ? (
          <InlineError message={query.error} onRetry={query.retry} />
        ) : distributionRows.length === 0 ? (
          <InlineEmpty message="No channel distribution data." />
        ) : (
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionRows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="channel"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={56}
                  tick={{ fontSize: 10 }}
                  stroke={CHART_AXIS_STROKE}
                />
                <YAxis
                  tick={CHART_AXIS_TICK}
                  stroke={CHART_AXIS_STROKE}
                  tickFormatter={(value: number) => formatCompact(value)}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [formatCompact(value), name]}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                />
                <Legend />
                {domains.map((domain, i) => (
                  <Bar
                    key={domain}
                    dataKey={`d${i}`}
                    name={domain}
                    fill={domainColor(domain, i, orderedDomains)}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={22}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Channel Trend"
        description="Monthly visits per domain for the selected channel"
        loading={showSkeleton}
        skeletonHeight={320}
        actions={
          <Select value={channel} onValueChange={value => setChannel(value as TrafficChannel)}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableChannels.map(key => (
                <SelectItem key={key} value={key}>
                  {TRAFFIC_CHANNEL_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {query.error ? (
          <InlineError message={query.error} onRetry={query.retry} />
        ) : trendSeries.length === 0 ? (
          <InlineEmpty message="No trend history for this channel." />
        ) : (
          <MultiDomainTrendChart
            months={data?.meta.months ?? []}
            series={trendSeries}
            colorOf={(domain, i) => domainColor(domain, i, orderedDomains)}
            height={320}
            tooltipFormatter={formatCompact}
            emptyMessage="No trend history for this channel."
          />
        )}
      </ChartCard>
    </>
  );
}
