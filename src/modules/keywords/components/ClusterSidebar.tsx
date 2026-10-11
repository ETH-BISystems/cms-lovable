import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClusterSidebarProps {
  clusters: Record<string, number>;
  selectedCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
}

export function ClusterSidebar({ clusters, selectedCluster, onClusterSelect }: ClusterSidebarProps) {
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');

  const entries = Object.entries(clusters);
  const sorted = [...entries].sort((a, b) => {
    if (sortBy === 'count') return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="w-56 shrink-0 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Clusters</h3>
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'count' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setSortBy('count')}
          >
            Count
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setSortBy('name')}
          >
            A-Z
          </Button>
        </div>
      </div>

      <div className="space-y-0.5">
        <button
          className={cn(
            'w-full flex items-center justify-between px-3 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left',
            selectedCluster === null && 'bg-muted font-medium',
          )}
          onClick={() => onClusterSelect(null)}
        >
          <span>All</span>
          <Badge variant="secondary" className="text-[10px] h-5">{totalCount}</Badge>
        </button>

        {sorted.map(([cluster, count]) => (
          <button
            key={cluster}
            className={cn(
              'w-full flex items-center justify-between px-3 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left',
              selectedCluster === cluster && 'bg-muted font-medium',
            )}
            onClick={() => onClusterSelect(cluster)}
          >
            <span className="truncate">{cluster}</span>
            <Badge variant="secondary" className="text-[10px] h-5 ml-2">{count}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
