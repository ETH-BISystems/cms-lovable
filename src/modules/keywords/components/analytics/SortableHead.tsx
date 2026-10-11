import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortDirection } from '../../hooks/useSortedPagination';

interface SortableHeadProps {
  label: string;
  sortKey: string;
  activeKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

/** Clickable table header cell showing the active sort indicator. */
export function SortableHead({ label, sortKey, activeKey, direction, onSort, className }: SortableHeadProps) {
  const active = sortKey === activeKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className={cn('h-3 w-3 opacity-40')} />
        )}
      </button>
    </TableHead>
  );
}
