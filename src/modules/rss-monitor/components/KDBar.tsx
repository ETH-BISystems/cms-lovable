export type KdColor = 'green' | 'yellow' | 'red';

export function getKdColor(value: number): KdColor {
  if (value <= 30) return 'green';
  if (value <= 60) return 'yellow';
  return 'red';
}

const barColorClasses: Record<KdColor, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

const labelColorClasses: Record<KdColor, string> = {
  green: 'text-green-700',
  yellow: 'text-yellow-700',
  red: 'text-red-700',
};

interface KDBarProps {
  value: number;
}

export type KeywordMetricsStatus = 'enriched' | 'no-data' | undefined;

interface KeywordMetricProps {
  /** Enrichment state — absent means SEO metrics were never fetched (CMS-30). */
  status: KeywordMetricsStatus;
  value: number;
}

/** KD display honoring the enrichment state: bar when enriched, muted label otherwise. */
export function KDMetric({ status, value }: KeywordMetricProps) {
  if (status === 'enriched') return <KDBar value={value} />;
  return (
    <span className="text-xs text-muted-foreground">
      {status === 'no-data' ? 'No data' : 'Not enriched'}
    </span>
  );
}

/** Search volume display honoring the enrichment state. */
export function SearchVolumeMetric({ status, value }: KeywordMetricProps) {
  if (status === 'enriched') {
    return <span className="text-sm font-medium">{value.toLocaleString()}</span>;
  }
  return (
    <span className="text-xs text-muted-foreground">
      {status === 'no-data' ? 'No data' : 'Not enriched'}
    </span>
  );
}

export function KDBar({ value }: KDBarProps) {
  const color = getKdColor(value);
  const width = Math.min(Math.max(value, 0), 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColorClasses[color]}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-7 text-right ${labelColorClasses[color]}`}>
        {value}
      </span>
    </div>
  );
}
