import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { EditionCard } from './shared/EditionCard';
import { EditionDetailView } from './EditionDetailView';
import { useEditions } from '../hooks/useEditions';
import { useNewsletterFilters } from '../hooks/useNewsletterFilters';
import type { NewsletterEdition, EditionStatus } from '../types/index';

const PAGE_SIZE = 12;

const STATUS_OPTIONS: (EditionStatus | 'All')[] = [
  'All',
  'Sent',
  'Send Failed',
];

/**
 * Searchable, filterable list of sent editions.
 *
 * Requirements: 8.1, 8.2, 8.3
 */
export function PastEditionsTab() {
  const { editions, loading } = useEditions({ status: 'Sent', search: '', editionType: 'All' });
  const { editionFilters, setEditionFilter, filterEditions } = useNewsletterFilters();
  const [selectedEdition, setSelectedEdition] = useState<NewsletterEdition | null>(null);
  const [page, setPage] = useState(0);

  const filteredEditions = useMemo(() => {
    const sentEditions = editions.filter(
      (e) => e.status === 'Sent' || e.status === 'Send Failed',
    );
    return filterEditions(sentEditions);
  }, [editions, filterEditions]);

  const totalPages = Math.ceil(filteredEditions.length / PAGE_SIZE);
  const pagedEditions = filteredEditions.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  // Show detail view if an edition is selected
  if (selectedEdition) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 ml-4 mt-4"
          onClick={() => setSelectedEdition(null)}
        >
          <ChevronLeft className="h-3 w-3 mr-1" /> Back to list
        </Button>
        <EditionDetailView edition={selectedEdition} />
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={editionFilters.status}
          onValueChange={(v) => {
            setEditionFilter('status', v as EditionStatus | 'All');
            setPage(0);
          }}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search editions..."
            value={editionFilters.search}
            onChange={(e) => {
              setEditionFilter('search', e.target.value);
              setPage(0);
            }}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Edition cards grid */}
      {pagedEditions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No past editions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pagedEditions.map((edition) => (
            <EditionCard
              key={edition.id}
              edition={edition}
              onClick={setSelectedEdition}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
