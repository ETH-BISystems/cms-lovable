import { useState, useMemo } from 'react';
import {
  RefreshCw, Clock, TrendingUp, TrendingDown, Minus, Check, Search,
  KanbanSquare, List, ArrowUpDown, X, AlertTriangle, Eye, Pencil,
  SlidersHorizontal, LinkIcon, Undo2, ShieldCheck
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { callUpdateRefreshItemStatus } from '../services/articleService';
import { toast } from 'sonner';
import { useRefreshQueue } from '../hooks/useRefreshQueue';
import { useArticleDetailContext } from '../context/ArticleDetailContext';
import { useLinkSuggestions } from '../hooks/useLinkSuggestions';
import { QualityScoreRing, TimeAgo } from './shared/KanbanCard';
import type { RefreshQueueItem, RefreshStatus, Priority, RefreshReasonType } from '../types';

const REFRESH_COLUMNS: { status: RefreshStatus; label: string; color: string }[] = [
  { status: 'Needs Refresh', label: 'Needs Refresh', color: '#C44536' },
  { status: 'Researching', label: 'Researching', color: '#0093A7' },
  { status: 'Rewriting', label: 'Rewriting', color: '#1C596D' },
  { status: 'In Review', label: 'In Review', color: '#CF8158' },
  { status: 'Approved', label: 'Approved', color: '#2E75B6' },
  { status: 'Re-Published', label: 'Re-Published', color: '#1a7a3a' },
];

const REASON_STYLES: Record<string, string> = {
  'AI Overview': 'bg-accent/15 text-accent',
  'Traffic Decay': 'bg-warning/15 text-warning-foreground',
  'Ranking Drop': 'bg-destructive/15 text-destructive',
  'SEO Audit': 'bg-[hsl(213,59%,45%)]/15 text-[hsl(213,59%,45%)]',
  'Low-Hanging Fruit': 'bg-success/15 text-success',
  'Stale Card Data': 'bg-muted text-muted-foreground',
  'Age': 'bg-muted text-muted-foreground',
  'Manual': 'bg-muted text-muted-foreground',
};

// Assignee options are derived from the live queue items (see component)
const PRIORITIES = ['All', 'High', 'Medium', 'Low'] as const;
const REASONS: (RefreshReasonType | 'All')[] = ['All', 'AI Overview', 'Traffic Decay', 'Ranking Drop', 'SEO Audit', 'Low-Hanging Fruit', 'Stale Card Data', 'Age', 'Manual'];
const DATE_RANGES = ['All', 'Last 7 days', 'Last 30 days', 'Last 60 days', 'Last 90 days', 'Custom'] as const;
const BLOCKED_OPTIONS = ['All', 'Has Blockers', 'No Blockers'] as const;

// === Refresh Kanban Card ===
function RefreshCard({ item, onClick }: { item: RefreshQueueItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/refresh-item-id', item.id)}
      className="bg-card rounded-lg border border-border/70 p-3 cursor-grab active:cursor-grabbing shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ease-out relative"
    >
      {item.blockedTask && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="absolute top-2 right-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-[11px]">1 blocked task(s)</p>
          </TooltipContent>
        </Tooltip>
      )}
      <p className="text-[12px] font-semibold text-card-foreground line-clamp-2 leading-snug">{item.title}</p>
      <div className="mt-1.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${REASON_STYLES[item.refreshReason] || 'bg-muted text-muted-foreground'}`}>
          {item.refreshReason}
        </span>
      </div>
      {item.position && (
        <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
          <span className="font-semibold text-foreground/80">#{item.position}</span> → targeting <span className="font-semibold text-accent">#{item.targetPosition}</span>
        </p>
      )}
      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
        {item.traffic.toLocaleString()}/mo {item.trafficTrend === 'down' ? '↓' : item.trafficTrend === 'up' ? '↑' : '→'}
      </p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <StatusBadge status={item.priority} className="text-[10px] px-2 py-0" />
        <span className="text-[10px] text-muted-foreground tabular-nums">{item.daysInQueue}d in queue</span>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
        <div className="flex items-center gap-1.5">
          {item.assignedTo && (
            <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[8px] font-medium">
              {item.assignedTo.split(' ').map(w => w[0]).join('')}
            </div>
          )}
          <span className="text-[10px] text-muted-foreground truncate">{item.keyword}</span>
        </div>
        <QualityScoreRing score={item.seoScore} size={28} />
      </div>
    </div>
  );
}

// === Refresh Kanban Column ===
function RefreshKanbanColumn({ col, items, onClick, onDropItem }: {
  col: typeof REFRESH_COLUMNS[number];
  items: RefreshQueueItem[];
  onClick: (item: RefreshQueueItem) => void;
  onDropItem?: (itemId: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const visible = expanded ? items : items.slice(0, 5);
  const hidden = items.length - 5;

  return (
    <div
      className={`flex-shrink-0 w-[280px] flex flex-col bg-muted/40 rounded-xl ${dragOver ? 'ring-2 ring-accent/60' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData('text/refresh-item-id');
        if (id) onDropItem?.(id, col.status);
      }}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
          {col.label}
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground bg-card border border-border/70 rounded-full px-2 py-0.5 tabular-nums shadow-card">{items.length}</span>
      </div>
      <div className="space-y-2 px-2 pb-2">
        {visible.map(item => <RefreshCard key={item.id} item={item} onClick={() => onClick(item)} />)}
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-6 animate-fade-in">
            <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] text-muted-foreground">No articles</span>
          </div>
        )}
        {hidden > 0 && (
          <button onClick={() => setExpanded(p => !p)} className="w-full text-center py-2 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors">
            {expanded ? 'Show less' : `+ ${hidden} more`}
          </button>
        )}
      </div>
    </div>
  );
}

// === Refresh List View ===
function RefreshListView({ items, onRowClick }: { items: RefreshQueueItem[]; onRowClick: (item: RefreshQueueItem) => void }) {
  const [sortKey, setSortKey] = useState<string>('daysInQueue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let v = 0;
      if (sortKey === 'title') v = a.title.localeCompare(b.title);
      else if (sortKey === 'status') v = a.status.localeCompare(b.status);
      else if (sortKey === 'reason') v = a.refreshReason.localeCompare(b.refreshReason);
      else if (sortKey === 'keyword') v = (a.keyword || '').localeCompare(b.keyword || '');
      else if (sortKey === 'priority') v = (['High', 'Medium', 'Low'].indexOf(a.priority)) - (['High', 'Medium', 'Low'].indexOf(b.priority));
      else if (sortKey === 'position') v = (a.position ?? 999) - (b.position ?? 999);
      else if (sortKey === 'target') v = (a.targetPosition ?? 999) - (b.targetPosition ?? 999);
      else if (sortKey === 'traffic') v = a.traffic - b.traffic;
      else if (sortKey === 'trend') { const tMap = { up: 1, stable: 0, down: -1 } as Record<string, number>; v = (tMap[a.trafficTrend] ?? 0) - (tMap[b.trafficTrend] ?? 0); }
      else if (sortKey === 'seoScore') v = a.seoScore - b.seoScore;
      else if (sortKey === 'blocked') v = (a.blockedTask ? 0 : 1) - (b.blockedTask ? 0 : 1);
      else if (sortKey === 'daysInQueue') v = a.daysInQueue - b.daysInQueue;
      else if (sortKey === 'assigned') v = (a.assignedTo || '').localeCompare(b.assignedTo || '');
      return sortDir === 'desc' ? -v : v;
    });
  }, [items, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ label, k }: { label: string; k: string }) => (
    <button onClick={() => handleSort(k)} className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground hover:text-foreground transition-colors">
      {label}
      {sortKey === k && <ArrowUpDown className="w-3 h-3" />}
    </button>
  );

  return (
    <div className="bg-card rounded-xl border border-border/70 shadow-card overflow-hidden">
      <div className="grid grid-cols-[1fr_90px_100px_80px_60px_60px_60px_60px_50px_60px_50px_60px_70px] items-center px-3 py-2 border-b border-border bg-muted/40 gap-2">
        <SortHeader label="Article" k="title" />
        <SortHeader label="Status" k="status" />
        <SortHeader label="Reason" k="reason" />
        <SortHeader label="Keyword" k="keyword" />
        <SortHeader label="Priority" k="priority" />
        <SortHeader label="Pos" k="position" />
        <SortHeader label="Target" k="target" />
        <SortHeader label="Traffic" k="traffic" />
        <SortHeader label="Trend" k="trend" />
        <SortHeader label="SEO" k="seoScore" />
        <SortHeader label="Blocked" k="blocked" />
        <SortHeader label="Days" k="daysInQueue" />
        <SortHeader label="Assigned" k="assigned" />
      </div>
      <div className="divide-y divide-border max-h-[calc(100vh-480px)] overflow-y-auto scrollbar-thin">
        {sorted.map(item => (
          <div key={item.id} onClick={() => onRowClick(item)} className="grid grid-cols-[1fr_90px_100px_80px_60px_60px_60px_60px_50px_60px_50px_60px_70px] items-center px-3 py-2.5 gap-2 hover:bg-muted/40 transition-colors cursor-pointer">
            <p className="text-[12px] font-semibold text-card-foreground truncate">{item.title}</p>
            <StatusBadge status={item.status} className="text-[9px] px-2 py-0 w-fit" />
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium w-fit ${REASON_STYLES[item.refreshReason] || 'bg-muted text-muted-foreground'}`}>{item.refreshReason}</span>
            <span className="text-[10px] text-muted-foreground truncate">{item.keyword}</span>
            <StatusBadge status={item.priority} className="text-[10px] px-2 py-0 w-fit" />
            <span className="text-[11px] font-medium tabular-nums">{item.position ? `#${item.position}` : '—'}</span>
            <span className="text-[11px] text-accent tabular-nums">{item.targetPosition ? `#${item.targetPosition}` : '—'}</span>
            <span className="text-[11px] tabular-nums">{item.traffic.toLocaleString()}</span>
            <span>
              {item.trafficTrend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-success" />}
              {item.trafficTrend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
              {item.trafficTrend === 'stable' && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
            </span>
            <QualityScoreRing score={item.seoScore} size={24} />
            {item.blockedTask ? (
              <button onClick={e => { e.stopPropagation(); onRowClick(item); }} className="text-[10px] font-medium text-destructive hover:underline text-left">⚠ 1</button>
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
            <span className="text-[11px] font-medium tabular-nums">{item.daysInQueue}d</span>
            <span className="text-[10px] text-muted-foreground truncate">{item.assignedTo || '—'}</span>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center py-12 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-2">
              <RefreshCw className="w-4 h-4" />
            </div>
            <p className="text-[14px] font-medium text-foreground">No items in refresh queue</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Articles flagged for refresh will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}


// === Tabbed Link Suggestions ===
type LinkTab = 'Pending' | 'Approved' | 'Rejected';

function TabbedLinkSuggestions() {
  const {
    suggestions, approve, reject, undo, bulkApprove, bulkReject,
    updateAnchor, verifySingle, verifyAll, verifying, counts,
  } = useLinkSuggestions();
  const [activeTab, setActiveTab] = useState<LinkTab>('Pending');
  const [filterSource, setFilterSource] = useState('All');
  const [filterPillar, setFilterPillar] = useState('All');
  const [filterLinkStatus, setFilterLinkStatus] = useState('All');
  const [minRelevance, setMinRelevance] = useState(0);
  const [sortCol, setSortCol] = useState('relevance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editId, setEditId] = useState<string | null>(null);
  const [editAnchor, setEditAnchor] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const uniqueSources = Array.from(new Set(suggestions.map(s => s.sourceArticle)));
  const uniquePillars = Array.from(new Set(suggestions.map(s => s.newPillar)));

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir(col === 'relevance' ? 'desc' : 'asc'); }
  };

  const SortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(col)} className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
      {children}
      <ArrowUpDown className={`w-2.5 h-2.5 ${sortCol === col ? 'text-accent' : 'text-muted-foreground/40'}`} />
    </button>
  );

  const relevanceColor = (score: number) => score >= 80 ? 'bg-accent' : score >= 60 ? 'bg-accent/60' : 'bg-accent/30';

  const tabFiltered = useMemo(() => {
    let list = suggestions.filter(s => s.status === activeTab);
    if (filterSource !== 'All') list = list.filter(s => s.sourceArticle === filterSource);
    if (filterPillar !== 'All') list = list.filter(s => s.newPillar === filterPillar);
    if (activeTab === 'Approved' && filterLinkStatus !== 'All') list = list.filter(s => s.linkStatus === filterLinkStatus);
    if (minRelevance > 0) list = list.filter(s => s.relevance >= minRelevance);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'source': cmp = a.sourceArticle.localeCompare(b.sourceArticle); break;
        case 'anchor': cmp = a.anchorText.localeCompare(b.anchorText); break;
        case 'pillar': cmp = a.newPillar.localeCompare(b.newPillar); break;
        case 'relevance': cmp = a.relevance - b.relevance; break;
        default: cmp = a.relevance - b.relevance;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [suggestions, activeTab, filterSource, filterPillar, filterLinkStatus, minRelevance, sortCol, sortDir]);

  const pendingCount = tabFiltered.filter(s => s.status === 'Pending').length;

  const handleEditSave = (id: string) => {
    updateAnchor(id, editAnchor);
    setEditId(null);
  };

  const linkStatusBadge = (status?: string) => {
    if (status === 'Added') return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success"><Check className="w-2.5 h-2.5" /> Added</span>;
    if (status === 'Pending Add') return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/15 text-amber-700"><Clock className="w-2.5 h-2.5" /> Pending Add</span>;
    if (status === 'Not Found') return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive"><AlertTriangle className="w-2.5 h-2.5" /> Not Found</span>;
    return <span className="text-[10px] text-muted-foreground">—</span>;
  };

  return (
    <div className="bg-card rounded-xl border border-border/70 shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[13px] font-semibold text-card-foreground flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-accent" /> Retroactive Link Suggestions
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Internal links from older articles to refreshed content</p>
          </div>
          {activeTab === 'Pending' && pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowRejectConfirm(true)}>
                Reject All ({pendingCount})
              </Button>
              <Button size="sm" className="h-7 text-[11px] bg-success text-white hover:bg-success/90" onClick={() => bulkApprove(tabFiltered.filter(s => s.status === 'Pending').map(s => s.id))}>
                Approve All ({pendingCount})
              </Button>
            </div>
          )}
          {activeTab === 'Approved' && (
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={verifyAll} disabled={verifying}>
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {verifying ? 'Verifying...' : 'Verify All Links'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-3 bg-muted rounded-lg p-1 w-fit">
          {(['Pending', 'Approved', 'Rejected'] as LinkTab[]).map(tab => {
            const count = tab === 'Pending' ? counts.pending : tab === 'Approved' ? counts.approved : counts.rejected;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setFilterSource('All'); setFilterPillar('All'); setFilterLinkStatus('All'); }}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  isActive ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold tabular-nums ${
                  isActive ? 'bg-accent/10 text-accent' : 'bg-background text-muted-foreground'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-[11px]">
            <option value="All">Source: All</option>
            {uniqueSources.map(s => <option key={s} value={s}>{s.length > 30 ? s.slice(0, 30) + '…' : s}</option>)}
          </select>
          <select value={filterPillar} onChange={e => setFilterPillar(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-[11px]">
            <option value="All">Pillar: All</option>
            {uniquePillars.map(p => <option key={p} value={p}>{p.length > 30 ? p.slice(0, 30) + '…' : p}</option>)}
          </select>
          {activeTab === 'Approved' && (
            <select value={filterLinkStatus} onChange={e => setFilterLinkStatus(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-[11px]">
              <option value="All">Link Status: All</option>
              <option value="Added">Added</option>
              <option value="Pending Add">Pending Add</option>
              <option value="Not Found">Not Found</option>
            </select>
          )}
          {activeTab === 'Pending' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Min score:</span>
              <input type="range" min={0} max={100} value={minRelevance} onChange={e => setMinRelevance(Number(e.target.value))} className="w-20 h-1.5 accent-accent" />
              <span className="text-[11px] font-medium w-6">{minRelevance}</span>
            </div>
          )}
        </div>
      </div>

      {/* === PENDING TAB === */}
      {activeTab === 'Pending' && (
        <>
          <div className="grid grid-cols-[1fr_120px_140px_140px_1fr_80px_140px] items-center px-4 py-2 border-b border-border gap-2 bg-muted/30">
            <SortHeader col="source">Source Article</SortHeader>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Source URL</span>
            <SortHeader col="anchor">Anchor Text</SortHeader>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Placement</span>
            <SortHeader col="pillar">New Pillar</SortHeader>
            <SortHeader col="relevance">Relevance</SortHeader>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground text-right">Actions</span>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto scrollbar-thin">
            {tabFiltered.map(item => (
              <div key={item.id}>
                <div className="grid grid-cols-[1fr_120px_140px_140px_1fr_80px_140px] items-center px-4 py-2.5 gap-2 text-[12px] hover:bg-muted/20 transition-colors">
                  <span className="text-card-foreground truncate font-medium">{item.sourceArticle}</span>
                  <a href={item.sourceUrl} className="text-accent hover:underline truncate text-[11px]" target="_blank" rel="noopener noreferrer">{item.sourceUrl}</a>
                  <span className="text-accent font-medium truncate">"{item.anchorText}"</span>
                  <span className="text-muted-foreground truncate text-[11px]">{item.placement}</span>
                  <span className="text-card-foreground truncate">{item.newPillar}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${relevanceColor(item.relevance)}`} style={{ width: `${item.relevance}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-card-foreground w-6 text-right">{item.relevance}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setPreviewId(previewId === item.id ? null : item.id)} className={`p-1 rounded hover:bg-muted transition-colors ${previewId === item.id ? 'bg-accent/15 text-accent' : ''}`} title="Preview">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => { setEditId(item.id); setEditAnchor(item.anchorText); }} className="p-1 rounded hover:bg-muted transition-colors" title="Edit anchor text">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <Button size="sm" className="h-6 text-[10px] px-2 bg-success text-white hover:bg-success/90" onClick={() => approve(item.id)}>Approve</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => reject(item.id)}>Reject</Button>
                  </div>
                </div>
                {previewId === item.id && editId !== item.id && (
                  <div className="px-4 pb-3 bg-muted/10">
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-[11px] text-muted-foreground mb-1 font-medium">Preview — {item.placement}</p>
                      <p className="text-[12px] text-card-foreground leading-relaxed">
                        ...context around <mark className="bg-accent/20 text-accent font-semibold px-0.5 rounded">{item.anchorText}</mark> in the article...
                      </p>
                    </div>
                  </div>
                )}
                {editId === item.id && (
                  <div className="px-4 pb-3 bg-accent/5">
                    <div className="rounded-lg border border-accent/20 bg-background p-4 space-y-3">
                      <p className="text-[12px] font-semibold text-card-foreground">Edit Anchor Text</p>
                      <input value={editAnchor} onChange={e => setEditAnchor(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleEditSave(item.id); if (e.key === 'Escape') setEditId(null); }} />
                      <div className="flex items-center gap-3">
                        <Button size="sm" className="h-7 text-[11px] px-4" onClick={() => handleEditSave(item.id)}>Save</Button>
                        <button onClick={() => setEditId(null)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {tabFiltered.length === 0 && (
              <div className="flex flex-col items-center py-10 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-2">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <p className="text-[14px] font-medium text-foreground">No pending suggestions</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">New link suggestions will appear here after a refresh.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* === APPROVED TAB === */}
      {activeTab === 'Approved' && (
        <>
          <div className="grid grid-cols-[1fr_140px_140px_1fr_80px_100px_90px_100px_100px] items-center px-4 py-2 border-b border-border gap-2 bg-muted/30">
            <SortHeader col="source">Source Article</SortHeader>
            <SortHeader col="anchor">Anchor Text</SortHeader>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Placement</span>
            <SortHeader col="pillar">New Pillar</SortHeader>
            <SortHeader col="relevance">Relevance</SortHeader>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Approved By</span>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Date</span>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Link Status</span>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground text-right">Actions</span>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto scrollbar-thin">
            {tabFiltered.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_140px_140px_1fr_80px_100px_90px_100px_100px] items-center px-4 py-2.5 gap-2 text-[12px] hover:bg-muted/20 transition-colors bg-success/5">
                <span className="text-card-foreground truncate font-medium">{item.sourceArticle}</span>
                <span className="text-accent font-medium truncate">"{item.anchorText}"</span>
                <span className="text-muted-foreground truncate text-[11px]">{item.placement}</span>
                <span className="text-card-foreground truncate">{item.newPillar}</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${relevanceColor(item.relevance)}`} style={{ width: `${item.relevance}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold w-6 text-right">{item.relevance}</span>
                </div>
                <span className="text-[11px] text-muted-foreground truncate">{item.approvedBy?.split(' ')[0] || '—'}</span>
                <span className="text-[10px] text-muted-foreground">{item.approvedDate ? <TimeAgo date={item.approvedDate} /> : '—'}</span>
                {linkStatusBadge(item.linkStatus)}
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => verifySingle(item.id)} className="p-1 rounded hover:bg-muted transition-colors" title="Verify link">
                    <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => undo(item.id)} className="text-[10px] text-accent hover:text-accent/80 hover:underline transition-colors">Undo</button>
                </div>
              </div>
            ))}
            {tabFiltered.length === 0 && (
              <div className="flex flex-col items-center py-10 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-2">
                  <Check className="w-4 h-4" />
                </div>
                <p className="text-[14px] font-medium text-foreground">No approved suggestions yet</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">Approve pending suggestions to track them here.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* === REJECTED TAB === */}
      {activeTab === 'Rejected' && (
        <>
          <div className="grid grid-cols-[1fr_140px_140px_1fr_80px_100px_90px_80px] items-center px-4 py-2 border-b border-border gap-2 bg-muted/30">
            <SortHeader col="source">Source Article</SortHeader>
            <SortHeader col="anchor">Anchor Text</SortHeader>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Placement</span>
            <SortHeader col="pillar">New Pillar</SortHeader>
            <SortHeader col="relevance">Relevance</SortHeader>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Rejected By</span>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Date</span>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground text-right">Actions</span>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto scrollbar-thin">
            {tabFiltered.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_140px_140px_1fr_80px_100px_90px_80px] items-center px-4 py-2.5 gap-2 text-[12px] hover:bg-muted/20 transition-colors opacity-70 bg-destructive/5">
                <span className="text-card-foreground truncate font-medium">{item.sourceArticle}</span>
                <span className="text-accent font-medium truncate">"{item.anchorText}"</span>
                <span className="text-muted-foreground truncate text-[11px]">{item.placement}</span>
                <span className="text-card-foreground truncate">{item.newPillar}</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${relevanceColor(item.relevance)}`} style={{ width: `${item.relevance}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold w-6 text-right">{item.relevance}</span>
                </div>
                <span className="text-[11px] text-muted-foreground truncate">{item.rejectedBy?.split(' ')[0] || '—'}</span>
                <span className="text-[10px] text-muted-foreground">{item.rejectedDate ? <TimeAgo date={item.rejectedDate} /> : '—'}</span>
                <div className="flex items-center justify-end">
                  <button onClick={() => undo(item.id)} className="text-[10px] text-accent hover:text-accent/80 hover:underline transition-colors flex items-center gap-0.5">
                    <Undo2 className="w-3 h-3" /> Restore
                  </button>
                </div>
              </div>
            ))}
            {tabFiltered.length === 0 && (
              <div className="flex flex-col items-center py-10 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-2">
                  <X className="w-4 h-4" />
                </div>
                <p className="text-[14px] font-medium text-foreground">No rejected suggestions</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">Rejected suggestions can be restored from here.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Reject All Confirmation */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowRejectConfirm(false)}>
          <div className="bg-card rounded-xl border border-border/70 shadow-overlay p-5 w-[360px] space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-card-foreground">Reject all pending suggestions?</h3>
            <p className="text-[12px] text-muted-foreground">This will reject {pendingCount} pending suggestion{pendingCount !== 1 ? 's' : ''}. You can restore individual rejections afterwards.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRejectConfirm(false)}>Cancel</Button>
              <Button size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { bulkReject(tabFiltered.filter(s => s.status === 'Pending').map(s => s.id)); setShowRejectConfirm(false); }}>Reject All ({pendingCount})</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Main Refresh Queue Page ===
export function RefreshQueuePage() {
  const { refreshItems, loading, error, stats } = useRefreshQueue();
  const { openPanel } = useArticleDetailContext();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchFilter, setSearchFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [blockedFilter, setBlockedFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('All');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [customOpen, setCustomOpen] = useState(false);

  const filtered = useMemo(() => {
    let items = [...refreshItems];
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || (i.keyword || '').toLowerCase().includes(q));
    }
    if (assigneeFilter !== 'All') items = items.filter(i => i.assignedTo === assigneeFilter);
    if (priorityFilter !== 'All') items = items.filter(i => i.priority === priorityFilter);
    if (reasonFilter !== 'All') items = items.filter(i => i.refreshReason === reasonFilter);
    if (blockedFilter === 'Has Blockers') items = items.filter(i => !!i.blockedTask);
    if (blockedFilter === 'No Blockers') items = items.filter(i => !i.blockedTask);
    if (dateRangeFilter !== 'All' && dateRangeFilter !== 'Custom') {
      const days = dateRangeFilter === 'Last 7 days' ? 7 : dateRangeFilter === 'Last 30 days' ? 30 : dateRangeFilter === 'Last 60 days' ? 60 : 90;
      const cutoff = new Date(Date.now() - days * 86400000);
      items = items.filter(i => i.flaggedDate >= cutoff);
    }
    if (dateRangeFilter === 'Custom' && customStart && customEnd) {
      items = items.filter(i => i.flaggedDate >= customStart && i.flaggedDate <= customEnd);
    }
    return items;
  }, [refreshItems, searchFilter, assigneeFilter, priorityFilter, reasonFilter, blockedFilter, dateRangeFilter, customStart, customEnd]);

  const assigneeOptions = useMemo(
    () => ['All', ...new Set(refreshItems.map(i => i.assignedTo).filter((a): a is string => !!a))],
    [refreshItems]
  );

  const handleItemClick = (item: RefreshQueueItem) => {
    // Auto-flagged items carry the pipeline article id in articleId — the
    // refresh-queue doc id is not an article id and would open a blank panel.
    openPanel(item.articleId ?? item.id, true);
  };

  const handleStatusDrop = async (itemId: string, newStatus: string) => {
    const item = refreshItems.find((i) => i.id === itemId);
    if (!item || item.status === newStatus) return;
    try {
      // production: httpsCallable(functions, 'updateRefreshItemStatus')
      await callUpdateRefreshItemStatus(itemId, newStatus);
      toast.success(`Moved to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to move item', { description: (err as Error).message });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-[280px] shrink-0" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-sm text-destructive">Failed to load refresh queue</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <Button variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-display font-semibold tracking-tight text-foreground">Refresh Queue</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Articles being updated, optimized, and refreshed for better performance</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">In Queue</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{stats.inQueue}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">Avg Days in Queue</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{stats.avgDaysInQueue}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">Refreshed This Month</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{stats.refreshedThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-card card-interactive">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">Avg Position Improvement</p>
              <p className="text-[26px] font-display font-semibold leading-tight text-foreground tabular-nums">{stats.avgPositionImprovement || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="pl-8 h-8 w-40 text-xs" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Assignee</label>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {assigneeOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Priority</label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Reason</label>
          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Blocked</label>
          <Select value={blockedFilter} onValueChange={setBlockedFilter}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BLOCKED_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Date Range</label>
          <Popover open={dateRangeFilter === 'Custom' && customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <div>
                <Select value={dateRangeFilter} onValueChange={v => { setDateRangeFilter(v); if (v === 'Custom') setCustomOpen(true); }}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <p className="text-sm font-semibold text-foreground mb-3">Custom Date Range</p>
              <div className="flex gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Start</p>
                  <Calendar mode="single" selected={customStart} onSelect={setCustomStart} className="p-2 pointer-events-auto" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">End</p>
                  <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className="p-2 pointer-events-auto" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setCustomOpen(false); setDateRangeFilter('All'); }}>Cancel</Button>
                <Button size="sm" className="text-xs h-7 bg-accent text-accent-foreground hover:bg-accent/90" disabled={!customStart || !customEnd} onClick={() => setCustomOpen(false)}>Apply</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {/* View Toggle */}
        <div className="flex bg-muted rounded-lg p-1 ml-auto">
          <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${viewMode === 'kanban' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'}`}>
            <KanbanSquare className="w-3.5 h-3.5" /> Kanban
          </button>
          <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${viewMode === 'list' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      {/* Kanban or List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border/70 shadow-card animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-3">
            <RefreshCw className="w-5 h-5" />
          </div>
          <p className="text-[14px] font-semibold text-foreground">No items in the refresh queue</p>
          <p className="text-[12px] text-muted-foreground mt-1">Articles flagged for refresh will appear here.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
          {REFRESH_COLUMNS.map(col => (
            <RefreshKanbanColumn
              key={col.status}
              col={col}
              items={filtered.filter(i => i.status === col.status)}
              onClick={handleItemClick}
              onDropItem={handleStatusDrop}
            />
          ))}
        </div>
      ) : (
        <RefreshListView items={filtered} onRowClick={handleItemClick} />
      )}

      {/* Tabbed Link Suggestions */}
      <TabbedLinkSuggestions />
    </div>
  );
}
