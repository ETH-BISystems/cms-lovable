import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Flag, ChevronLeft, ChevronRight, TrendingUp, Clock, Zap, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useTransferPartners } from '../../hooks/useTransferPartners';
import type {
  CardDocument,
  ChangeHistoryEntry,
  OfferHistoryEntry,
  TransferBonusHistoryEntry,
  CardProgram,
} from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardChangeHistoryTabProps {
  card: CardDocument;
  changeHistory: ChangeHistoryEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const fieldTypeBadge: Record<string, string> = {
  scraper: 'bg-green-500/10 text-green-600 border-green-500/30',
  manual: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  webflow: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  'webflow-sync': 'bg-purple-500/10 text-purple-600 border-purple-500/30',
};

const statusStyles: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-600 border-green-500/30',
  Expired: 'bg-muted text-muted-foreground border-border',
  Upcoming: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

const ISSUER_TO_PROGRAM: Record<string, CardProgram> = {
  'Chase': 'chase-ur',
  'American Express': 'amex-mr',
  'Capital One': 'capital-one',
  'Bilt': 'bilt',
  'Citi': 'citi-ty',
  'Wells Fargo': 'wells-fargo',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBonusNumber(amount: string): number {
  const match = amount.replace(/,/g, '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function durationColor(days: number, avg: number): string {
  if (days < avg * 0.85) return 'text-green-600';
  if (days > avg * 1.15) return 'text-red-600';
  return 'text-amber-600';
}

function daysRemaining(endDate: Date | null): number | null {
  if (!endDate) return null;
  const diff = endDate.getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86400000) : null;
}

function timeAgo(date: Date | null): string {
  if (!date) return '—';
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/**
 * Derive offer history entries from change history.
 * Groups consecutive signupBonus changes into offer periods.
 */
function deriveOfferHistory(changeHistory: ChangeHistoryEntry[]): OfferHistoryEntry[] {
  const bonusChanges = changeHistory
    .filter(c => c.field === 'signupBonus' || c.field === 'signupBonus_scraped')
    .sort((a, b) => {
      const aMs = a.changedAt?.toMillis ? a.changedAt.toMillis() : 0;
      const bMs = b.changedAt?.toMillis ? b.changedAt.toMillis() : 0;
      return bMs - aMs; // newest first
    });

  if (bonusChanges.length === 0) return [];

  const entries: OfferHistoryEntry[] = [];
  for (let i = 0; i < bonusChanges.length; i++) {
    const change = bonusChanges[i];
    const startMs = change.changedAt?.toMillis ? change.changedAt.toMillis() : 0;
    const startDate = new Date(startMs);
    const endDate = i > 0
      ? new Date(bonusChanges[i - 1].changedAt?.toMillis ? bonusChanges[i - 1].changedAt.toMillis() : 0)
      : null;
    const durationDays = endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)
      : Math.ceil((Date.now() - startDate.getTime()) / 86400000);

    // Try to extract spend requirement from nearby changes
    const spendChange = changeHistory.find(c =>
      (c.field === 'bonusSpendReq' || c.field === 'bonusSpendReq_scraped') &&
      c.changedAt?.toMillis && Math.abs((c.changedAt.toMillis()) - startMs) < 86400000
    );

    entries.push({
      id: `oh-${i}`,
      bonusAmount: String(change.newValue ?? '—'),
      spendRequirement: spendChange ? String(spendChange.newValue ?? '—') : '—',
      timeframe: '—',
      startDate,
      endDate,
      durationDays: Math.max(durationDays, 1),
    });
  }

  return entries;
}

/**
 * Derive transfer bonus history from transfer partner data for this card's program.
 */
function deriveTransferBonusHistory(
  activeBonus: Array<{ partner: { id: string; name: string }; program: CardProgram; entry: { bonusPercent: number | null; bonusEndDate: { toMillis?: () => number } | null; ratio: string } }>,
  programId: CardProgram | null,
): TransferBonusHistoryEntry[] {
  if (!programId) return [];

  const now = Date.now();
  return activeBonus
    .filter(b => b.program === programId)
    .map((b, i) => {
      const endMs = b.entry.bonusEndDate?.toMillis ? b.entry.bonusEndDate.toMillis() : 0;
      const endDate = endMs ? new Date(endMs) : null;
      // Estimate start date as 30 days before end for display
      const startDate = endDate ? new Date(endDate.getTime() - 30 * 86400000) : new Date();
      const durationDays = endDate
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)
        : 0;
      const isActive = endMs > now;

      return {
        id: `tb-${i}`,
        partnerName: b.partner.name,
        partnerCode: b.partner.name.substring(0, 2).toUpperCase(),
        partnerColor: '#0d9488',
        bonusPercent: b.entry.bonusPercent ?? 0,
        effectiveRatio: b.entry.ratio || '1:1',
        startDate,
        endDate,
        durationDays,
        status: (isActive ? 'Active' : 'Expired') as 'Active' | 'Expired' | 'Upcoming',
      };
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardChangeHistoryTab({ card, changeHistory }: CardChangeHistoryTabProps) {
  const programId = ISSUER_TO_PROGRAM[card.issuer] ?? null;

  const { activeBonus } = useTransferPartners({
    search: '',
    type: 'all',
    alliance: 'all',
    speed: 'all',
    bonusesOnly: false,
    visiblePrograms: programId ? [programId] : [],
  });

  const [fieldTypeFilter, setFieldTypeFilter] = useState('All');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // ── Signup Bonus History ──
  const offerHistory = useMemo(() => deriveOfferHistory(changeHistory), [changeHistory]);

  const avgDuration = offerHistory.length >= 2
    ? Math.round(offerHistory.reduce((sum, e) => sum + e.durationDays, 0) / offerHistory.length)
    : null;

  const maxBonus = Math.max(...offerHistory.map(e => parseBonusNumber(e.bonusAmount)), 0);

  // ── Transfer Bonus History ──
  const transferBonuses = useMemo(
    () => deriveTransferBonusHistory(activeBonus, programId),
    [activeBonus, programId],
  );

  const activeBonuses = transferBonuses.filter(b => b.status === 'Active').length;
  const bonusesPerYear = useMemo(() => {
    if (transferBonuses.length < 2) return 0;
    const timestamps = transferBonuses.map(b => b.startDate.getTime());
    const range = Math.max(...timestamps) - Math.min(...timestamps);
    if (range <= 0) return 0;
    return Math.round((transferBonuses.length / range) * 365 * 86400000 * 10) / 10;
  }, [transferBonuses]);

  // ── Change Log ──
  const filtered = useMemo(() => {
    if (fieldTypeFilter === 'All') return changeHistory;
    return changeHistory.filter(c => c.source === fieldTypeFilter);
  }, [changeHistory, fieldTypeFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleNotify = (entry: ChangeHistoryEntry) => {
    toast.info(`Team notified about ${entry.field} change`);
  };

  const handleFlagArticles = () => {
    toast.info('Articles flagged for refresh');
  };

  return (
    <div className="space-y-8">
      {/* ── SIGNUP BONUS HISTORY ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Signup Bonus History</h3>
        </div>

        {/* Stat cards row */}
        {avgDuration !== null && offerHistory.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-teal-600/5 border border-teal-600/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-teal-600">{avgDuration}d</div>
              <div className="text-[10px] text-muted-foreground">Avg Duration</div>
            </div>
            <div className="bg-teal-600/5 border border-teal-600/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-teal-600">{offerHistory[0]?.bonusAmount ?? '—'}</div>
              <div className="text-[10px] text-muted-foreground">Current Offer</div>
            </div>
            <div className="bg-teal-600/5 border border-teal-600/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-teal-600">{offerHistory.length}</div>
              <div className="text-[10px] text-muted-foreground">Offers Tracked</div>
            </div>
          </div>
        ) : null}

        {offerHistory.length < 2 ? (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            Not enough history to calculate prediction. Data builds over time.
          </p>
        ) : (
          <>
            {/* Mini timeline chart — horizontal bar chart */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                Bonus Amount Over Time
              </div>
              <div className="space-y-1">
                {offerHistory.map((entry, i) => {
                  const num = parseBonusNumber(entry.bonusAmount);
                  const pct = maxBonus > 0 ? (num / maxBonus) * 100 : 0;
                  const isCurrent = i === 0;
                  return (
                    <div key={entry.id} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20 text-right shrink-0">
                        {entry.startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      </span>
                      <div className="flex-1 h-5 bg-muted/20 rounded-sm overflow-hidden">
                        <div
                          className={`h-full rounded-sm flex items-center px-1.5 text-[9px] font-semibold text-white transition-all ${isCurrent ? 'bg-teal-600' : 'bg-teal-400'}`}
                          style={{ width: `${Math.max(pct, 12)}%`, opacity: isCurrent ? 1 : 1 - i * 0.08 }}
                        >
                          {entry.bonusAmount}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 shrink-0">{entry.durationDays}d</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Bonus</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Spend Req</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Timeframe</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Start</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">End</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {offerHistory.map((entry, i) => (
                    <tr key={entry.id} className={`border-b border-border last:border-0 ${i === 0 ? 'bg-teal-600/5' : i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {entry.bonusAmount}
                        {i === 0 && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] bg-teal-600/10 text-teal-600 border-teal-600/30">
                            Current
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.spendRequirement}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.timeframe}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.startDate.toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.endDate ? entry.endDate.toLocaleDateString() : '—'}</td>
                      <td className={`px-3 py-2.5 font-medium ${avgDuration ? durationColor(entry.durationDays, avgDuration) : 'text-muted-foreground'}`}>
                        {entry.durationDays}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── TRANSFER BONUS HISTORY ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Transfer Bonus History</h3>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-600">{activeBonuses}</div>
            <div className="text-[10px] text-muted-foreground">Active Now</div>
          </div>
          <div className="bg-teal-600/5 border border-teal-600/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-teal-600">{transferBonuses.length}</div>
            <div className="text-[10px] text-muted-foreground">Total Tracked</div>
          </div>
          <div className="bg-teal-600/5 border border-teal-600/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-teal-600">~{bonusesPerYear || '—'}</div>
            <div className="text-[10px] text-muted-foreground">Per Year Avg</div>
          </div>
        </div>

        {/* Dot timeline */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] text-muted-foreground mb-3 font-medium uppercase tracking-wide">
            Bonus Frequency (Last 12 Months)
          </div>
          <div className="flex items-end gap-1 h-8">
            {Array.from({ length: 12 }).map((_, monthIdx) => {
              const monthStart = new Date(Date.now() - (11 - monthIdx) * 30 * 86400000);
              const monthEnd = new Date(monthStart.getTime() + 30 * 86400000);
              const count = transferBonuses.filter(
                b => b.startDate >= monthStart && b.startDate < monthEnd,
              ).length;
              return (
                <div key={monthIdx} className="flex-1 flex flex-col items-center gap-0.5">
                  {count > 0 ? (
                    Array.from({ length: count }).map((_, di) => (
                      <div key={di} className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                    ))
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
                  )}
                  <span className="text-[8px] text-muted-foreground mt-0.5">
                    {monthStart.toLocaleDateString('en-US', { month: 'narrow' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfer Bonus Table */}
        {transferBonuses.length > 0 ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Partner</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Bonus</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Eff. Ratio</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Start</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">End</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {transferBonuses.map((entry, i) => {
                  const remaining = daysRemaining(entry.endDate);
                  const isActive = entry.status === 'Active';
                  return (
                    <tr key={entry.id} className={`border-b border-border last:border-0 ${isActive ? 'bg-green-500/5' : i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: entry.partnerColor }}
                          >
                            {entry.partnerCode}
                          </div>
                          <span className="text-foreground font-medium">{entry.partnerName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">
                          +{entry.bonusPercent}%
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-[11px]">{entry.effectiveRatio}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.startDate.toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.endDate ? entry.endDate.toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2.5">
                        {isActive && remaining !== null ? (
                          <span className={`font-medium ${remaining < 30 ? 'text-amber-600' : 'text-green-600'}`}>
                            {remaining}d left
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{entry.durationDays}d</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={`text-[10px] ${statusStyles[entry.status]}`}>
                          {entry.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            No transfer bonus history available for this card's program.
          </p>
        )}
      </section>

      {/* ── SOURCE CHANGE HISTORY ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Source Change History</h3>
          <span className="text-[10px] text-muted-foreground">(from TPG / Daily Drop / OMAAT)</span>
        </div>

        {(!card.sourceChangeHistory || card.sourceChangeHistory.length === 0) ? (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            No source change history available. History will populate after scraping pages that contain offer/bonus change tables.
          </p>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Bonus Amount</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Spend Requirement</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {[...card.sourceChangeHistory]
                  .sort((a, b) => {
                    // Sort by date descending — attempt to parse dates for comparison
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
                    // Fallback to string comparison if dates are not parseable
                    return b.date.localeCompare(a.date);
                  })
                  .map((entry, i) => (
                    <tr key={`${entry.date}-${entry.bonusAmount}-${i}`} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.date}</td>
                      <td className="px-3 py-2.5 text-foreground font-medium">{entry.bonusAmount}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.spendRequirement}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{entry.details || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── CHANGE LOG ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-semibold">Change Log</h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={fieldTypeFilter}
              onChange={e => { setFieldTypeFilter(e.target.value); setPage(0); }}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              <option value="All">All Sources</option>
              <option value="scraper">Scraper</option>
              <option value="manual">Manual</option>
              <option value="webflow">Webflow</option>
              <option value="webflow-sync">Webflow Sync</option>
            </select>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleFlagArticles}>
              <Flag className="w-3 h-3" /> Flag Articles
            </Button>
          </div>
        </div>

        {paged.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No change history yet.</p>
        ) : (
          <div className="space-y-2">
            {paged.map((entry, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${fieldTypeBadge[entry.source] || 'bg-muted text-muted-foreground border-border'}`}>
                      {entry.source}
                    </Badge>
                    <span className="text-sm font-medium">{entry.field}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {entry.changedAt?.toMillis
                        ? timeAgo(new Date(entry.changedAt.toMillis()))
                        : '—'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => handleNotify(entry)}
                    >
                      <Bell className="w-3 h-3" /> Notify
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="line-through text-red-500/70">{String(entry.oldValue ?? '—')}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-green-600 font-medium bg-green-500/10 px-1.5 py-0.5 rounded">
                    {String(entry.newValue ?? '—')}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Changed by: {entry.changedBy}</p>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="p-1 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
