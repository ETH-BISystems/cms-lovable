import type { GapType } from '../types';

interface GapOverlapVisualizationProps {
  counts: Record<GapType, number>;
  onSegmentClick: (type: GapType | 'all') => void;
}

const SEGMENT_CONFIG: { type: GapType; label: string; color: string }[] = [
  { type: 'unique', label: 'Unique', color: 'bg-blue-500' },
  { type: 'strong', label: 'Strong', color: 'bg-green-500' },
  { type: 'weak', label: 'Weak', color: 'bg-yellow-500' },
  { type: 'missing', label: 'Missing', color: 'bg-red-500' },
  { type: 'untapped', label: 'Untapped', color: 'bg-purple-500' },
];

export function GapOverlapVisualization({ counts, onSegmentClick }: GapOverlapVisualizationProps) {
  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-8 rounded-lg overflow-hidden">
        {SEGMENT_CONFIG.map(({ type, color }) => {
          const count = counts[type] ?? 0;
          if (count === 0) return null;
          const width = (count / total) * 100;
          return (
            <button
              key={type}
              className={`${color} hover:opacity-80 transition-opacity cursor-pointer`}
              style={{ width: `${width}%` }}
              onClick={() => onSegmentClick(type)}
              title={`${type}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        {SEGMENT_CONFIG.map(({ type, label, color }) => (
          <button
            key={type}
            className="flex items-center gap-1.5 text-xs cursor-pointer hover:underline"
            onClick={() => onSegmentClick(type)}
          >
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span>{label}: {counts[type] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
