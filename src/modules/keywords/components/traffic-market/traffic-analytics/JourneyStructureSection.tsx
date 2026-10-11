import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ChartCard } from '../../analytics/ChartCard';
import { SortableHead } from '../../analytics/SortableHead';
import { formatCompact } from '../../analytics/format';
import { ShareBar } from '../../analytics/dataViz';
import { DataTablePagination } from '../../shared/DataTablePagination';
import { SankeyFlow } from '../charts/SankeyFlow';
import { ClickstreamGatedCard } from '../shared/ClickstreamGatedCard';
import { ExternalOpen, pageHref } from '../shared/ExternalOpen';
import { useAnalyticsQuery } from '../../../hooks/useAnalyticsQuery';
import { useSortedPagination } from '../../../hooks/useSortedPagination';
import { trafficMarketService } from '../../../services/trafficMarketService';
import type { TopPageRow } from '../../../types/trafficMarket';
import { InlineEmpty, InlineError } from './common';

/** Sortable + paginated table for one structure tab (pages / subfolders / subdomains). */
function StructureTable({ rows, pathLabel, domain }: { rows: TopPageRow[]; pathLabel: string; domain: string }) {
  const table = useSortedPagination(rows, 'trafficShare');

  // Unique pageviews/visitors are clickstream-only — the columns hide on
  // 'dataforseo' where the backend serves them as null.
  const hasUniques = rows.some(row => row.uniquePageviews != null || row.uniqueVisitors != null);

  if (rows.length === 0) {
    return <InlineEmpty message={`No ${pathLabel.toLowerCase()} data for this domain.`} />;
  }

  const head = (label: string, key: string, className?: string) => (
    <SortableHead
      label={label}
      sortKey={key}
      activeKey={table.sortKey}
      direction={table.direction}
      onSort={table.toggleSort}
      className={cn(className, table.sortKey === key && 'bg-accent/[0.06] text-foreground')}
    />
  );

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {head(pathLabel, 'page')}
              {head('Traffic Share', 'trafficShare', 'w-40')}
              {hasUniques && head('Unique Pageviews', 'uniquePageviews', 'w-40')}
              {hasUniques && head('Unique Visitors', 'uniqueVisitors', 'w-40')}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.pageRows.map(row => (
              <TableRow key={row.page}>
                <TableCell className="max-w-[360px]">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate font-medium" title={row.page}>
                      {row.page}
                    </span>
                    {domain && (
                      <ExternalOpen
                        href={pageHref(domain, row.page)}
                        label={`Open ${row.page} in a new tab`}
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <ShareBar pct={row.trafficShare * 100} />
                </TableCell>
                {hasUniques && (
                  <TableCell className="tabular-nums">{formatCompact(row.uniquePageviews)}</TableCell>
                )}
                {hasUniques && (
                  <TableCell className="tabular-nums">{formatCompact(row.uniqueVisitors)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {table.totalItems > 10 && (
        <DataTablePagination
          page={table.page}
          pageSize={table.pageSize}
          totalPages={table.totalPages}
          totalItems={table.totalItems}
          setPage={table.setPage}
          setPageSize={table.setPageSize}
        />
      )}
    </>
  );
}

interface JourneyStructureSectionProps {
  /** Current domain set — options for the shared domain selector. */
  domains: string[];
}

/**
 * TA-03 — Traffic Journey (sources → domain → destinations Sankey) and site
 * structure (Top Pages / Subfolders / Subdomains tables). One domain selector
 * scopes both blocks; each block keeps its own query + loading/error state.
 */
export function JourneyStructureSection({ domains }: JourneyStructureSectionProps) {
  const [domain, setDomain] = useState('');
  const journey = useAnalyticsQuery(trafficMarketService.journey);
  const structure = useAnalyticsQuery(trafficMarketService.structure);
  const { run: runJourney } = journey;
  const { run: runStructure } = structure;

  // Keep the selection valid as the domain set changes (Apply / initial seed).
  useEffect(() => {
    if (domains.length > 0 && !domains.includes(domain)) {
      setDomain(domains[0]);
    }
  }, [domains, domain]);

  useEffect(() => {
    if (!domain) return;
    runJourney({ domain });
    runStructure({ domain });
  }, [domain, runJourney, runStructure]);

  const journeySkeleton = journey.loading || (!journey.data && !journey.error);
  const structureSkeleton = structure.loading || (!structure.data && !structure.error);

  const domainSelect = (
    <Select value={domain} onValueChange={setDomain} disabled={domains.length === 0}>
      <SelectTrigger className="h-8 w-56 text-xs">
        <SelectValue placeholder="Select domain" />
      </SelectTrigger>
      <SelectContent>
        {domains.map(d => (
          <SelectItem key={d} value={d}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <ChartCard
        title="Traffic Journey"
        description={domain ? `Where ${domain} traffic comes from — and where it goes next` : 'Traffic sources and destinations'}
        loading={journeySkeleton}
        skeletonHeight={380}
        actions={domainSelect}
      >
        {journey.error ? (
          <InlineError message={journey.error} onRetry={journey.retry} />
        ) : journey.data && journey.data.sources === null ? (
          // Journey flows are clickstream-only — gated on 'dataforseo'.
          <ClickstreamGatedCard inline />
        ) : (
          <SankeyFlow
            center={journey.data?.domain ?? domain}
            sources={journey.data?.sources ?? []}
            destinations={journey.data?.destinations ?? []}
          />
        )}
      </ChartCard>

      <ChartCard
        title="Site Structure"
        description={domain ? `Top pages, subfolders and subdomains for ${domain}` : 'Top pages, subfolders and subdomains'}
        loading={structureSkeleton}
        skeletonHeight={360}
      >
        {structure.error ? (
          <InlineError message={structure.error} onRetry={structure.retry} />
        ) : (
          <Tabs defaultValue="pages">
            <TabsList>
              <TabsTrigger value="pages" className="text-xs">
                Top Pages
              </TabsTrigger>
              <TabsTrigger value="subfolders" className="text-xs">
                Top Subfolders
              </TabsTrigger>
              <TabsTrigger value="subdomains" className="text-xs">
                Top Subdomains
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pages" className="mt-3">
              <StructureTable rows={structure.data?.pages ?? []} pathLabel="Page" domain={structure.data?.domain ?? domain} />
            </TabsContent>
            <TabsContent value="subfolders" className="mt-3">
              <StructureTable rows={structure.data?.subfolders ?? []} pathLabel="Subfolder" domain={structure.data?.domain ?? domain} />
            </TabsContent>
            <TabsContent value="subdomains" className="mt-3">
              <StructureTable rows={structure.data?.subdomains ?? []} pathLabel="Subdomain" domain={structure.data?.domain ?? domain} />
            </TabsContent>
          </Tabs>
        )}
      </ChartCard>
    </>
  );
}
