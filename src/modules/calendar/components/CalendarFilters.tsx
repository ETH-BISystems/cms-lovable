import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CalendarFilters as CalendarFiltersType, ContentType } from '../types';
import { TOPIC_CLUSTERS, UNCATEGORISED_CLUSTER } from '../types';

const TYPE_OPTIONS: { value: 'all' | ContentType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'article', label: 'Blog Articles' },
  { value: 'newsletter', label: 'Newsletters' },
  { value: 'deal', label: 'Deals & Alerts' },
];

const CLUSTER_OPTIONS = ['All Clusters', ...TOPIC_CLUSTERS, UNCATEGORISED_CLUSTER];

interface CalendarFiltersProps {
  filters: CalendarFiltersType;
  onFilterChange: (update: Partial<CalendarFiltersType>) => void;
}

export function CalendarFilters({ filters, onFilterChange }: CalendarFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={filters.type}
        onValueChange={(value) =>
          onFilterChange({ type: value as 'all' | ContentType })
        }
      >
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.cluster}
        onValueChange={(value) => onFilterChange({ cluster: value })}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="All Clusters" />
        </SelectTrigger>
        <SelectContent>
          {CLUSTER_OPTIONS.map((cluster) => (
            <SelectItem key={cluster} value={cluster}>
              {cluster}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
