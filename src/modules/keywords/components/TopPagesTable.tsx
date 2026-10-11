import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { DataTablePagination } from './shared/DataTablePagination';
import type { TopPage } from '../types';

interface TopPagesTableProps {
  pages: TopPage[];
  canPerformActions: boolean;
  onResearch: (page: TopPage) => void;
  onRefresh: (page: TopPage) => void;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
}

const ETH_STATUS_CONFIG = {
  'no-content': { label: 'No Content', variant: 'secondary' as const },
  leading: { label: 'Leading', variant: 'default' as const },
  weaker: { label: 'Weaker', variant: 'destructive' as const },
};

export function TopPagesTable({
  pages,
  canPerformActions,
  onResearch,
  onRefresh,
  pagination,
}: TopPagesTableProps) {
  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Traffic</TableHead>
              <TableHead>Diff</TableHead>
              <TableHead>Traffic %</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Top Keyword</TableHead>
              <TableHead>Ref. Domains</TableHead>
              <TableHead>Backlinks</TableHead>
              <TableHead>ETH Status</TableHead>
              {canPerformActions && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No pages found
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page) => {
                const statusConfig = ETH_STATUS_CONFIG[page.ethStatus];
                return (
                  <TableRow key={page.rank}>
                    <TableCell className="tabular-nums font-medium">{page.rank}</TableCell>
                    <TableCell>
                      <div>
                        <a
                          href={page.fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm font-medium truncate block max-w-[200px]"
                        >
                          {page.pagePath}
                        </a>
                        <span className="text-xs text-muted-foreground">{page.domain}</span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{page.estimatedTraffic.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {page.trafficDiff > 0 ? (
                          <ArrowUp className="h-3 w-3 text-green-600" />
                        ) : page.trafficDiff < 0 ? (
                          <ArrowDown className="h-3 w-3 text-red-600" />
                        ) : null}
                        <span className={`tabular-nums text-xs ${page.trafficDiff > 0 ? 'text-green-600' : page.trafficDiff < 0 ? 'text-red-600' : ''}`}>
                          {page.trafficDiff > 0 ? '+' : ''}{page.trafficDiff.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{page.trafficPercentage.toFixed(1)}%</TableCell>
                    <TableCell className="tabular-nums">{page.keywordsCount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{page.topKeyword}</TableCell>
                    <TableCell className="tabular-nums">{page.referringDomains.toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums">{page.backlinks.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>
                        {page.ethStatus === 'no-content'
                          ? statusConfig.label
                          : `ETH #${page.ethPosition} ${statusConfig.label}`}
                      </Badge>
                    </TableCell>
                    {canPerformActions && (
                      <TableCell>
                        {page.ethStatus === 'no-content' ? (
                          <Button size="sm" variant="outline" onClick={() => onResearch(page)}>Research</Button>
                        ) : page.ethStatus === 'weaker' ? (
                          <Button size="sm" variant="outline" onClick={() => onRefresh(page)}>Refresh</Button>
                        ) : (
                          <Badge variant="outline">Leading</Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination {...pagination} />
    </div>
  );
}
