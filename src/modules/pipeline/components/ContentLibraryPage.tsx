import { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Download, RefreshCw, Search, Check, AlertTriangle, Eye,
  TrendingUp, TrendingDown, Minus, X, Sparkles, Undo2, CalendarIcon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DataTablePagination, usePagination } from '@/components/shared/DataTablePagination';
import { useArticles } from '../hooks/useArticles';
import { useRefreshQueue } from '../hooks/useRefreshQueue';
import { useArticleMutations } from '../hooks/useArticleMutations';
import { useArticleDetailContext } from '../context/ArticleDetailContext';
import { RefreshArticleModal } from './RefreshArticleModal';
import { QualityScoreRing } from './shared/KanbanCard';

type HealthStatus = 'Healthy' | 'Monitor' | 'Needs Attention';

// Compute health from article data
function computeHealth(article: { qualityScore: number; updatedAt: Date }): HealthStatus {
  if (article.qualityScore >= 80) return 'Healthy';
  if (article.qualityScore >= 60) return 'Monitor';
  return 'Needs Attention';
}

function getContentAge(updatedAt: Date): number {
  return Math.floor((Date.now() - updatedAt.getTime()) / 86400000);
}

function ageColor(days: number) {
  if (days < 90) return 'text-success';
  if (days < 180) return 'text-warning-foreground';
  return 'text-destructive';
}

function posColor(p: number | null) {
  if (p === null) return 'text-muted-foreground';
  if (p <= 10) return 'text-success';
  if (p <= 20) return 'text-warning-foreground';
  return 'text-destructive';
}

const HEALTH_STYLES: Record<HealthStatus, { bg: string; icon: typeof Check; tooltip: string }> = {
  'Healthy': { bg: 'bg-success', icon: Check, tooltip: 'Healthy — No issues detected' },
  'Monitor': { bg: 'bg-warning', icon: Eye, tooltip: 'Monitor — Minor issues to watch' },
  'Needs Attention': { bg: 'bg-destructive', icon: AlertTriangle, tooltip: 'Needs Attention — Action required' },
};

export function ContentLibraryPage() {
  const { articles, loading, error } = useArticles();
  const { refreshItems } = useRefreshQueue();
  const { addToRefreshQueue } = useArticleMutations();
  const { openPanel } = useArticleDetailContext();
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [clusterFilter, setClusterFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [refreshedFilter, setRefreshedFilter] = useState('all');
  const [publishedStart, setPublishedStart] = useState<Date | undefined>(undefined);
  const [publishedEnd, setPublishedEnd] = useState<Date | undefined>(undefined);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState<string | null>(null);
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [refreshArticleId, setRefreshArticleId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Only published articles in content library
  const publishedArticles = useMemo(() => articles.filter(a => a.status === 'Published'), [articles]);

  const clusters = Array.from(new Set(publishedArticles.map(a => a.topicCluster).filter(Boolean)));
  const authors = Array.from(new Set(publishedArticles.map(a => a.assignee.name)));

  const filtered = useMemo(() => {
    let rows = publishedArticles.map(a => ({
      ...a,
      health: computeHealth(a),
      position: a.refreshMeta?.currentPosition ?? null,
      positionTrend: ((a.monitoringData?.positionTrend as 'up' | 'down' | 'stable') ?? 'stable'),
      traffic: a.refreshMeta?.traffic ?? 0,
      trafficTrend: (a.refreshMeta?.trafficTrend as 'up' | 'down' | 'stable') || 'stable',
      seoScore: a.refreshMeta?.seoScore ?? a.qualityScore,
      topIssue: null as string | null,
      lastRefreshed: a.lastRefreshed ?? a.refreshMeta?.lastRefreshed ?? null,
    }));

    if (search) rows = rows.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.targetKeyword.toLowerCase().includes(search.toLowerCase()));
    if (healthFilter !== 'all') rows = rows.filter(r => r.health === healthFilter);
    if (clusterFilter !== 'all') rows = rows.filter(r => r.topicCluster === clusterFilter);
    if (authorFilter !== 'all') rows = rows.filter(r => r.assignee.name === authorFilter);
    if (positionFilter === 'page1') rows = rows.filter(r => r.position !== null && r.position <= 10);
    else if (positionFilter === 'page2') rows = rows.filter(r => r.position !== null && r.position > 10 && r.position <= 20);
    else if (positionFilter === 'page3') rows = rows.filter(r => r.position !== null && r.position > 20);
    else if (positionFilter === 'none') rows = rows.filter(r => r.position === null);
    if (refreshedFilter === 'never') rows = rows.filter(r => !r.lastRefreshed);
    else if (refreshedFilter === '90') rows = rows.filter(r => !r.lastRefreshed || getContentAge(r.lastRefreshed) > 90);
    if (publishedStart) rows = rows.filter(r => r.createdAt >= publishedStart);
    if (publishedEnd) rows = rows.filter(r => r.createdAt <= publishedEnd);

    rows.sort((a, b) => {
      const hOrder: Record<HealthStatus, number> = { 'Needs Attention': 0, 'Monitor': 1, 'Healthy': 2 };
      const hDiff = hOrder[a.health] - hOrder[b.health];
      if (hDiff !== 0) return hDiff;
      return getContentAge(b.updatedAt) - getContentAge(a.updatedAt);
    });
    return rows;
  }, [publishedArticles, search, healthFilter, clusterFilter, authorFilter, positionFilter, refreshedFilter, publishedStart, publishedEnd]);

  const { page, perPage, setPage, setPerPage, paged } = usePagination(filtered);

  const refreshArticle = refreshArticleId ? filtered.find(a => a.id === refreshArticleId) || null : null;

  const openRefresh = (id: string) => {
    setRefreshArticleId(id);
    setRefreshModalOpen(true);
  };

  const clearPublishedFilter = () => {
    setPublishedStart(undefined);
    setPublishedEnd(undefined);
  };

  const healthy = filtered.filter(a => a.health === 'Healthy').length;
  const monitor = filtered.filter(a => a.health === 'Monitor').length;
  const attention = filtered.filter(a => a.health === 'Needs Attention').length;
  const total = filtered.length;

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const exportCsv = (rows: typeof filtered) => {
    if (rows.length === 0) { toast.error('Nothing to export'); return; }
    const header = 'Title,Keyword,Published,Last Refreshed,Age (days),Position,Trend,Traffic,SEO Score,Health,Cluster,Author,URL';
    const lines = rows.map(r => [
      `"${r.title.replace(/"/g, '""')}"`,
      `"${(r.targetKeyword || '').replace(/"/g, '""')}"`,
      r.createdAt.toISOString().slice(0, 10),
      r.lastRefreshed ? r.lastRefreshed.toISOString().slice(0, 10) : 'Never',
      getContentAge(r.updatedAt),
      r.position ?? '',
      r.positionTrend,
      r.traffic,
      r.seoScore,
      r.health,
      `"${(r.topicCluster || '').replace(/"/g, '""')}"`,
      `"${r.assignee.name.replace(/"/g, '""')}"`,
      r.publishedUrl ?? '',
    ].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `content-library-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} articles to CSV`);
  };

  const handleBulkRefresh = async () => {
    const rows = filtered.filter(r => selected.has(r.id));
    if (rows.length === 0) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(rows.map(r => addToRefreshQueue({
      articleId: r.id,
      title: r.title,
      refreshReason: 'Manual',
      priority: 'Medium',
      keyword: r.targetKeyword,
    })));
    setBulkBusy(false);
    setSelected(new Set());
    const failed = results.filter(x => x.status === 'rejected').length;
    if (failed === 0) toast.success(`${rows.length} articles added to the refresh queue`);
    else toast.warning('Partially completed', { description: `${rows.length - failed} added, ${failed} failed.` });
  };

  const handleAnalyze = (id: string) => {
    setAnalyzingId(id);
    setAnalyzeOpen(id);
    setAnalyzingId(null);
  };

  // Deterministic per-article recommendations from real fields — replaces the
  // previous hardcoded trio behind a fake 1.2s delay.
  const buildRecommendations = (a: (typeof filtered)[number]) => {
    const recs: Array<{ category: string; icon: string; text: string; impact: 'High' | 'Medium' | 'Low' }> = [];
    const age = getContentAge(a.lastRefreshed ?? a.createdAt);
    if (age > 180) recs.push({ category: 'Freshness', icon: '📅', text: `Content is ${age} days old — update data points and republish.`, impact: 'High' });
    else if (age > 90) recs.push({ category: 'Freshness', icon: '📅', text: `Last touched ${age} days ago — review for stale details.`, impact: 'Medium' });
    if (a.position === null) recs.push({ category: 'SEO', icon: '🔍', text: 'Not ranking for the target keyword — review on-page SEO and internal links.', impact: 'High' });
    else if (a.position > 10) recs.push({ category: 'SEO', icon: '🔍', text: `Position #${a.position} — striking distance; strengthen the keyword focus to reach page 1.`, impact: 'High' });
    if ((a.seoScore ?? 0) < 70) recs.push({ category: 'Quality', icon: '📝', text: `SEO score ${a.seoScore} — run the SEO checklist in the article panel.`, impact: 'Medium' });
    if (a.positionTrend === 'down') recs.push({ category: 'Ranking', icon: '📉', text: 'Position trending down — flag for refresh before it slips further.', impact: 'High' });
    if (recs.length === 0) recs.push({ category: 'Healthy', icon: '✅', text: 'No issues detected — article is performing well.', impact: 'Low' });
    return recs;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-sm text-destructive">Failed to load content library</p>
        <Button variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight text-foreground">Content Library</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Every published article — monitor health, track rankings, and identify refresh opportunities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}><Download className="w-4 h-4 mr-1" /> Export Library</Button>
          <Button onClick={() => { setRefreshArticleId(null); setRefreshModalOpen(true); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Article
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">Total Published</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{total}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">Average SEO Score</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{total ? Math.round(filtered.reduce((s, a) => s + a.seoScore, 0) / total) : 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">Articles on Page 1</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{filtered.filter(a => a.position !== null && a.position <= 10).length}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">{total ? Math.round((filtered.filter(a => a.position !== null && a.position <= 10).length / total) * 100) : 0}% of total</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">Needing Refresh</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{attention}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">Refreshed This Month</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{filtered.filter(a => a.lastRefreshed && (Date.now() - a.lastRefreshed.getTime()) < 30 * 86400000).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Overview Bar */}
      {total > 0 && (
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card">
          <h3 className="text-[14px] font-semibold text-foreground mb-3">Health Overview</h3>
          <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden">
            {healthy > 0 && (
              <button onClick={() => setHealthFilter(healthFilter === 'Healthy' ? 'all' : 'Healthy')} className={`h-full bg-success/80 hover:bg-success transition-colors flex items-center justify-center text-white text-xs font-semibold ${healthFilter === 'Healthy' ? 'ring-2 ring-success ring-offset-1' : ''}`} style={{ width: `${(healthy / total) * 100}%` }}>
                {healthy} Healthy
              </button>
            )}
            {monitor > 0 && (
              <button onClick={() => setHealthFilter(healthFilter === 'Monitor' ? 'all' : 'Monitor')} className={`h-full bg-warning/80 hover:bg-warning transition-colors flex items-center justify-center text-white text-xs font-semibold ${healthFilter === 'Monitor' ? 'ring-2 ring-warning ring-offset-1' : ''}`} style={{ width: `${(monitor / total) * 100}%` }}>
                {monitor} Monitor
              </button>
            )}
            {attention > 0 && (
              <button onClick={() => setHealthFilter(healthFilter === 'Needs Attention' ? 'all' : 'Needs Attention')} className={`h-full bg-destructive/80 hover:bg-destructive transition-colors flex items-center justify-center text-white text-xs font-semibold ${healthFilter === 'Needs Attention' ? 'ring-2 ring-destructive ring-offset-1' : ''}`} style={{ width: `${(attention / total) * 100}%` }}>
                {attention} Attention
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Health</label>
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Healthy">🟢 Healthy</SelectItem>
              <SelectItem value="Monitor">🟡 Monitor</SelectItem>
              <SelectItem value="Needs Attention">🔴 Attention</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Cluster</label>
          <Select value={clusterFilter} onValueChange={setClusterFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {clusters.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Author</label>
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {authors.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Published</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-44 h-8 justify-start text-left text-xs font-normal", !publishedStart && !publishedEnd && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                {publishedStart && publishedEnd
                  ? `${format(publishedStart, 'MMM d')} – ${format(publishedEnd, 'MMM d')}`
                  : publishedStart
                  ? `From ${format(publishedStart, 'MMM d')}`
                  : 'All dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Start</p>
                    <Calendar mode="single" selected={publishedStart} onSelect={setPublishedStart} className="p-2 pointer-events-auto" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">End</p>
                    <Calendar mode="single" selected={publishedEnd} onSelect={setPublishedEnd} className="p-2 pointer-events-auto" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={clearPublishedFilter}>Clear</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Position</label>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="page1">Page 1</SelectItem>
              <SelectItem value="page2">Page 2</SelectItem>
              <SelectItem value="page3">Page 3+</SelectItem>
              <SelectItem value="none">Not Ranking</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Last Refreshed</label>
          <Select value={refreshedFilter} onValueChange={setRefreshedFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="never">Never Refreshed</SelectItem>
              <SelectItem value="90">90+ days ago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-40 text-xs" />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 bg-card border border-border/70 rounded-xl p-3 flex items-center gap-3 shadow-raised z-10 animate-fade-up">
          <span className="text-sm font-semibold text-foreground">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="text-accent border-accent" disabled={bulkBusy} onClick={handleBulkRefresh}>
            {bulkBusy ? 'Adding…' : 'Bulk Refresh'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportCsv(filtered.filter(r => selected.has(r.id)))}>Export CSV</Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>
      )}

      {/* Table */}
      <div ref={tableRef} className="bg-card rounded-xl border border-border/70 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 w-8"><input type="checkbox" className="rounded" onChange={() => { setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(a => a.id))); }} /></th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium min-w-[200px]">Article</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Published</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Last Refreshed</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Age</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Keyword</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pos</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Trend</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Traffic</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">SEO</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-[60px]">Health</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Top Issue</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(a => {
                const age = getContentAge(a.updatedAt);
                const hStyle = HEALTH_STYLES[a.health];
                const Icon = hStyle.icon;
                const inRefreshQueue = refreshItems.some(r => r.id === a.id || r.title === a.title);
                return (
                  <tr key={a.id} className="border-b border-border/70 hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} className="rounded" /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openPanel(a.id, inRefreshQueue)} className="text-xs font-semibold text-foreground hover:text-accent text-left">{a.title}</button>
                        {a.redirects && a.redirects.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="shrink-0 text-muted-foreground hover:text-accent transition-colors" title={`${a.redirects.length} redirect(s) point to this article`}>
                                <Undo2 className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3" align="start">
                              <p className="text-[11px] font-semibold text-foreground mb-2">{a.redirects.length} redirect{a.redirects.length > 1 ? 's' : ''} point here</p>
                              <table className="w-full text-[10px]">
                                <thead><tr className="text-muted-foreground border-b border-border"><th className="text-left py-1 font-medium">Old URL</th><th className="text-right py-1 font-medium">Created</th></tr></thead>
                                <tbody>
                                  {a.redirects.map((rd, ri) => (
                                    <tr key={ri} className="border-b border-border/50">
                                      <td className="py-1 font-mono text-foreground">{rd.oldUrl}</td>
                                      <td className="py-1 text-right text-muted-foreground">{rd.created}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      {a.format && <Badge variant="outline" className="text-[9px] mt-1 block w-fit">{a.format}</Badge>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className={`px-3 py-2.5 text-xs ${!a.lastRefreshed ? 'text-muted-foreground italic' : age > 180 ? 'text-destructive' : age > 90 ? 'text-warning-foreground' : 'text-foreground'}`}>
                      {a.lastRefreshed ? a.lastRefreshed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                    </td>
                    <td className={`px-3 py-2.5 text-xs font-medium tabular-nums ${ageColor(age)}`}>{age}d</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.targetKeyword}</td>
                    <td className={`px-3 py-2.5 text-xs font-semibold tabular-nums ${posColor(a.position)}`}>{a.position ? `#${a.position}` : '—'}</td>
                    <td className="px-3 py-2.5">
                      {a.positionTrend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-success/80" />}
                      {a.positionTrend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-destructive/80" />}
                      {a.positionTrend === 'stable' && <Minus className="w-3.5 h-3.5 text-muted-foreground/60" />}
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{a.traffic.toLocaleString()}</td>
                    <td className="px-3 py-2.5"><QualityScoreRing score={a.seoScore} size={28} /></td>
                    <td className="px-3 py-2.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`w-6 h-6 rounded-full ${hStyle.bg} flex items-center justify-center`}>
                              <Icon className="w-3 h-3 text-white" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">{hStyle.tooltip}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.topIssue || '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openRefresh(a.id)} className="inline-flex items-center px-3 py-0.5 rounded-full border border-accent/40 text-accent text-[12px] font-medium hover:bg-accent/10 hover:border-accent/60 transition-colors">Refresh</button>
                        <Popover open={analyzeOpen === a.id} onOpenChange={o => { if (!o) setAnalyzeOpen(null); }}>
                          <PopoverTrigger asChild>
                            <button onClick={() => handleAnalyze(a.id)} disabled={analyzingId === a.id} className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50" title="AI Analyze">
                              {analyzingId === a.id ? <RefreshCw className="w-4 h-4 text-accent animate-spin" /> : <Sparkles className="w-4 h-4 text-muted-foreground" />}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="end">
                            <p className="text-sm font-semibold text-foreground mb-2">AI Recommendations for {a.title}</p>
                            <div className="space-y-2">
                              {buildRecommendations(a).map((rec, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className="text-xs mt-0.5">{rec.icon}</span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-medium text-foreground">{rec.category}</span>
                                      <Badge variant={rec.impact === 'High' ? 'danger' : rec.impact === 'Medium' ? 'warning' : 'success'} className="text-[9px] px-1.5 py-0">{rec.impact}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{rec.text}</p>
                                  </div>
                                </div>
                              ))}
                              {a.refreshMeta && (
                                <p className="text-xs text-muted-foreground">This article is already tracked in the refresh queue — open it for full AI recommendations.</p>
                              )}
                            </div>
                            <Separator className="my-2" />
                            <Button size="sm" className="w-full text-xs h-7" onClick={() => {
                              setAnalyzeOpen(null);
                              openRefresh(a.id);
                            }}>
                              <RefreshCw className="w-3 h-3 mr-1" /> Continue to Refresh...
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-3">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">No published articles found</p>
            <p className="text-[12px] text-muted-foreground mt-1">Try adjusting your filters or search.</p>
          </div>
        )}
        <DataTablePagination
          totalItems={filtered.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          scrollRef={tableRef}
        />
      </div>

      <RefreshArticleModal
        open={refreshModalOpen}
        onClose={() => { setRefreshModalOpen(false); setRefreshArticleId(null); }}
        onSubmit={async (data) => {
          try {
            await addToRefreshQueue({
              articleId: refreshArticleId || undefined,
              title: data.title,
              refreshReason: data.refreshReason,
              priority: data.priority,
              assignedTo: data.assignedTo,
              keyword: data.keyword,
              refreshScope: data.refreshScope,
              sourceUrls: data.sourceUrls,
              editorialDirection: data.editorialDirection,
              targetPosition: data.targetPosition,
            });
            toast.success('Added to refresh queue', { description: `"${data.title}" is now in the refresh queue.` });
          } catch {
            // error toast handled in useArticleMutations
          }
          setRefreshModalOpen(false);
          setRefreshArticleId(null);
        }}
        article={refreshArticle ? {
          title: refreshArticle.title,
          keyword: refreshArticle.targetKeyword,
          position: refreshArticle.position || undefined,
          traffic: refreshArticle.traffic,
          seoScore: refreshArticle.seoScore,
        } : undefined}
      />
    </div>
  );
}
