import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartCard } from '../../analytics/ChartCard';
import type { MarketOverviewResult } from '../../../types/trafficMarket';
import { QuadrantChart } from '../charts/QuadrantChart';

interface GrowthQuadrantCardProps {
  quadrant: MarketOverviewResult['quadrant'] | null;
  loading: boolean;
}

/** D5 defaults: Similarweb-native axes — latest visits vs visits growth. */
const DEFAULT_X = 'visits';
const DEFAULT_Y = 'visitsGrowthPct';

/**
 * MO-02 — Growth Quadrant: domains scattered on two selectable axis metrics,
 * split into Game Changers / Leaders / Niche Players / Established Players by
 * the mean of each axis (QuadrantChart handles the split and labels).
 */
export function GrowthQuadrantCard({ quadrant, loading }: GrowthQuadrantCardProps) {
  const options = useMemo(() => quadrant?.axisOptions ?? [], [quadrant]);
  const [pendingX, setPendingX] = useState(DEFAULT_X);
  const [pendingY, setPendingY] = useState(DEFAULT_Y);
  const [axes, setAxes] = useState({ x: DEFAULT_X, y: DEFAULT_Y });

  /** Fall back to a real axis option when an id is not offered by the backend. */
  const resolve = (id: string, fallbackIndex: number): string => {
    if (options.some((o) => o.id === id)) return id;
    return options[fallbackIndex]?.id ?? id;
  };
  const xId = resolve(axes.x, 0);
  const yId = resolve(axes.y, Math.min(1, Math.max(0, options.length - 1)));
  const labelOf = (id: string) => options.find((o) => o.id === id)?.label ?? id;

  const points = useMemo(
    () =>
      (quadrant?.points ?? []).map((p) => ({
        domain: p.domain,
        x: p.metrics[xId] ?? 0,
        y: p.metrics[yId] ?? 0,
      })),
    [quadrant, xId, yId],
  );

  const dirty = pendingX !== axes.x || pendingY !== axes.y;
  const isDefault =
    pendingX === DEFAULT_X && pendingY === DEFAULT_Y && axes.x === DEFAULT_X && axes.y === DEFAULT_Y;

  const axisSelect = (
    axis: 'X' | 'Y',
    value: string,
    onChange: (id: string) => void,
  ) => (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{axis}</span>
      <Select
        value={options.length > 0 ? resolve(value, axis === 'X' ? 0 : Math.min(1, options.length - 1)) : ''}
        onValueChange={onChange}
        disabled={options.length === 0}
      >
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder={`${axis} axis`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <ChartCard
      title="Growth Quadrant"
      description={`Domains positioned by ${labelOf(xId)} vs ${labelOf(yId)}, split at the market average`}
      loading={loading}
      skeletonHeight={420}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {axisSelect('X', pendingX, setPendingX)}
          {axisSelect('Y', pendingY, setPendingY)}
          <Button
            variant="ghost"
            size="sm"
            disabled={!dirty || options.length === 0}
            onClick={() => setAxes({ x: pendingX, y: pendingY })}
          >
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isDefault}
            onClick={() => {
              setPendingX(DEFAULT_X);
              setPendingY(DEFAULT_Y);
              setAxes({ x: DEFAULT_X, y: DEFAULT_Y });
            }}
          >
            Reset
          </Button>
        </div>
      }
    >
      <QuadrantChart points={points} xLabel={labelOf(xId)} yLabel={labelOf(yId)} />
    </ChartCard>
  );
}
