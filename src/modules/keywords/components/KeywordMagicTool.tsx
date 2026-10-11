import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Loader2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FilePlus2,
  Send,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useKeywordMagic } from '../hooks/useKeywordMagic';
import { createArticleDraftFromKeywords } from '../services/keywordMagicService';
import { KeywordGroupsPanel } from './KeywordGroupsPanel';
import { KeywordFilters } from './KeywordFilters';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import type { HistoryGetResult } from '../types/trafficMarket';
import type { KeywordMagicResult, MagicKeyword, MagicMatchType, MagicSortColumn } from '../types/magic';

export interface KeywordMagicToolProps {
  /** 'standalone' = full page layout with groups sidebar. 'embedded' = compact, collapsible groups. */
  mode?: 'standalone' | 'embedded';
  /** Pre-fill the seed input. */
  initialSeed?: string;
  /** Run the search automatically on mount when initialSeed is provided. */
  autoSearch?: boolean;
  /**
   * Pre-fetched result set (e.g. from a prior discovery run). When provided,
   * it renders immediately and auto-search is skipped — no duplicate API call.
   * A manual search still replaces it.
   */
  initialResult?: KeywordMagicResult | null;
  /** 'multi' = checkbox selection. 'primary-secondary' = radio (1°) + checkboxes (2°). */
  selectionMode?: 'multi' | 'primary-secondary';
  /** Fires when the user clicks the send/confirm button in multi mode. */
  onSelectKeywords?: (keywords: string[]) => void | Promise<void>;
  /** Fires live whenever the multi selection changes. */
  onSelectionChange?: (keywords: string[]) => void;
  /** Fires when the user confirms in primary-secondary mode. */
  onConfirmSelection?: (primary: string, secondary: string[]) => void | Promise<void>;
  /** Label for the send/confirm button. */
  confirmLabel?: string;
}

const MATCH_TABS: Array<{ value: MagicMatchType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'questions', label: 'Questions' },
  { value: 'broad', label: 'Broad Match' },
  { value: 'phrase', label: 'Phrase Match' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'related', label: 'Related' },
];

const INTENT_CONFIG: Record<string, { label: string; short: string; color: string }> = {
  informational: { label: 'Informational', short: 'I', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  commercial: { label: 'Commercial', short: 'C', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  transactional: { label: 'Transactional', short: 'T', color: 'bg-green-100 text-green-700 border-green-200' },
  navigational: { label: 'Navigational', short: 'N', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

function getKDColor(kd: number): string {
  if (kd <= 14) return 'text-green-600';
  if (kd <= 29) return 'text-green-500';
  if (kd <= 49) return 'text-yellow-500';
  if (kd <= 69) return 'text-orange-500';
  if (kd <= 84) return 'text-red-500';
  return 'text-red-700';
}

function getKDDot(kd: number): string {
  if (kd <= 14) return 'bg-green-500';
  if (kd <= 29) return 'bg-green-400';
  if (kd <= 49) return 'bg-yellow-400';
  if (kd <= 69) return 'bg-orange-400';
  if (kd <= 84) return 'bg-red-400';
  return 'bg-red-600';
}

function getKDLabel(kd: number): string {
  if (kd <= 14) return 'Very easy';
  if (kd <= 29) return 'Easy';
  if (kd <= 49) return 'Possible';
  if (kd <= 69) return 'Difficult';
  if (kd <= 84) return 'Hard';
  return 'Very hard';
}

function exportCsv(keywords: MagicKeyword[], seed: string) {
  const header = 'Keyword,Intent,Volume,KD %,CPC (USD),SERP Features,Source';
  const rows = keywords.map(k =>
    [
      `"${k.keyword.replace(/"/g, '""')}"`,
      k.intent,
      k.volume,
      k.kd,
      k.cpc.toFixed(2),
      `"${k.serpFeatures.join('; ')}"`,
      k.source,
    ].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `keyword-magic-${seed.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * SEMRush-style Keyword Magic Tool. Searches DataForSEO via the
 * keywordMagicSearch Cloud Function and provides match tabs, filters,
 * keyword groups, sorting, pagination, selection, and CSV export.
 */
export function KeywordMagicTool({
  mode = 'standalone',
  initialSeed = '',
  autoSearch = false,
  initialResult = null,
  selectionMode = 'multi',
  onSelectKeywords,
  onSelectionChange,
  onConfirmSelection,
  confirmLabel,
}: KeywordMagicToolProps) {
  const magic = useKeywordMagic(initialResult);
  const [seedInput, setSeedInput] = useState(initialSeed);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [primaryKeyword, setPrimaryKeyword] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const autoSearched = useRef(false);

  const isEmbedded = mode === 'embedded';
  const { result, loading, error } = magic;

  // Saved searches (standalone page only — same pattern as Brand Monitoring):
  // every search is snapshotted server-side; on open, the HistoryGate offers
  // the last searches so re-opening one costs no DataForSEO tokens.
  const historyFirst = useHistoryFirst('keyword-magic', undefined, undefined, !isEmbedded);
  const history = useHistorySnapshot<KeywordMagicResult>({
    // "Refresh live data" re-runs the snapshot's own seed.
    onRefreshLive: snapshot => {
      if (snapshot.payload.seed) {
        setSeedInput(snapshot.payload.seed);
        magic.search(snapshot.payload.seed);
      }
    },
  });
  const { loadSnapshot, clearSnapshot } = history;
  const loadSavedSearch = useCallback((snapshot: HistoryGetResult) => {
    const payload = snapshot.payload as KeywordMagicResult | null;
    if (!payload || !Array.isArray(payload.keywords)) return;
    setSelected(new Set());
    setPrimaryKeyword(null);
    setSeedInput(payload.seed ?? '');
    magic.loadResult(payload);
    loadSnapshot(snapshot, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magic.loadResult, loadSnapshot]);

  // History-first gate: shown instead of the results area until the user
  // re-opens a saved search or starts a new one — no API call while it shows.
  const showHistoryGate =
    !isEmbedded &&
    !historyFirst.checking &&
    historyFirst.hasHistory &&
    !history.snapshot &&
    !result &&
    !loading &&
    !error;

  useEffect(() => {
    // Pre-fetched results make the auto-search redundant (and its API cost)
    if (autoSearch && initialSeed.trim() && !autoSearched.current && !initialResult) {
      autoSearched.current = true;
      magic.search(initialSeed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearch, initialSeed, initialResult]);

  // React to the parent switching articles/seeds without remounting
  useEffect(() => {
    setSeedInput(initialSeed);
    autoSearched.current = false;
    setSelected(new Set());
    setPrimaryKeyword(null);
  }, [initialSeed]);

  // Live selection callback — outside the state updater so it never runs
  // twice under StrictMode and the updater stays pure.
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  useEffect(() => {
    onSelectionChangeRef.current?.([...selected]);
  }, [selected]);

  const toggleKeyword = useCallback((keyword: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword); else next.add(keyword);
      return next;
    });
  }, []);

  const setPrimary = useCallback((keyword: string) => {
    setPrimaryKeyword(keyword);
    setSelected(prev => {
      if (!prev.has(keyword)) return prev;
      const next = new Set(prev);
      next.delete(keyword);
      return next;
    });
  }, []);

  const pageAllSelected = magic.pageKeywords.length > 0 && magic.pageKeywords.every(k => selected.has(k.keyword));
  const toggleSelectPage = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (pageAllSelected) {
        magic.pageKeywords.forEach(k => next.delete(k.keyword));
      } else {
        magic.pageKeywords.forEach(k => next.add(k.keyword));
      }
      return next;
    });
  };

  const handleSearch = () => {
    if (!seedInput.trim()) {
      toast.error('Enter a seed keyword to search');
      return;
    }
    setSelected(new Set());
    setPrimaryKeyword(null);
    clearSnapshot();
    magic.search(seedInput);
  };

  const handleSend = async () => {
    if (sending) return;
    try {
      setSending(true);
      if (selectionMode === 'primary-secondary') {
        if (!primaryKeyword) return;
        await onConfirmSelection?.(primaryKeyword, [...selected].filter(k => k !== primaryKeyword));
      } else {
        if (selected.size === 0) return;
        await onSelectKeywords?.([...selected]);
      }
    } catch {
      // Error feedback is the callback owner's responsibility (toast etc.);
      // catching here keeps the selection intact for a retry.
    } finally {
      setSending(false);
    }
  };

  // CMS-65: create an article draft in the pipeline from the selection —
  // reuses the pipeline's createArticle callable via the service layer.
  const handleCreateDraft = async () => {
    if (creatingDraft || !result) return;
    const chosen = result.keywords.filter(k => selected.has(k.keyword) || k.keyword === primaryKeyword);
    if (chosen.length === 0) {
      toast.error('Select at least one keyword first');
      return;
    }
    setCreatingDraft(true);
    try {
      const { title } = await createArticleDraftFromKeywords(chosen, result.seed);
      toast.success(`Article draft "${title}" created in the pipeline`);
      setSelected(new Set());
      setPrimaryKeyword(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the article draft');
    } finally {
      setCreatingDraft(false);
    }
  };

  const selectionCount = selected.size + (selectionMode === 'primary-secondary' && primaryKeyword ? 1 : 0);
  const sendLabel = confirmLabel || (selectionMode === 'primary-secondary' ? 'Confirm Selection' : 'Send keywords');
  const showSendButton = selectionMode === 'primary-secondary' ? !!onConfirmSelection : !!onSelectKeywords;

  const groups = useMemo(() => result?.groups || [], [result]);

  return (
    <div className={cn('flex flex-col', isEmbedded ? 'gap-2.5' : 'gap-3')}>
      {/* Header: seed input + search — dark hero band when standalone */}
      <div
        className={cn(
          'space-y-1.5',
          !isEmbedded && 'kw-hero relative animate-fade-up space-y-4 overflow-hidden rounded-[1.5rem] px-6 py-6 text-white ring-1 ring-white/10 sm:px-8 bg-[#04333d]',
        )}
      >
        {!isEmbedded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(75% 130% at 88% -20%, rgba(0,205,232,0.32), transparent 58%),' +
                'radial-gradient(55% 110% at -5% 115%, rgba(0,147,167,0.28), transparent 55%),' +
                'linear-gradient(120deg, #032b34 0%, #06414d 55%, #043540 100%)',
            }}
          />
        )}
        {!isEmbedded && (
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-100/90 ring-1 ring-white/15">
                Keyword Magic · DataForSEO
              </span>
              <HistoryPanel page="keyword-magic" onLoad={loadSavedSearch} />
            </div>
            <h1 className="mt-3 flex items-center gap-3 font-display text-[30px] font-bold leading-tight tracking-tight">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Wand2 className="h-5 w-5 text-cyan-200" />
              </span>
              Keyword Magic Tool{result ? `: ${result.seed}` : ''}
            </h1>
          </div>
        )}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1 max-w-[420px]">
            <Search className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5', isEmbedded ? 'text-muted-foreground' : 'text-white/40')} />
            <Input
              value={seedInput}
              onChange={e => setSeedInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter a seed keyword, e.g. 'travel credit card'"
              data-hero-search-input=""
              className={cn(
                'pl-8',
                isEmbedded
                  ? 'h-8 text-[12px]'
                  : 'h-10 text-sm border-white/15 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-0',
              )}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            size="sm"
            className={cn(
              isEmbedded
                ? 'h-8 text-[11px] bg-accent text-accent-foreground hover:bg-accent/90'
                : 'h-10 bg-white text-[#053741] shadow-[0_8px_24px_-8px_rgba(0,205,232,0.5)] hover:bg-cyan-50',
            )}
          >
            {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Searching...</> : <><Search className="h-3.5 w-3.5 mr-1.5" /> Search</>}
          </Button>
          <span className={cn('text-[11px] whitespace-nowrap hidden sm:inline', isEmbedded ? 'text-muted-foreground' : 'text-cyan-50/50')}>
            Database: 🇺🇸 United States · Currency: USD
          </span>
        </div>
      </div>

      {history.banner}

      {showHistoryGate ? (
        <HistoryGate entries={historyFirst.entries} onLoad={loadSavedSearch} />
      ) : (
        <>

      {/* Match type tabs */}
      <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5 w-fit max-w-full overflow-x-auto">
        {MATCH_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => magic.setMatchType(tab.value)}
            className={cn(
              'px-2.5 py-1 text-[11px] rounded font-medium transition-colors whitespace-nowrap',
              magic.matchType === tab.value
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <KeywordFilters filters={magic.filters} onChange={magic.setFilters} />

      {/* Stats bar + actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            All keywords: {magic.stats.count.toLocaleString()}
          </span>
          <span>Total Volume: {magic.stats.totalVolume.toLocaleString()}</span>
          <span>Average KD: {magic.stats.avgKd}%</span>
          {selectionCount > 0 && (
            <span className="text-accent font-medium">{selectionCount} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1"
            disabled={magic.filteredKeywords.length === 0}
            onClick={() => {
              const toExport = selected.size > 0
                ? magic.filteredKeywords.filter(k => selected.has(k.keyword) || k.keyword === primaryKeyword)
                : magic.filteredKeywords;
              exportCsv(toExport, result?.seed || 'keywords');
              toast.success(`Exported ${toExport.length} keywords to CSV`);
            }}
          >
            <Download className="w-3 h-3" /> Export
          </Button>
          {!isEmbedded && (
            <Button
              size="sm"
              className="h-7 text-[10px] gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={creatingDraft || selectionCount === 0}
              onClick={handleCreateDraft}
              title="Create one article draft in the pipeline from the selected keywords"
            >
              {creatingDraft ? <Loader2 className="w-3 h-3 animate-spin" /> : <FilePlus2 className="w-3 h-3" />}
              {creatingDraft ? 'Creating…' : `Create article draft${selectionCount > 0 ? ` (${selectionCount})` : ''}`}
            </Button>
          )}
          {showSendButton && (
            <Button
              size="sm"
              className="h-7 text-[10px] gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={sending || (selectionMode === 'primary-secondary' ? !primaryKeyword : selected.size === 0)}
              onClick={handleSend}
            >
              {sending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : selectionMode === 'primary-secondary' ? <CheckCircle2 className="w-3 h-3" /> : <Send className="w-3 h-3" />}
              {sending ? 'Saving…' : `${sendLabel}${selectionCount > 0 ? ` (${selectionCount})` : ''}`}
            </Button>
          )}
        </div>
      </div>

      {/* Main area: groups sidebar + results table */}
      <div className={cn('flex gap-3 items-stretch', isEmbedded && 'flex-col lg:flex-row')}>
        {result && groups.length > 0 && (
          <div className={cn('shrink-0', isEmbedded ? 'w-full lg:w-[170px] max-h-[240px] lg:max-h-[420px]' : 'w-[200px]')}>
            <KeywordGroupsPanel
              groups={groups}
              totalCount={result.totalCount}
              activeGroup={magic.activeGroup}
              onSelectGroup={magic.setActiveGroup}
            />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 border border-border rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span className="text-sm text-muted-foreground">Searching DataForSEO for keywords...</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="text-center py-12 border border-destructive/30 rounded-lg bg-red-50/50">
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={handleSearch}>Retry</Button>
            </div>
          )}

          {/* Empty states */}
          {!loading && !error && !result && !historyFirst.checking && (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-lg text-muted-foreground">
              <Wand2 className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Enter a seed keyword to discover hundreds of opportunities</p>
              <p className="text-[11px] mt-1">Powered by DataForSEO — search volume, difficulty, intent, and CPC</p>
            </div>
          )}

          {!loading && !error && result && magic.filteredKeywords.length === 0 && (
            <div className="text-center py-12 border border-border rounded-lg text-sm text-muted-foreground">
              {result.totalCount === 0
                ? 'No keywords found for this seed. Try a broader term.'
                : 'No keywords match the current tab, group, or filters.'}
            </div>
          )}

          {/* Results table */}
          {!loading && !error && magic.filteredKeywords.length > 0 && (
            <TooltipProvider>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] min-w-[640px]">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b border-border">
                        {selectionMode === 'primary-secondary' ? (
                          <>
                            <th className="px-2 py-2 w-8 text-center">
                              <span className="text-[9px] uppercase text-muted-foreground font-medium">1°</span>
                            </th>
                            <th className="px-2 py-2 w-8 text-center">
                              <span className="text-[9px] uppercase text-muted-foreground font-medium">2°</span>
                            </th>
                          </>
                        ) : (
                          <th className="px-2 py-2 w-8 text-center">
                            <Checkbox
                              checked={pageAllSelected}
                              onCheckedChange={toggleSelectPage}
                              className="h-3.5 w-3.5"
                              aria-label="Select all on page"
                            />
                          </th>
                        )}
                        <th className="px-2 py-2 text-left">
                          <SortableHeader label="Keyword" column="keyword" sort={magic.sort} onSort={magic.toggleSort} />
                        </th>
                        <th className="px-2 py-2 text-left">
                          <span className="text-[9px] uppercase text-muted-foreground font-medium">Intent</span>
                        </th>
                        <th className="px-2 py-2 text-right">
                          <SortableHeader label="Volume" column="volume" sort={magic.sort} onSort={magic.toggleSort} align="right" />
                        </th>
                        <th className="px-2 py-2 text-right">
                          <SortableHeader label="KD %" column="kd" sort={magic.sort} onSort={magic.toggleSort} align="right" />
                        </th>
                        <th className="px-2 py-2 text-right">
                          <SortableHeader label="CPC (USD)" column="cpc" sort={magic.sort} onSort={magic.toggleSort} align="right" />
                        </th>
                        <th className="px-2 py-2 text-right">
                          <SortableHeader label="SF" column="serpFeatures" sort={magic.sort} onSort={magic.toggleSort} align="right" />
                        </th>
                        <th className="px-2 py-2 text-right">
                          <span className="text-[9px] uppercase text-muted-foreground font-medium">Updated</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {magic.pageKeywords.map(kw => (
                        <KeywordRow
                          key={kw.keyword}
                          kw={kw}
                          selectionMode={selectionMode}
                          isSelected={selected.has(kw.keyword)}
                          isPrimary={primaryKeyword === kw.keyword}
                          onToggle={toggleKeyword}
                          onSetPrimary={setPrimary}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-2 flex-wrap px-1">
                <span className="text-[10px] text-muted-foreground">
                  Page {magic.page + 1} of {magic.totalPages} · Showing {magic.page * magic.pageSize + 1}–{Math.min((magic.page + 1) * magic.pageSize, magic.filteredKeywords.length)} of {magic.filteredKeywords.length.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={magic.page === 0}
                      onClick={() => magic.setPage(magic.page - 1)}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    {Array.from({ length: Math.min(magic.totalPages, 5) }, (_, i) => {
                      const pageNum = magic.totalPages <= 5
                        ? i
                        : Math.max(0, Math.min(magic.page - 2, magic.totalPages - 5)) + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={magic.page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className={cn('h-6 w-6 p-0 text-[10px]', magic.page === pageNum && 'bg-accent text-accent-foreground')}
                          onClick={() => magic.setPage(pageNum)}
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={magic.page >= magic.totalPages - 1}
                      onClick={() => magic.setPage(magic.page + 1)}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                  <Select value={String(magic.pageSize)} onValueChange={v => magic.setPageSize(Number(v))}>
                    <SelectTrigger className="h-6 w-[110px] text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[25, 50, 100].map(size => (
                        <SelectItem key={size} value={String(size)} className="text-[11px]">
                          {size} per page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>

        </>
      )}
    </div>
  );
}

// ─── Table row ──────────────────────────────────────────────────────────────
// Memoized with stable keyword-taking callbacks — a selection toggle re-renders
// only the affected rows, not the whole page of up to 100.
const KeywordRow = memo(function KeywordRow({
  kw,
  selectionMode,
  isSelected,
  isPrimary,
  onToggle,
  onSetPrimary,
}: {
  kw: MagicKeyword;
  selectionMode: 'multi' | 'primary-secondary';
  isSelected: boolean;
  isPrimary: boolean;
  onToggle: (keyword: string) => void;
  onSetPrimary: (keyword: string) => void;
}) {
  const intentConf = INTENT_CONFIG[kw.intent] || INTENT_CONFIG.informational;
  const updatedLabel = kw.updatedAt ? new Date(kw.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  return (
    <tr
      className={cn(
        'hover:bg-muted/30 transition-colors',
        isPrimary && 'bg-accent/8 border-l-2 border-l-accent',
        isSelected && !isPrimary && 'bg-blue-50/50'
      )}
    >
      {selectionMode === 'primary-secondary' ? (
        <>
          <td className="px-2 py-2 text-center">
            <input
              type="radio"
              name="magic-primary-keyword"
              checked={isPrimary}
              onChange={() => onSetPrimary(kw.keyword)}
              className="w-3.5 h-3.5 accent-accent cursor-pointer"
            />
          </td>
          <td className="px-2 py-2 text-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(kw.keyword)}
              disabled={isPrimary}
              className="w-3.5 h-3.5 rounded cursor-pointer accent-blue-600 disabled:opacity-30"
            />
          </td>
        </>
      ) : (
        <td className="px-2 py-2 text-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(kw.keyword)}
            className="h-3.5 w-3.5"
            aria-label={`Select ${kw.keyword}`}
          />
        </td>
      )}
      <td className="px-2 py-2">
        <span className="font-medium text-foreground">{kw.keyword}</span>
      </td>
      <td className="px-2 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold border', intentConf.color)}>
              {intentConf.short}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">{intentConf.label}</TooltipContent>
        </Tooltip>
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
        {kw.volume.toLocaleString()}
      </td>
      <td className="px-2 py-2 text-right">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-1.5">
              <span className={cn('tabular-nums font-medium', getKDColor(kw.kd))}>{kw.kd}</span>
              <span className={cn('w-2 h-2 rounded-full shrink-0', getKDDot(kw.kd))} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">{getKDLabel(kw.kd)}</TooltipContent>
        </Tooltip>
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
        ${kw.cpc.toFixed(2)}
      </td>
      <td className="px-2 py-2 text-right">
        {kw.serpFeatures.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="tabular-nums text-muted-foreground cursor-default">{kw.serpFeatures.length}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] max-w-[220px]">
              {kw.serpFeatures.join(', ')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-2 text-right text-muted-foreground whitespace-nowrap">{updatedLabel}</td>
    </tr>
  );
});

// ─── Sortable column header ─────────────────────────────────────────────────
function SortableHeader({
  label,
  column,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  column: MagicSortColumn;
  sort: { column: MagicSortColumn; direction: 'asc' | 'desc' };
  onSort: (col: MagicSortColumn) => void;
  align?: 'left' | 'right';
}) {
  const isActive = sort.column === column;

  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        'flex items-center gap-1 text-[9px] uppercase font-medium transition-colors',
        align === 'right' && 'ml-auto',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
      {isActive ? (
        sort.direction === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />
      ) : (
        <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
      )}
    </button>
  );
}
