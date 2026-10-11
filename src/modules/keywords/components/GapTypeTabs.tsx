import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { GapType } from '../types';

interface GapTypeTabsProps {
  activeType: GapType | 'all';
  onTypeChange: (type: GapType | 'all') => void;
  counts: Record<GapType, number>;
  totalCount: number;
}

const GAP_TYPES: { value: GapType | 'all'; label: string }[] = [
  { value: 'missing', label: 'Missing' },
  { value: 'weak', label: 'Weak' },
  { value: 'strong', label: 'Strong' },
  { value: 'unique', label: 'Unique' },
  { value: 'untapped', label: 'Untapped' },
  { value: 'all', label: 'All' },
];

export function GapTypeTabs({ activeType, onTypeChange, counts, totalCount }: GapTypeTabsProps) {
  return (
    <Tabs value={activeType} onValueChange={(v) => onTypeChange(v as GapType | 'all')}>
      <TabsList>
        {GAP_TYPES.map((gt) => (
          <TabsTrigger key={gt.value} value={gt.value} className="gap-1">
            {gt.label}
            <Badge variant="secondary" className="text-[10px] px-1 h-4 ml-1">
              {gt.value === 'all' ? totalCount : (counts[gt.value as GapType] ?? 0)}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
