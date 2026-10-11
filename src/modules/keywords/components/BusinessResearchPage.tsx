import { useCallback, useState } from 'react';
import { ExternalLink, Star } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { BusinessListingsResult } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { ChartCard } from './analytics/ChartCard';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { EmptyPrompt, ErrorState } from './analytics/StatusStates';
import { formatNumber } from './analytics/format';

const CITIES: Array<{ label: string; coordinate: string }> = [
  { label: 'New York', coordinate: '40.7580,-73.9855,25' },
  { label: 'Los Angeles', coordinate: '34.0522,-118.2437,30' },
  { label: 'Miami', coordinate: '25.7617,-80.1918,25' },
  { label: 'Las Vegas', coordinate: '36.1699,-115.1398,25' },
  { label: 'London', coordinate: '51.5074,-0.1278,25' },
  { label: 'Paris', coordinate: '48.8566,2.3522,25' },
  { label: 'Tokyo', coordinate: '35.6762,139.6503,30' },
  { label: 'Sydney', coordinate: '-33.8688,151.2093,30' },
];

function RatingStars({ rating, reviews }: { rating: number | null; reviews: number }) {
  if (rating === null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ring-1',
        rating >= 4.5 ? 'bg-green-100 text-green-800 ring-green-200'
        : rating >= 4 ? 'bg-accent/10 text-accent ring-accent/20'
        : rating >= 3 ? 'bg-amber-100 text-amber-800 ring-amber-200'
        : 'bg-red-100 text-red-800 ring-red-200',
      )}>
        <Star className="h-3 w-3 fill-current" />
        {rating.toFixed(1)}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{formatNumber(reviews)} reviews</span>
    </div>
  );
}

/**
 * Business Research — Google Business listings with ratings, for travel
 * content research (hotel roundups, lounge guides, destination pieces).
 */
export function BusinessResearchPage() {
  const query = useAnalyticsQuery(seoAnalyticsService.businessListings);
  const { run } = query;
  const [coordinate, setCoordinate] = useState(CITIES[0].coordinate);

  // History-first: this page never auto-fetches; with saved history the query
  // never auto-runs and the HistoryGate below offers the last searches.
  const historyFirst = useHistoryFirst('business-research');

  // Snapshot view — render a saved search result instead of the live query.
  const history = useHistorySnapshot<BusinessListingsResult>({
    // Re-run the snapshot's own search (city falls back to the current pick).
    onRefreshLive: snapshot => {
      if (snapshot.payload.query) run({ query: snapshot.payload.query, coordinate });
    },
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as BusinessListingsResult | null)?.listings)
      ? (history.snapshot.payload as BusinessListingsResult)
      : null;
  const onSubmit = useCallback(
    (q: string) => { clearSnapshot(); run({ query: q, coordinate }); },
    [run, coordinate, clearSnapshot],
  );

  const data: BusinessListingsResult | null = snapshotData ?? query.data;
  const loading = snapshotData ? false : historyFirst.checking || query.loading;
  const started = historyFirst.checking || query.loading || query.error !== null || data !== null;

  // History-first gate: shown instead of content until the user re-opens a
  // saved search or starts a new one — no API call is made while it shows.
  const showHistoryGate =
    !historyFirst.checking &&
    historyFirst.hasHistory &&
    !history.snapshot &&
    !query.data &&
    !query.loading &&
    !query.error;

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title={`Business Research${data ? `: ${data.query}` : ''}`}
        description="Google Business listings with ratings and review counts — research hotels, lounges, and local businesses for destination content."
        inputPlaceholder="e.g. park hyatt, rooftop bar, airport lounge"
        buttonLabel="Search"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="business-research" onLoad={history.loadSnapshot} />}
        extraControls={
          <Select value={coordinate} onValueChange={setCoordinate}>
            <SelectTrigger className="h-10 w-40 border-white/15 bg-white/10 text-white focus:ring-cyan-300/40 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map(city => (
                <SelectItem key={city.label} value={city.coordinate}>{city.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {history.banner}

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => history.loadSnapshot(snapshot, 'auto')}
        />
      ) : !started ? (
        <EmptyPrompt message="Search a business name or type to pull live Google Business listings with ratings." />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : (
        <ChartCard
          title="Listings"
          description={data ? `${data.listings.length} businesses found, sorted by review count` : undefined}
          loading={loading}
          skeletonHeight={420}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead className="w-44">Rating</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-36">Website</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.listings ?? []).map((listing, i) => (
                <TableRow key={`${listing.title}-${i}`}>
                  <TableCell className="max-w-[240px]">
                    <span className="block truncate font-medium">{listing.title}</span>
                    {listing.phone && <span className="text-xs text-muted-foreground">{listing.phone}</span>}
                  </TableCell>
                  <TableCell><RatingStars rating={listing.rating} reviews={listing.reviews} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{listing.category}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{listing.address}</TableCell>
                  <TableCell>
                    {listing.domain ? (
                      <a href={listing.url || `https://${listing.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
                        {listing.domain.replace(/^www\./, '').slice(0, 22)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.listings ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No listings found — try a broader search term or another city.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ChartCard>
      )}
    </div>
  );
}
