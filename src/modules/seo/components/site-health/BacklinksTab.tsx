import { useState, useMemo } from 'react';
import {
  TrendingUp,
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
import type { BacklinkDoc, BacklinkStatus, LinkType, SiteHealthDoc } from '../../types';

const PAGE_SIZE = 25;

const ANCHOR_COLORS: Record<string, string> = {
  branded: 'hsl(var(--accent))',
  exact: '#2E75B6',
  partial: 'hsl(var(--muted-foreground))',
  generic: 'hsl(var(--border))',
};
const ANCHOR_LABELS: Record<string, string> = {
  branded: 'Branded',
  exact: 'Exact Match',
  partial: 'Partial Match',
  generic: 'Generic / Naked URL',
};

interface BacklinksTabProps {
  backlinks: BacklinkDoc[];
  siteHealth: SiteHealthDoc | null;
  onViewArticle?: (title: string) => void;
}

export function BacklinksTab({ backlinks, siteHealth, onViewArticle }: BacklinksTabProps) {
  const [blFilter, setBlFilter] = useState<'All' | BacklinkStatus>('All');
  const [blTypeFilter, setBlTypeFilter] = useState<'All' | LinkType>('All');
  const [blPage, setBlPage] = useState(1);
  const [blSort, setBlSort] = useState<'date' | 'sourceDr' | 'sourceDomain'>('date');
  const [blSortDir, setBlSortDir] = useState<'asc' | 'desc'>('desc');
  const [showAllLinked, setShowAllLinked] = useState(false);

  // Summary stats
  const summary = useMemo(() => {
    const totalBacklinks = backlinks.length;
    const newCount = backlinks.filter((b) => b.status === 'New').length;
    const domains = new Set(backlinks.map((b) => b.sourceDomain));
    const referringDomains = domains.size;
    const dofollow = backlinks.filter((b) => b.linkType === 'Dofollow').length;
    const nofollow = backlinks.filter((b) => b.linkType === 'Nofollow').length;
    const dofollowPercent = totalBacklinks > 0 ? Math.round((dofollow / totalBacklinks) * 100) : 0;
    const nofollowPercent = 100 - dofollowPercent;
    const avgDr =
      backlinks.length > 0
        ? Math.round(backlinks.reduce((sum, b) => sum + b.sourceDr, 0) / backlinks.length)
        : 0;
    return {
      totalBacklinks,
      totalChange: newCount,
      referringDomains,
      referringDomainsChange: Math.round(newCount * 0.3),
      dofollowPercent,
      nofollowPercent,
      avgDrLinkingSites: avgDr,
    };
  }, [backlinks]);

  const drQuality =
    summary.avgDrLinkingSites > 40
      ? { label: 'Good', cls: 'bg-green-500/15 text-green-600' }
      : summary.avgDrLinkingSites >= 20
        ? { label: 'Fair', cls: 'bg-warning/15 text-warning-foreground' }
        : { label: 'Low', cls: 'bg-destructive/15 text-destructive' };

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...backlinks];
    if (blFilter !== 'All') list = list.filter((b) => b.status === blFilter);
    if (blTypeFilter !== 'All') list = list.filter((b) => b.linkType === blTypeFilter);
    return list.sort((a, b) => {
      let cmp = 0;
      if (blSort === 'date') cmp = a.date.getTime() - b.date.getTime();
      else if (blSort === 'sourceDr') cmp = a.sourceDr - b.sourceDr;
      else cmp = a.sourceDomain.localeCompare(b.sourceDomain);
      return blSortDir === 'asc' ? cmp : -cmp;
    });
  }, [backlinks, blFilter, blTypeFilter, blSort, blSortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((blPage - 1) * PAGE_SIZE, blPage * PAGE_SIZE);

  const handleSort = (col: typeof blSort) => {
    if (blSort === col) setBlSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setBlSort(col);
      setBlSortDir('asc');
    }
  };

  // Referring domains chart data
  const referringDomainsChart = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((date, i) => ({
      date,
      domains: Math.max(0, summary.referringDomains - (months.length - 1 - i) * 8),
    }));
  }, [summary.referringDomains]);

  // Anchor text distribution
  const anchorTextData = useMemo(() => {
    const counts: Record<string, number> = {};
    backlinks.forEach((b) => {
      const text = b.anchorText || '(empty)';
      counts[text] = (counts[text] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([text, count]) => {
        const lower = text.toLowerCase();
        let category = 'generic';
        if (lower.includes('elite') || lower.includes('eth') || lower.includes('travel'))
          category = 'branded';
        else if (lower.includes('best') || lower.includes('guide') || lower.includes('how'))
          category = 'exact';
        else if (lower.includes('click') || lower.includes('here') || lower.includes('http'))
          category = 'generic';
        else category = 'partial';
        return { text, count, category };
      });
  }, [backlinks]);

  // Top linked pages
  const topLinkedPages = useMemo(() => {
    const pageMap: Record<
      string,
      { url: string; title: string; totalBacklinks: number; referringDomains: Set<string>; topAnchor: string }
    > = {};
    backlinks.forEach((b) => {
      if (!pageMap[b.targetPage]) {
        pageMap[b.targetPage] = {
          url: b.targetPage,
          title: b.targetPage.split('/').filter(Boolean).pop() || b.targetPage,
          totalBacklinks: 0,
          referringDomains: new Set(),
          topAnchor: b.anchorText,
        };
      }
      pageMap[b.targetPage].totalBacklinks++;
      pageMap[b.targetPage].referringDomains.add(b.sourceDomain);
    });
    return Object.values(pageMap)
      .map((p) => ({
        ...p,
        referringDomains: p.referringDomains.size,
      }))
      .sort((a, b) => b.totalBacklinks - a.totalBacklinks);
  }, [backlinks]);

  const linkedPages = showAllLinked ? topLinkedPages : topLinkedPages.slice(0, 5);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Total Backlinks
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-card-foreground">
              {summary.totalBacklinks.toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-green-600 font-medium">
              <TrendingUp className="w-3 h-3" />+{summary.totalChange}
            </span>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Referring Domains
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-card-foreground">
              {summary.referringDomains}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-green-600 font-medium">
              <TrendingUp className="w-3 h-3" />+{summary.referringDomainsChange}
            </span>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Dofollow / Nofollow
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-medium text-card-foreground">
              {summary.dofollowPercent}% dofollow · {summary.nofollowPercent}% nofollow
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-accent rounded-l-full"
              style={{ width: `${summary.dofollowPercent}%` }}
            />
            <div
              className="h-full bg-muted-foreground/30 rounded-r-full"
              style={{ width: `${summary.nofollowPercent}%` }}
            />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Avg DR of Linking Sites
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-card-foreground">
              {summary.avgDrLinkingSites}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${drQuality.cls}`}>
              {drQuality.label}
            </span>
          </div>
        </Card>
      </div>

      {/* New & Lost Backlinks Table */}
      <div className="space-y-2">
        <h3 className="text-[13px] font-semibold text-card-foreground">New & Lost Backlinks</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={blFilter}
            onChange={(e) => {
              setBlFilter(e.target.value as any);
              setBlPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
          >
            <option value="All">All</option>
            <option value="New">New</option>
            <option value="Lost">Lost</option>
          </select>
          <select
            value={blTypeFilter}
            onChange={(e) => {
              setBlTypeFilter(e.target.value as any);
              setBlPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
          >
            <option value="All">All Types</option>
            <option value="Dofollow">Dofollow</option>
            <option value="Nofollow">Nofollow</option>
          </select>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-2.5 text-left font-medium text-muted-foreground">Status</th>
                  <th
                    className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                    onClick={() => handleSort('sourceDomain')}
                  >
                    Source{' '}
                    {blSort === 'sourceDomain' && (blSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                    onClick={() => handleSort('sourceDr')}
                  >
                    DR {blSort === 'sourceDr' && (blSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2.5 text-left font-medium text-muted-foreground">Target Page</th>
                  <th className="p-2.5 text-left font-medium text-muted-foreground">Anchor Text</th>
                  <th className="p-2.5 text-left font-medium text-muted-foreground">Type</th>
                  <th
                    className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                    onClick={() => handleSort('date')}
                  >
                    Date {blSort === 'date' && (blSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((bl) => (
                  <tr
                    key={bl.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-2.5">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          bl.status === 'New'
                            ? 'bg-green-500/15 text-green-600'
                            : 'bg-destructive/15 text-destructive'
                        }`}
                      >
                        {bl.status}
                      </span>
                    </td>
                    <td className="p-2.5 max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={bl.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline truncate block"
                          >
                            {bl.sourceDomain}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-[11px] max-w-xs break-all">{bl.sourceUrl}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            bl.sourceDr > 60
                              ? 'bg-green-500'
                              : bl.sourceDr > 30
                                ? 'bg-warning'
                                : 'bg-destructive'
                          }`}
                        />
                        <span className="text-card-foreground">{bl.sourceDr}</span>
                      </div>
                    </td>
                    <td className="p-2.5 max-w-[140px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground hover:text-accent truncate block font-mono text-[11px]">
                            {bl.targetPage}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-[11px]">{bl.targetPage}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-2.5 max-w-[140px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-card-foreground truncate block">
                            {bl.anchorText}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-[11px]">{bl.anchorText}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          bl.linkType === 'Dofollow'
                            ? 'bg-accent/15 text-accent'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {bl.linkType}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      {bl.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                Showing {(blPage - 1) * PAGE_SIZE + 1}–
                {Math.min(blPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={blPage <= 1}
                  onClick={() => setBlPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={blPage >= totalPages}
                  onClick={() => setBlPage((p) => p + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Referring Domains Chart */}
        <Card className="p-4">
          <h3 className="text-[13px] font-semibold text-card-foreground mb-3">
            Referring Domains Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={referringDomainsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
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
                dataKey="domains"
                fill="hsl(var(--accent) / 0.15)"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                name="Referring Domains"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Anchor Text Distribution */}
        <Card className="p-4">
          <h3 className="text-[13px] font-semibold text-card-foreground mb-3">
            Anchor Text Distribution
          </h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {anchorTextData.map((a, i) => {
              const maxCount = anchorTextData[0]?.count || 1;
              return (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="text-card-foreground truncate w-40 shrink-0"
                    title={a.text}
                  >
                    {a.text}
                  </span>
                  <div className="flex-1 h-3.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(a.count / maxCount) * 100}%`,
                        backgroundColor: ANCHOR_COLORS[a.category],
                      }}
                    />
                  </div>
                  <span className="text-muted-foreground w-8 text-right shrink-0">{a.count}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border flex-wrap">
            {Object.entries(ANCHOR_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: ANCHOR_COLORS[key] }}
                />
                {label}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Linked Pages */}
      <div className="space-y-2">
        <h3 className="text-[13px] font-semibold text-card-foreground">Top Linked Pages</h3>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-2.5 text-left font-medium text-muted-foreground">Page Title</th>
                  <th className="p-2.5 text-left font-medium text-muted-foreground">URL</th>
                  <th className="p-2.5 text-right font-medium text-muted-foreground">Backlinks</th>
                  <th className="p-2.5 text-right font-medium text-muted-foreground">
                    Ref. Domains
                  </th>
                  <th className="p-2.5 text-left font-medium text-muted-foreground">Top Anchor</th>
                  <th className="p-2.5 text-right font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {linkedPages.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-2.5 font-medium text-card-foreground max-w-[200px] truncate">
                      {p.title}
                    </td>
                    <td className="p-2.5 text-muted-foreground font-mono text-[11px] max-w-[140px] truncate">
                      {p.url}
                    </td>
                    <td className="p-2.5 text-right font-semibold text-card-foreground">
                      {p.totalBacklinks}
                    </td>
                    <td className="p-2.5 text-right text-card-foreground">{p.referringDomains}</td>
                    <td className="p-2.5 text-muted-foreground max-w-[140px] truncate">
                      {p.topAnchor}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        className="text-[11px] text-accent hover:underline font-medium"
                        onClick={() => onViewArticle?.(p.title)}
                      >
                        View Article
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {topLinkedPages.length > 5 && (
            <div className="px-4 py-2 border-t border-border">
              <button
                onClick={() => setShowAllLinked(!showAllLinked)}
                className="text-[11px] text-accent hover:underline"
              >
                {showAllLinked ? 'Show Less' : `Show All (${topLinkedPages.length})`}
              </button>
            </div>
          )}
        </Card>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Backlink data from DataForSEO · Updated daily
      </p>
    </div>
  );
}
