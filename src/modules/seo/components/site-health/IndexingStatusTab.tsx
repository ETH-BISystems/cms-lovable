import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Globe,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { SeverityBadge } from '../shared/SeverityBadge';
import type { IndexingDoc, IndexStatus } from '../../types';

const PAGE_SIZE = 25;
const STATUS_PRIORITY: Record<string, number> = {
  Error: 0,
  Discovered: 1,
  'Not Indexed': 2,
  Crawled: 3,
  Indexed: 4,
};

interface IndexingStatusTabProps {
  indexing: IndexingDoc[];
  siteDomain: string;
  apiQuota?: number;
  apiQuotaTotal?: number;
  onSubmitForIndexing?: (urls: string[]) => void;
}

export function IndexingStatusTab({
  indexing,
  siteDomain,
  apiQuota = 186,
  apiQuotaTotal = 200,
  onSubmitForIndexing,
}: IndexingStatusTabProps) {
  const [filter, setFilter] = useState<'All' | IndexStatus>('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<'url' | 'title' | 'status' | 'lastCrawled'>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Summary
  const summary = useMemo(() => {
    const indexed = indexing.filter((p) => p.status === 'Indexed').length;
    const discovered = indexing.filter((p) => p.status === 'Discovered').length;
    const errors = indexing.filter((p) => p.status === 'Error').length;
    const indexRate = indexing.length > 0 ? Math.round((indexed / indexing.length) * 100) : 0;
    return { indexed, discovered, errors, indexRate };
  }, [indexing]);

  // Chart data — build from indexing data
  const chartData = useMemo(() => {
    // Group by month for a simple chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const indexedCount = indexing.filter((p) => p.status === 'Indexed').length;
    const notIndexedCount = indexing.length - indexedCount;
    return months.map((date, i) => ({
      date,
      indexed: Math.max(0, indexedCount - (months.length - 1 - i) * 5),
      notIndexed: Math.max(0, notIndexedCount + (months.length - 1 - i) * 2),
    }));
  }, [indexing]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...indexing];
    if (filter !== 'All') list = list.filter((p) => p.status === filter);
    return list.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'url') cmp = a.url.localeCompare(b.url);
      else if (sortCol === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortCol === 'status')
        cmp = (STATUS_PRIORITY[a.status] ?? 5) - (STATUS_PRIORITY[b.status] ?? 5);
      else cmp = a.lastCrawled.getTime() - b.lastCrawled.getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [indexing, filter, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map((p) => p.id)));
  };

  const selectNotIndexed = () =>
    setSelected(new Set(filtered.filter((p) => p.status !== 'Indexed').map((p) => p.id)));

  const submitForIndexing = () => {
    const urls = filtered.filter((p) => selected.has(p.id)).map((p) => p.url);
    onSubmitForIndexing?.(urls);
    setSelected(new Set());
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="flex items-center gap-4 text-[12px] flex-wrap">
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> {summary.indexed} indexed
        </span>
        <span className="flex items-center gap-1 text-warning-foreground font-medium">
          <Globe className="w-3.5 h-3.5" /> {summary.discovered} discovered
        </span>
        <span className="flex items-center gap-1 text-destructive font-medium">
          <XCircle className="w-3.5 h-3.5" /> {summary.errors} errors
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-accent font-medium">{summary.indexRate}% index rate</span>
      </div>

      {/* Filters + Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as any);
            setPage(1);
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
        >
          <option value="All">All Status</option>
          <option value="Indexed">Indexed</option>
          <option value="Discovered">Discovered</option>
          <option value="Crawled">Crawled</option>
          <option value="Not Indexed">Not Indexed</option>
          <option value="Error">Error</option>
        </select>
        <button onClick={selectNotIndexed} className="text-[11px] text-accent hover:underline">
          Select All Not Indexed
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            API quota: {apiQuota}/{apiQuotaTotal} remaining today
          </span>
          {selected.size > 0 ? (
            <Button
              size="sm"
              className="h-8 text-[11px] gap-1 bg-accent text-accent-foreground"
              onClick={submitForIndexing}
            >
              <Send className="w-3 h-3" /> Submit Selected ({selected.size})
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 text-[11px] gap-1 bg-accent text-accent-foreground"
                  disabled
                >
                  <Send className="w-3 h-3" /> Submit for Indexing
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[11px]">Select pages to submit</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded"
                  />
                </th>
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('url')}
                >
                  URL {sortCol === 'url' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('title')}
                >
                  Page Title {sortCol === 'title' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('status')}
                >
                  Index Status {sortCol === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('lastCrawled')}
                >
                  Last Crawled {sortCol === 'lastCrawled' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2.5 text-left font-medium text-muted-foreground">Submitted</th>
                <th className="p-2.5 text-left font-medium text-muted-foreground">Coverage Issue</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((pg) => (
                <tr
                  key={pg.id}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                    pg.status === 'Error'
                      ? 'border-l-2 border-l-destructive'
                      : pg.status === 'Discovered'
                        ? 'border-l-2 border-l-warning'
                        : ''
                  }`}
                >
                  <td className="p-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(pg.id)}
                      onChange={() => toggleRow(pg.id)}
                      className="w-3.5 h-3.5 rounded"
                    />
                  </td>
                  <td className="p-2.5 max-w-[160px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground truncate block font-mono text-[11px]">
                          {pg.url}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-[11px]">
                          {siteDomain}
                          {pg.url}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="p-2.5 font-medium text-card-foreground max-w-[180px] truncate">
                    {pg.title}
                  </td>
                  <td className="p-2.5">
                    <SeverityBadge severity={pg.status} />
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {pg.lastCrawled.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {pg.submittedDate
                      ? pg.submittedDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="p-2.5 text-muted-foreground text-[11px] max-w-[200px] truncate">
                    {pg.coverageIssue || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-[11px] text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? 'default' : 'outline'}
                  className={`h-7 w-7 p-0 text-[11px] ${p === page ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Indexed vs Not Indexed Chart */}
      <Card className="p-4">
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
          Indexed vs Not Indexed Over Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <RechartsTooltip
              contentStyle={{
                fontSize: 11,
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="indexed"
              stackId="1"
              stroke="hsl(var(--accent))"
              fill="hsl(var(--accent))"
              fillOpacity={0.3}
              name="Indexed"
            />
            <Area
              type="monotone"
              dataKey="notIndexed"
              stackId="1"
              stroke="hsl(var(--border))"
              fill="hsl(var(--muted))"
              fillOpacity={0.5}
              name="Not Indexed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
