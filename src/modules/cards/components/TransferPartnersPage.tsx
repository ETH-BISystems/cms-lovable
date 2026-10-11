/**
 * TransferPartnersPage — /cards/transfer-partners (also the Matrix data tab of
 * the stand-alone Transfer Partner Tables section)
 *
 * The Transfer Partner Matrix: 75+ partners across 6 card programs, grouped
 * by alliance, with live Firestore data, point-sale banner, filters, program
 * column toggles, edit mode (cell edits, add/remove partner, point sales),
 * CSV export, and the TPG "Scrape Now" refresh (per-cell manualOverride
 * protection; last-scraped status line).
 */
import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Pencil, RefreshCw, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTransferPartners } from '../hooks/useTransferPartners';
import { transferPartnerService, exportMatrixCsv, type TpScrapeSummary } from '../services/transferPartnerService';
import { TransferMatrixTable } from './TransferMatrixTable';
import { AddPartnerDialog } from './AddPartnerDialog';
import {
  ALL_PROGRAMS, PROGRAM_LABELS, PROGRAM_COLORS, PROGRAM_LOGOS,
} from './transferPartnerConstants';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types';
import type { TransferPartnerFilters, CardProgram, AllianceGroup } from '../types';

const ALLIANCE_OPTIONS: Array<{ value: AllianceGroup | 'all'; label: string }> = [
  { value: 'all', label: 'All Alliances' },
  { value: 'Star Alliance', label: 'Star Alliance' },
  { value: 'Oneworld', label: 'Oneworld' },
  { value: 'SkyTeam', label: 'SkyTeam' },
  { value: 'Non-Alliance', label: 'Non-Alliance' },
  { value: 'Hotels', label: 'Hotels' },
];

const DEFAULT_FILTERS: TransferPartnerFilters = {
  search: '',
  type: 'all',
  alliance: 'all',
  speed: 'all',
  bonusesOnly: false,
  visiblePrograms: ALL_PROGRAMS,
};

/** "Last scraped" line source — settings/tpMatrixScrape, written by scrapeTransferPartners. */
interface TpScrapeStatus {
  lastRunAt?: { toMillis?: () => number };
  valuationAsOf?: string;
}

function scrapedLabel(status: TpScrapeStatus | null): string | null {
  const ms = status?.lastRunAt?.toMillis?.();
  if (!ms) return null;
  const days = Math.floor((Date.now() - ms) / 86400000);
  const when = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  return status.valuationAsOf ? `${when} (TPG ${status.valuationAsOf} values)` : when;
}

export function TransferPartnersPage() {
  const [filters, setFilters] = useState<TransferPartnerFilters>(DEFAULT_FILTERS);
  const [editMode, setEditMode] = useState(false);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [addPartnerAlliance, setAddPartnerAlliance] = useState<AllianceGroup | undefined>(undefined);
  const [seeding, setSeeding] = useState(false);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<TpScrapeStatus | null>(null);
  const { partners, loading, error, allCount } = useTransferPartners(filters);
  const { role } = useAuth();

  const canEdit = role === Role.Admin || role === Role.Editor;
  const isAdmin = role === Role.Admin;

  useEffect(() => {
    // production: onSnapshot(doc(db, 'settings', 'tpMatrixScrape'))
    return transferPartnerService.subscribeToScrapeStatus((status) => {
      setScrapeStatus(status);
    });
  }, []);

  const setFilter = <K extends keyof TransferPartnerFilters>(key: K, value: TransferPartnerFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleProgram = (program: CardProgram) => {
    setFilters((prev) => {
      const current = prev.visiblePrograms;
      const next = current.includes(program)
        ? current.filter((p) => p !== program)
        : [...ALL_PROGRAMS.filter((p) => current.includes(p) || p === program)];
      return { ...prev, visiblePrograms: next };
    });
  };

  const lastScrapedLabel = useMemo(() => scrapedLabel(scrapeStatus), [scrapeStatus]);

  const handleExport = () => {
    exportMatrixCsv(partners, filters.visiblePrograms, PROGRAM_LABELS);
    toast.success('Matrix exported as CSV');
  };

  const handleScrape = async () => {
    setScrapeOpen(false);
    setScraping(true);
    try {
      const result: TpScrapeSummary = await transferPartnerService.scrapePartners();
      toast.success(`TPG scrape complete — ${result.cellsChanged} cell${result.cellsChanged === 1 ? '' : 's'} updated`, {
        description: [
          `${result.matched} partners matched${result.valuationAsOf ? ` · TPG values as of ${result.valuationAsOf}` : ''}`,
          result.created.length > 0 ? `New partners (in Ungrouped): ${result.created.join(', ')}` : null,
          result.missingFromTpg.length > 0 ? `Not on TPG anymore (untouched): ${result.missingFromTpg.length}` : null,
        ].filter(Boolean).join('\n'),
      });
    } catch (err) {
      toast.error('Scrape failed', { description: (err as Error).message });
    } finally {
      setScraping(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await transferPartnerService.seedMatrix();
      toast.success(`Matrix seeded: ${result.created} partners created`, {
        description: `${result.total} partners across 6 programs are now live.`,
      });
    } catch (err) {
      toast.error('Seeding failed', { description: (err as Error).message });
    } finally {
      setSeeding(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16 animate-fade-in">
        <p className="text-destructive">Failed to load transfer partners.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Transfer Partner Matrix</h1>
          <p className="text-[13px] text-muted-foreground">
            Transfer ratios, speeds, and bonuses across all card programs and partners.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setEditMode(!editMode)}
            >
              <Pencil className="h-3.5 w-3.5" /> {editMode ? 'Done Editing' : 'Edit Mode'}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={partners.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export Matrix
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setScrapeOpen(true)} disabled={scraping || allCount === 0}>
                {scraping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Scrape Now
              </Button>
              {/* CMS-105: scraping is on-demand only — no scheduled runs */}
              <span className="text-[10px] text-muted-foreground">manual only · never scheduled</span>
            </>
          )}
        </div>
      </div>

      {/* Meta line */}
      {allCount > 0 && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {lastScrapedLabel && (
            <>
              <span>Last scraped: <strong className="text-foreground">{lastScrapedLabel}</strong></span>
              <span>·</span>
            </>
          )}
          <span>{allCount} partners across {ALL_PROGRAMS.length} programs</span>
        </div>
      )}

      {/* Empty matrix — offer one-click seed to admins */}
      {!loading && allCount === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-card py-14 shadow-card animate-fade-in">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <p className="text-sm font-medium">The transfer partner matrix is empty</p>
          <p className="mt-1 max-w-md text-center text-xs text-muted-foreground">
            Load the full dataset — 75 partners (Star Alliance, Oneworld, SkyTeam, Non-Alliance, Hotels) with
            ratios, speeds, award release windows, and sweet spots across all 6 card programs.
          </p>
          {isAdmin ? (
            <Button className="mt-4" size="sm" onClick={handleSeed} disabled={seeding}>
              {seeding ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Seeding…</> : 'Seed 75 Partners'}
            </Button>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Ask an admin to seed the matrix.</p>
          )}
        </div>
      )}

      {allCount > 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search partners..."
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                className="h-9 pl-8 text-[13px]"
              />
            </div>

            <Select value={filters.type} onValueChange={(v) => setFilter('type', v as TransferPartnerFilters['type'])}>
              <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="airline">Airlines</SelectItem>
                <SelectItem value="hotel">Hotels</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.alliance} onValueChange={(v) => setFilter('alliance', v as TransferPartnerFilters['alliance'])}>
              <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALLIANCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.speed} onValueChange={(v) => setFilter('speed', v as TransferPartnerFilters['speed'])}>
              <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Speeds</SelectItem>
                <SelectItem value="instant">Instant Only</SelectItem>
                <SelectItem value="1-2-days">Same Day / 1-2 Days</SelectItem>
                <SelectItem value="3-5-days">3-5 Days</SelectItem>
                <SelectItem value="up-to-7-days">Up to 7 Days</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <Switch checked={filters.bonusesOnly} onCheckedChange={(v) => setFilter('bonusesOnly', v)} className="scale-90" />
              Bonuses Only
            </label>
          </div>

          {/* Program column toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Programs:</span>
            {ALL_PROGRAMS.map((program) => {
              const colors = PROGRAM_COLORS[program];
              const visible = filters.visiblePrograms.includes(program);
              return (
                <button
                  key={program}
                  onClick={() => toggleProgram(program)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition-all ${
                    visible
                      ? `border-border/50 ${colors.bg} ${colors.text} shadow-sm`
                      : 'border-border bg-muted/30 text-muted-foreground line-through opacity-50'
                  }`}
                  aria-pressed={visible}
                >
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[7px] font-bold text-white ${colors.badge}`}>
                    {PROGRAM_LOGOS[program]}
                  </span>
                  {PROGRAM_LABELS[program]}
                </button>
              );
            })}
          </div>

          {/* Matrix */}
          <TransferMatrixTable
            partners={partners}
            loading={loading}
            visiblePrograms={filters.visiblePrograms}
            editMode={editMode && canEdit}
            onAddPartner={(alliance) => {
              setAddPartnerAlliance(alliance);
              setAddPartnerOpen(true);
            }}
          />
        </>
      )}

      {loading && allCount === 0 && (
        <TransferMatrixTable partners={[]} loading visiblePrograms={filters.visiblePrograms} />
      )}

      <AddPartnerDialog open={addPartnerOpen} onOpenChange={setAddPartnerOpen} defaultAlliance={addPartnerAlliance} />

      {/* Scrape Now confirmation — scraped values replace everything except
          cells/partners flagged as manual overrides */}
      <AlertDialog open={scrapeOpen} onOpenChange={setScrapeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scrape the TPG transfer tables?</AlertDialogTitle>
            <AlertDialogDescription>
              This re-reads The Points Guy transfer-partner page and updates every ratio and TPG
              valuation in the matrix to match. Cells flagged <strong>Manual</strong> (override) are
              never touched; every change is logged to the partner's change history. Scraping runs
              only when you click this button — there are no scheduled scrapes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleScrape}>Scrape Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
