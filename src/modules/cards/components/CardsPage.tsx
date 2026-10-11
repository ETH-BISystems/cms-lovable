import { useState, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Search, ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, ExternalLink, ChevronsUpDown, ChevronUp, ChevronDown, Play, Download, Settings, Loader2, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCardsContext } from '../context/CardsContext';
import { useCards } from '../hooks/useCards';
import { useCardActions } from '../hooks/useCardActions';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types';
import { useAiFinalProcessingStatus, runCardQueueNow } from '@/modules/ai-final-processing';
import { useScraperStatus } from '../hooks/useScraperStatus';
import { useCardCategories } from '../hooks/useCardCategories';
import { displayAnnualFee, displayCardValue, isFieldOverridden } from '../utils/displayCardValues';
import { StatCards } from './StatCards';
import { AddCardModal } from './AddCardModal';
import { GlobalFieldsTab } from './GlobalFieldsTab';
import { CardDetailPanel } from './CardDetailPanel';
import { ConfirmScrapeDialog } from './ConfirmScrapeDialog';
import type { CardDocument, CardStatus, WebflowStatus } from '../types';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

type SortField = 'name' | 'issuer' | 'annualFee' | 'signupBonus' | 'lastScraped' | 'lastChanged' | 'status';
type SortDir = 'asc' | 'desc';

const ISSUER_COLORS: Record<string, string> = {
  Chase: 'bg-[hsl(220,80%,45%)]',
  'American Express': 'bg-[hsl(215,70%,50%)]',
  'Capital One': 'bg-[hsl(0,70%,50%)]',
  Barclays: 'bg-[hsl(210,65%,50%)]',
  Citi: 'bg-[hsl(0,60%,50%)]',
  'US Bank': 'bg-[hsl(0,65%,45%)]',
  'Wells Fargo': 'bg-[hsl(40,80%,50%)]',
  Bilt: 'bg-[hsl(0,0%,15%)]',
  'Bank of America': 'bg-[hsl(0,70%,45%)]',
  Discover: 'bg-[hsl(25,85%,55%)]',
};

/** CMS-122: amber marker shown next to a cell whose value is a saved
    (manual) override rather than the scraper value. */
function OverrideDot() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-label="Manually overridden" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Manual override — showing the saved value, not the scraper value</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function IssuerLogo({ issuer }: { issuer: string }) {  const bg = ISSUER_COLORS[issuer] || 'bg-muted-foreground/30';
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${bg} text-[9px] font-bold text-white shrink-0`}>
      {issuer.charAt(0)}
    </span>
  );
}

const statusConfig: Record<CardStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  current: { label: 'Current', variant: 'success' },
  changed: { label: 'Changed', variant: 'warning' },
  outdated: { label: 'Outdated', variant: 'danger' },
  new: { label: 'New', variant: 'info' },
};

const webflowConfig: Record<WebflowStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  synced: { label: 'Synced', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  'out-of-sync': { label: 'Out of Sync', variant: 'danger' },
  'not-published': { label: 'Not Published', variant: 'neutral' },
};

function formatDate(ts: { toMillis?: () => number } | null | undefined): string {
  if (!ts?.toMillis) return '—';
  const d = new Date(ts.toMillis());
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

export function CardsPage() {
  const navigate = useNavigate();
  const { setActiveCardId, selectedCardIds, toggleCardSelection, selectAll, clearSelection, setFilters, filters } = useCardsContext();
  const { cards, loading } = useCards();
  const { syncToWebflow, scrapeAllCards, bulkSyncToWebflow, scrapeCard, setCardPublishState } = useCardActions();
  const { role } = useAuth();
  const scraperStatus = useScraperStatus();
  const { categories } = useCardCategories();
  const [sortField, setSortField] = useState<SortField>('lastChanged');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [scraping, setScraping] = useState(false);
  const [bulkScraping, setBulkScraping] = useState(false);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [confirmScrape, setConfirmScrape] = useState<'all' | 'bulk' | null>(null);
  // CMS-116: Cards | Global Fields page tabs
  const [pageTab, setPageTab] = useState<'cards' | 'global'>('cards');

  const isAdmin = role === Role.Admin;
  // Cards are never deleted (iframe instances reference them by ID) — only unpublished.
  const canTogglePublish = isAdmin || role === Role.Editor;

  // Card prose humanise queue (2026-09-09): the scheduler drains it only at
  // its approved times — this surfaces the backlog + an out-of-schedule
  // "switch it on" wake right where scraping work happens.
  const { data: afpStatus, running: afpRunning, refresh: refreshAfp } = useAiFinalProcessingStatus();
  const [humanizeStarting, setHumanizeStarting] = useState(false);
  const cardsQueued = afpStatus?.cardsQueued ?? 0;
  const canRunHumanize = isAdmin || role === Role.Editor;

  const handleHumanizeNow = async () => {
    setHumanizeStarting(true);
    try {
      const res = await runCardQueueNow();
      if (res.started) {
        toast.success('Gemma 4 is processing the card prose queue', { description: res.message });
      } else {
        toast.info('Card queue not started', { description: res.message });
      }
      await refreshAfp();
    } catch (err) {
      toast.error('Could not start card processing', { description: (err as Error).message });
    } finally {
      setHumanizeStarting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setPage(0);
  };

  const sorted = useMemo(() => {
    return [...cards].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortField) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'issuer': aVal = a.issuer; bVal = b.issuer; break;
        case 'annualFee': aVal = a.annualFee_scraped ?? 0; bVal = b.annualFee_scraped ?? 0; break;
        case 'signupBonus': aVal = a.signupBonus_scraped ?? ''; bVal = b.signupBonus_scraped ?? ''; break;
        case 'lastScraped': aVal = a.lastScraped?.toMillis?.() ?? 0; bVal = b.lastScraped?.toMillis?.() ?? 0; break;
        case 'lastChanged': aVal = a.lastChanged?.toMillis?.() ?? 0; bVal = b.lastChanged?.toMillis?.() ?? 0; break;
        case 'status': aVal = a.status; bVal = b.status; break;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [cards, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageCards = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allSelected = pageCards.length > 0 && pageCards.every((c) => selectedCardIds.has(c.id));

  const handleSelectAll = () => {
    if (allSelected) clearSelection();
    else selectAll(pageCards.map((c) => c.id));
  };

  const handleWebflowSync = async (cardId: string, cardName: string) => {
    toast.info(`Publishing ${cardName} to Webflow…`);
    try {
      await syncToWebflow({ cardId });
      toast.success(`${cardName} published to Webflow ✓`);
    } catch {
      toast.error('Webflow sync failed');
    }
  };

  const handleRunScraper = async () => {
    setConfirmScrape(null);
    setScraping(true);
    try {
      const result = await scrapeAllCards();
      toast.success(`Scrape complete: ${result.changed} updated, ${result.errors} errors.`);
    } catch {
      toast.error('Scraper failed');
    } finally {
      setScraping(false);
    }
  };

  const handleBulkPublish = async () => {
    const ids = Array.from(selectedCardIds);
    setBulkPublishing(true);
    toast.info(`Publishing ${ids.length} cards to Webflow…`);
    try {
      const result = await bulkSyncToWebflow({ cardIds: ids });
      toast.success(`Published ${result.synced.length} cards. ${result.failed.length} failed.`);
    } catch {
      toast.error('Bulk publish failed');
    } finally {
      setBulkPublishing(false);
    }
  };

  const handleBulkScrape = async () => {
    setConfirmScrape(null);
    const ids = Array.from(selectedCardIds);
    setBulkScraping(true);
    toast.info(`Scraping ${ids.length} cards… this may take a few minutes`);
    let changed = 0;
    let errors = 0;
    for (const cardId of ids) {
      try {
        const result = await scrapeCard({ cardId });
        if (result.changesDetected) changed++;
      } catch {
        errors++;
      }
    }
    toast.success(`Bulk scrape complete: ${changed} updated, ${errors} errors.`);
    setBulkScraping(false);
  };

  const handleExport = () => {
    const selectedCards = cards.filter((c) => selectedCardIds.has(c.id));
    const exportCards = selectedCards.length > 0 ? selectedCards : cards;
    const headers = ['Name', 'Issuer', 'Category', 'Status', 'Annual Fee', 'Signup Bonus', 'Last Scraped'];
    const rows = exportCards.map((c) => [
      c.name, c.issuer, c.category, c.status,
      // CMS-122: export the same override-aware values the list shows
      displayAnnualFee(c).replace('—', ''), displayCardValue(c, 'signupBonus'),
      c.lastScraped?.toMillis ? new Date(c.lastScraped.toMillis()).toISOString() : '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cards-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportCards.length} cards`);
  };

  const handleTogglePublish = async (card: CardDocument) => {
    const next = card.publishState === 'unpublished' ? 'published' : 'unpublished';
    try {
      await setCardPublishState({ cardId: card.id, publishState: next });
      toast.success(
        next === 'published'
          ? `Card "${card.name}" published`
          : `Card "${card.name}" unpublished — hidden from iframes and the card picker`
      );
    } catch {
      toast.error('Failed to update publish state');
    }
  };

  const SortTh = ({ field, label, size }: { field: SortField; label: string; size?: string }) => (
    <th
      className="text-left px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none whitespace-nowrap transition-colors hover:text-foreground"
      style={size ? { width: size } : undefined}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-[28px] font-display font-semibold tracking-tight text-foreground">Card Data Manager</h1>
          <p className="text-[13px] text-muted-foreground">Track card offers, monitor data changes, and publish updates to Webflow.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AddCardModal />
          <Button variant="outline" onClick={() => setConfirmScrape('all')} disabled={scraping} className="gap-1.5">
            {scraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {scraping ? 'Scraping…' : 'Run Scraper'}
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export Cards
          </Button>
        </div>
      </div>

      {/* CMS-116: page tabs — Cards (the manager) | Global Fields (shared
          card-review text: Our Mission, Rating Methodology). */}
      <div className="flex items-center gap-1 border-b border-border">
        {(['cards', 'global'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setPageTab(tab)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              pageTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'cards' ? 'Cards' : 'Global Fields'}
          </button>
        ))}
      </div>

      {pageTab === 'global' ? (
        <GlobalFieldsTab />
      ) : (
      <>

      {/* Scraper status inline */}
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5 text-[13px] text-muted-foreground flex-wrap">
        <span>Last scraped: <strong className="font-medium text-foreground">
          {scraperStatus.lastScrapedAt?.toMillis ? formatDate(scraperStatus.lastScrapedAt) : 'Never'}
        </strong></span>
        <span className="text-border">·</span>
        <span>Next scheduled: <strong className="font-medium text-foreground">
          {scraperStatus.nextScheduledAt?.toMillis ? formatDate(scraperStatus.nextScheduledAt) : 'Not scheduled'}
        </strong></span>
        <span className="text-border">·</span>
        <span>Scraper Health: <span className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${scraperStatus.health === 'healthy' ? 'bg-success' : scraperStatus.health === 'warning' ? 'bg-warning' : 'bg-destructive'}`} />
          <strong className={`font-medium ${scraperStatus.health === 'healthy' ? 'text-success' : scraperStatus.health === 'warning' ? 'text-amber-600' : 'text-destructive'}`}>
            {scraperStatus.health === 'healthy' ? 'Healthy' : scraperStatus.health === 'warning' ? 'Warning' : 'Errors'}
          </strong>
        </span></span>
        <span className="text-border">·</span>
        <button
          onClick={() => navigate('/settings?tab=scraper')}
          className="text-accent hover:underline flex items-center gap-1 transition-colors"
        >
          <Settings className="w-3 h-3" /> Manage scraper settings
        </button>
        {/* Card prose humanise queue — out-of-schedule wake (2026-09-09) */}
        {canRunHumanize && (cardsQueued > 0 || afpRunning) && (
          <>
            <span className="text-border">·</span>
            <button
              onClick={handleHumanizeNow}
              disabled={humanizeStarting || afpRunning || cardsQueued === 0}
              className="text-accent hover:underline flex items-center gap-1 transition-colors disabled:opacity-50 disabled:no-underline"
              title="Wake Gemma 4 to humanise the queued card prose now (the scheduler only runs at approved times)"
            >
              {(humanizeStarting || afpRunning) ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Humanizing{cardsQueued > 0 ? ` (${cardsQueued} left)` : '…'}</>
              ) : (
                <><Zap className="w-3 h-3" /> Humanize now ({cardsQueued} queued)</>
              )}
            </button>
          </>
        )}
      </div>

      {/* Stat cards */}
      <StatCards />

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Search cards..."
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <select
          value={filters.issuer || 'All'}
          onChange={(e) => setFilters({ issuer: e.target.value === 'All' ? '' : e.target.value })}
          className="h-9 rounded-md border border-border/70 bg-card px-3 text-[13px] text-foreground shadow-sm transition-colors hover:border-border focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {['All', 'Chase', 'American Express', 'Capital One', 'Citi', 'Barclays', 'US Bank', 'Wells Fargo', 'Bilt', 'Bank of America', 'Discover'].map((i) => (
            <option key={i} value={i}>{i === 'All' ? 'All Issuers' : i}</option>
          ))}
        </select>
        <select
          value={filters.category || 'All'}
          onChange={(e) => setFilters({ category: e.target.value === 'All' ? '' : e.target.value as any })}
          className="h-9 rounded-md border border-border/70 bg-card px-3 text-[13px] text-foreground shadow-sm transition-colors hover:border-border focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {['All', ...categories].map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>
        <select
          value={filters.status || 'All'}
          onChange={(e) => setFilters({ status: e.target.value === 'All' ? '' : e.target.value as any })}
          className="h-9 rounded-md border border-border/70 bg-card px-3 text-[13px] text-foreground shadow-sm transition-colors hover:border-border focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {['All', 'current', 'changed', 'outdated', 'new'].map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {(filters.issuer || filters.category || filters.status || filters.search) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ issuer: '', category: '', status: '', search: '' })}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Bulk actions */}
      {selectedCardIds.size > 0 && (
        <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-lg px-4 py-2 animate-fade-in">
          <span className="text-[13px] font-medium text-accent">{selectedCardIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={handleBulkPublish} disabled={bulkPublishing}>
            {bulkPublishing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Bulk Publish to Webflow
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmScrape('bulk')} disabled={bulkScraping}>
            {bulkScraping ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Bulk Run Scraper
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>Bulk Export</Button>
          <Button variant="ghost" size="sm" onClick={clearSelection} className="ml-auto"><X className="w-3 h-3" /></Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border/70 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40">
                {Array.from({ length: 12 }).map((_, i) => (
                  <th key={i} className="px-3 py-3"><Skeleton className="h-4 w-16" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border/60">
                  {Array.from({ length: 12 }).map((_, j) => (
                    <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 shadow-card py-16 text-center bg-card animate-fade-in">
          <p className="text-[13px] text-muted-foreground mb-4">No cards yet. Add your first card to get started.</p>
          <AddCardModal />
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border/70 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border/70 bg-muted/40">
                    <th className="px-3 py-3 w-10">
                      <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} aria-label="Select all" />
                    </th>
                    <SortTh field="name" label="Card Name" />
                    <SortTh field="issuer" label="Issuer" size="100px" />
                    <SortTh field="annualFee" label="Annual Fee" size="90px" />
                    <SortTh field="signupBonus" label="Signup Bonus" size="120px" />
                    <th className="text-left px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap" style={{ width: '130px' }}>Bonus Spend Req</th>
                    <th className="text-left px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap" style={{ width: '160px' }}>Bonus Prediction</th>
                    <SortTh field="lastScraped" label="Last Scraped" size="100px" />
                    <SortTh field="lastChanged" label="Last Changed" size="100px" />
                    <SortTh field="status" label="Status" size="90px" />
                    <th className="text-left px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap" style={{ width: '100px' }}>Webflow</th>
                    <th className="text-left px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap" style={{ width: '90px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageCards.map((card, i) => {
                    const approaching = card.bonusAvgChangeDays > 0 && card.bonusDaysActive / card.bonusAvgChangeDays > 0.8;
                    const recentChange = card.lastChanged?.toMillis && Date.now() - card.lastChanged.toMillis() < 7 * 86400000;
                    return (
                      <tr
                        key={card.id}
                        className={`border-b border-border/60 transition-colors hover:bg-muted/40 ${selectedCardIds.has(card.id) ? 'bg-accent/5' : i % 2 === 1 ? 'bg-muted/10' : ''}`}
                      >
                        <td className="px-3 py-3">
                          <Checkbox
                            checked={selectedCardIds.has(card.id)}
                            onCheckedChange={() => toggleCardSelection(card.id)}
                            aria-label={`Select ${card.name}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <button
                            className="text-[13px] font-medium text-foreground hover:text-accent transition-colors text-left flex items-center gap-2"
                            onClick={() => setActiveCardId(card.id)}
                          >
                            <IssuerLogo issuer={card.issuer} />
                            {/* CMS-123: show the overridden (saved) name when set */}
                            {displayCardValue(card, 'name')}
                            {isFieldOverridden(card, 'name') && <OverrideDot />}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{card.issuer}</td>
                        {/* CMS-122: override-aware display — the list shows the
                            SAVED (manual) value when a field is overridden,
                            not the raw scraper value. Amber dot = overridden. */}
                        <td className="px-3 py-3 text-[13px] tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            {displayAnnualFee(card)}
                            {isFieldOverridden(card, 'annualFee') && <OverrideDot />}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[12px] max-w-[120px] truncate">
                          <span className="inline-flex items-center gap-1.5">
                            {displayCardValue(card, 'signupBonus') || '—'}
                            {isFieldOverridden(card, 'signupBonus') && <OverrideDot />}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[12px] max-w-[130px] truncate text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            {displayCardValue(card, 'bonusSpendReq') || '—'}
                            {isFieldOverridden(card, 'bonusSpendReq') && <OverrideDot />}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {card.bonusAvgChangeDays > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`text-[12px] tabular-nums ${approaching ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                    {card.bonusDaysActive}d at current · Avg: {card.bonusAvgChangeDays}d
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {approaching ? 'Approaching typical change window' : 'Within normal bonus cycle'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : <span className="text-muted-foreground text-[12px]">—</span>}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{formatDate(card.lastScraped)}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[12px] ${recentChange ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {formatDate(card.lastChanged)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Badge variant={statusConfig[card.status]?.variant ?? 'neutral'} className="whitespace-nowrap">
                              {statusConfig[card.status]?.label}
                            </Badge>
                            {card.publishState === 'unpublished' && (
                              <Badge variant="warning" className="whitespace-nowrap">Unpublished</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleWebflowSync(card.id, card.name)}
                            className="flex items-center hover:opacity-80 transition-opacity"
                          >
                            <Badge variant={webflowConfig[card.webflowStatus]?.variant ?? 'neutral'} className="whitespace-nowrap">
                              {webflowConfig[card.webflowStatus]?.label}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setActiveCardId(card.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60">
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => setActiveCardId(card.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleWebflowSync(card.id, card.name)} className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60">
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            {canTogglePublish && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleTogglePublish(card)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60"
                                    >
                                      {card.publishState === 'unpublished' ? (
                                        <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                      ) : (
                                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {card.publishState === 'unpublished'
                                      ? 'Unpublished — hidden from iframes. Click to publish.'
                                      : 'Published — visible in iframes. Click to unpublish.'}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-[13px] text-muted-foreground">
              <span className="tabular-nums">Page {page + 1} of {totalPages} · {sorted.length} cards</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </>
      )}

      <CardDetailPanel />

      {/* Warning shown before ANY scrape starts — bulk selection and full runs
          alike (CMS-51). "Run Scraper" intentionally passes no cardCount: it
          scrapes every card that is due, not the currently filtered list. */}
      <ConfirmScrapeDialog
        open={confirmScrape !== null}
        onOpenChange={(open) => { if (!open) setConfirmScrape(null); }}
        onConfirm={confirmScrape === 'bulk' ? handleBulkScrape : handleRunScraper}
        cardCount={confirmScrape === 'bulk' ? selectedCardIds.size : undefined}
      />
    </div>
  );
}
