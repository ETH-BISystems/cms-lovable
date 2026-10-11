import { useState, useMemo } from 'react';
import {
  ArrowUpDown, Eye, Pencil, X, Check, AlertTriangle, Clock, Undo2,
  SlidersHorizontal, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import type { LinkSuggestion } from '../types';

interface LinkSuggestionsProps {
  suggestions: LinkSuggestion[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUndo: (id: string) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkReject: (ids: string[]) => void;
  onEditAnchor?: (id: string, anchorText: string) => void;
  onOpenArticle?: (title: string) => void;
  counts: { pending: number; approved: number; rejected: number };
  subtitle?: string;
}

export function LinkSuggestions({
  suggestions, onApprove, onReject, onUndo, onBulkApprove, onBulkReject, onEditAnchor, onOpenArticle, counts, subtitle,
}: LinkSuggestionsProps) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterPillar, setFilterPillar] = useState('All');
  const [minRelevance, setMinRelevance] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editAnchor, setEditAnchor] = useState('');
  const [sortCol, setSortCol] = useState<string>('relevance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

  const filtered = useMemo(() => {
    let list = [...suggestions];
    if (filterStatus !== 'All') list = list.filter(s => s.status === filterStatus);
    if (filterSource !== 'All') list = list.filter(s => s.sourceArticle === filterSource);
    if (filterPillar !== 'All') list = list.filter(s => s.newPillar === filterPillar);
    if (minRelevance > 0) list = list.filter(s => s.relevance >= minRelevance);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'source': cmp = a.sourceArticle.localeCompare(b.sourceArticle); break;
        case 'url': cmp = a.sourceUrl.localeCompare(b.sourceUrl); break;
        case 'anchor': cmp = a.anchorText.localeCompare(b.anchorText); break;
        case 'placement': cmp = a.placement.localeCompare(b.placement); break;
        case 'pillar': cmp = a.newPillar.localeCompare(b.newPillar); break;
        case 'relevance': cmp = a.relevance - b.relevance; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        default: cmp = a.relevance - b.relevance;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [suggestions, filterStatus, filterSource, filterPillar, minRelevance, sortCol, sortDir]);

  const pendingIds = filtered.filter(s => s.status === 'Pending').map(s => s.id);

  return (
    <div className="bg-card rounded-xl border border-border/70 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[13px] font-semibold text-card-foreground flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-accent" /> Retroactive Link Suggestions
            </h3>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-muted-foreground">Pending: <span className="font-semibold text-card-foreground">{counts.pending}</span></span>
            <span className="text-muted-foreground">Approved: <span className="font-semibold text-success">{counts.approved}</span></span>
            <span className="text-muted-foreground">Rejected: <span className="font-semibold text-destructive">{counts.rejected}</span></span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-[11px] text-foreground">
            <option value="All">Status: All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-[11px] text-foreground">
            <option value="All">Source: All</option>
            {uniqueSources.map(s => <option key={s} value={s}>{s.length > 30 ? s.slice(0, 30) + '…' : s}</option>)}
          </select>
          <select value={filterPillar} onChange={e => setFilterPillar(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-[11px] text-foreground">
            <option value="All">Pillar: All</option>
            {uniquePillars.map(p => <option key={p} value={p}>{p.length > 30 ? p.slice(0, 30) + '…' : p}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Min score:</span>
            <input type="range" min={0} max={100} value={minRelevance} onChange={e => setMinRelevance(Number(e.target.value))} className="w-20 h-1.5 accent-accent" />
            <span className="text-[11px] font-medium text-card-foreground w-6">{minRelevance}</span>
          </div>
          {pendingIds.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Button size="sm" variant="outline" className="h-6 text-[10px] text-destructive border-destructive/30" onClick={() => setShowRejectConfirm(true)}>Reject All ({pendingIds.length})</Button>
              <Button size="sm" className="h-6 text-[10px] bg-success text-white hover:bg-success/90" onClick={() => onBulkApprove(pendingIds)}>Approve All ({pendingIds.length})</Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="grid grid-cols-[1fr_120px_140px_140px_1fr_80px_100px_140px] items-center px-4 py-2 border-b border-border gap-2 bg-muted/30">
        <SortHeader col="source">Source Article</SortHeader>
        <SortHeader col="url">Source URL</SortHeader>
        <SortHeader col="anchor">Anchor Text</SortHeader>
        <SortHeader col="placement">Placement</SortHeader>
        <SortHeader col="pillar">New Pillar</SortHeader>
        <SortHeader col="relevance">Relevance</SortHeader>
        <SortHeader col="status">Status</SortHeader>
        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground text-right">Actions</span>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto scrollbar-thin">
        {filtered.map(item => (
          <div key={item.id}>
            <div className={`grid grid-cols-[1fr_120px_140px_140px_1fr_80px_100px_140px] items-center px-4 py-2.5 gap-2 text-[12px] hover:bg-muted/20 transition-colors ${
              item.status === 'Approved' ? 'bg-success/5' : item.status === 'Rejected' ? 'bg-destructive/5 opacity-70' : ''
            }`}>
              {onOpenArticle ? (
                <button onClick={() => onOpenArticle(item.sourceArticle)} className="text-card-foreground truncate font-medium text-left hover:text-accent transition-colors">{item.sourceArticle}</button>
              ) : (
                <span className="text-card-foreground truncate font-medium">{item.sourceArticle}</span>
              )}
              <a href={item.sourceUrl} className="text-accent hover:underline truncate text-[11px]" target="_blank" rel="noopener noreferrer">{item.sourceUrl}</a>
              {editId === item.id ? (
                <div className="flex items-center gap-1">
                  <Input value={editAnchor} onChange={e => setEditAnchor(e.target.value)} className="h-6 text-[11px]" autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') { onEditAnchor?.(item.id, editAnchor); setEditId(null); }
                      if (e.key === 'Escape') setEditId(null);
                    }} />
                  <button onClick={() => { onEditAnchor?.(item.id, editAnchor); setEditId(null); }} className="text-success"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditId(null)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span className="text-accent font-medium truncate">"{item.anchorText}"</span>
              )}
              <span className="text-muted-foreground truncate text-[11px]">{item.placement}</span>
              {onOpenArticle ? (
                <button onClick={() => onOpenArticle(item.newPillar)} className="text-card-foreground truncate text-left hover:text-accent transition-colors">{item.newPillar}</button>
              ) : (
                <span className="text-card-foreground truncate">{item.newPillar}</span>
              )}
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${relevanceColor(item.relevance)}`} style={{ width: `${item.relevance}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-card-foreground w-6 text-right">{item.relevance}</span>
              </div>
              <StatusBadge
                status={item.status}
                variant={item.status === 'Approved' ? 'success' : item.status === 'Rejected' ? 'danger' : 'neutral'}
                className="w-fit px-1.5 py-0 text-[10px]"
              />
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => setPreviewId(previewId === item.id ? null : item.id)} className={`p-1 rounded hover:bg-muted transition-colors ${previewId === item.id ? 'bg-accent/15 text-accent' : ''}`} title="Preview">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {item.status === 'Pending' && (
                  <>
                    <button onClick={() => { setEditId(item.id); setEditAnchor(item.anchorText); }} className="p-1 rounded hover:bg-muted transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <Button size="sm" className="h-6 text-[10px] px-2 bg-success text-white hover:bg-success/90" onClick={() => onApprove(item.id)}>Approve</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-destructive border-destructive/30" onClick={() => onReject(item.id)}>Reject</Button>
                  </>
                )}
                {(item.status === 'Approved' || item.status === 'Rejected') && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onUndo(item.id)}>
                    <Undo2 className="w-3 h-3 mr-0.5" /> Undo
                  </Button>
                )}
              </div>
            </div>
            {previewId === item.id && (
              <div className="px-4 pb-3 bg-muted/10">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">Preview — {item.placement}</p>
                  <p className="text-[12px] text-card-foreground leading-relaxed">
                    ...context around <mark className="bg-accent/20 text-accent font-semibold px-0.5 rounded">{item.anchorText}</mark> in the article...
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center animate-fade-in">
            <LinkIcon className="w-5 h-5 text-muted-foreground/40 mb-1.5" />
            <p className="text-[12px] text-muted-foreground">No link suggestions match your filters</p>
          </div>
        )}
      </div>

      {/* Reject All Confirmation Dialog */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowRejectConfirm(false)}>
          <div className="bg-card rounded-xl border border-border shadow-overlay p-5 w-[360px] space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-card-foreground">Reject all pending suggestions?</h3>
            <p className="text-[12px] text-muted-foreground">This will reject {pendingIds.length} pending suggestion{pendingIds.length !== 1 ? 's' : ''}. You can undo individual rejections afterwards.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRejectConfirm(false)}>Cancel</Button>
              <Button size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onBulkReject(pendingIds); setShowRejectConfirm(false); }}>
                Reject All ({pendingIds.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
