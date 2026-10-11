import { useState, useMemo } from 'react';
import { Link } from '@/lib/router-compat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Flame, Bell, ArrowRight, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useTransferPartners } from '../../hooks/useTransferPartners';
import type {
  CardDocument,
  CardProgram,
  TransferPartnerDocument,
  ProgramEntry,
  TransferSpeed,
  AllianceGroup,
  SweetSpotRedemption,
} from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardTransferPartnersTabProps {
  card: CardDocument;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_LABELS: Record<CardProgram, string> = {
  'chase-ur': 'Chase Ultimate Rewards',
  'amex-mr': 'Amex Membership Rewards',
  'capital-one': 'Capital One Miles',
  'bilt': 'Bilt Rewards',
  'citi-ty': 'Citi ThankYou',
  'wells-fargo': 'Wells Fargo Rewards',
};

const ISSUER_TO_PROGRAM: Record<string, CardProgram> = {
  'Chase': 'chase-ur',
  'American Express': 'amex-mr',
  'Capital One': 'capital-one',
  'Bilt': 'bilt',
  'Citi': 'citi-ty',
  'Wells Fargo': 'wells-fargo',
};

const speedDot: Record<TransferSpeed, string> = {
  'instant': 'bg-green-500',
  '1-2-days': 'bg-amber-500',
  '3-5-days': 'bg-orange-500',
  'up-to-7-days': 'bg-muted-foreground',
  '3-plus-days': 'bg-muted-foreground',
};

const speedLabel: Record<TransferSpeed, string> = {
  'instant': 'Instant',
  '1-2-days': '1-2 days',
  '3-5-days': '3-5 days',
  'up-to-7-days': 'Up to 7 days',
  '3-plus-days': '3+ days',
};

const typeBadge: Record<'airline' | 'hotel', string> = {
  airline: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  hotel: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CardTransferPartnersTab({ card }: CardTransferPartnersTabProps) {
  const programId = ISSUER_TO_PROGRAM[card.issuer] ?? null;

  const { partners: allPartners, activeBonus, loading } = useTransferPartners({
    search: '',
    type: 'all',
    alliance: 'all',
    speed: 'all',
    bonusesOnly: false,
    visiblePrograms: programId ? [programId] : [],
  });

  const [typeFilter, setTypeFilter] = useState<'All' | 'airline' | 'hotel'>('All');
  const [allianceFilter, setAllianceFilter] = useState<AllianceGroup | 'All'>('All');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [showAllBonuses, setShowAllBonuses] = useState(false);

  // Filter partners that have an entry for this card's program
  const partners = useMemo(() => {
    if (!programId) return [];
    return allPartners.filter(tp => {
      const entry = tp.programs?.[programId];
      if (!entry) return false;
      if (typeFilter !== 'All' && tp.type !== typeFilter) return false;
      if (allianceFilter !== 'All' && tp.alliance !== allianceFilter) return false;
      if (activeFilter === 'Active') {
        // Active means the entry exists and has a current bonus or is generally active
        const now = Date.now();
        const hasActiveBonus = entry.bonusPercent !== null && entry.bonusEndDate &&
          (entry.bonusEndDate.toMillis ? entry.bonusEndDate.toMillis() : 0) > now;
        if (!hasActiveBonus) return false;
      }
      if (activeFilter === 'Inactive') {
        const now = Date.now();
        const hasActiveBonus = entry.bonusPercent !== null && entry.bonusEndDate &&
          (entry.bonusEndDate.toMillis ? entry.bonusEndDate.toMillis() : 0) > now;
        if (hasActiveBonus) return false;
      }
      return true;
    });
  }, [allPartners, programId, typeFilter, allianceFilter, activeFilter]);

  // Active bonuses for this program and others
  const programBonuses = programId
    ? activeBonus.filter(b => b.program === programId)
    : [];
  const otherBonuses = programId
    ? activeBonus.filter(b => b.program !== programId)
    : activeBonus;
  const combinedBonuses = [...programBonuses, ...otherBonuses];
  const visibleBonuses = showAllBonuses ? combinedBonuses : combinedBonuses.slice(0, 3);
  const hiddenCount = combinedBonuses.length - 3;

  if (!programId) {
    return (
      <div className="text-center text-muted-foreground py-12 text-sm">
        This card is not part of a transferable points program.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
        <div className="h-10 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const programName = PROGRAM_LABELS[programId] || programId;

  return (
    <div className="space-y-4">
      {/* Active Transfer Bonus Banners */}
      {combinedBonuses.length > 0 && (
        <div className="space-y-2">
          {visibleBonuses.map(b => {
            const endMs = b.entry.bonusEndDate?.toMillis ? b.entry.bonusEndDate.toMillis() : 0;
            const daysLeft = Math.ceil((endMs - Date.now()) / 86400000);
            const endDateStr = endMs ? new Date(endMs).toLocaleDateString() : '—';
            return (
              <div key={`${b.partner.id}-${b.program}`} className="flex items-center justify-between gap-3 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg px-3 py-2">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-foreground">
                    <strong>Active Transfer Bonus:</strong> {b.partner.name} — +{b.entry.bonusPercent}% through {endDateStr} ({daysLeft}d left)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs gap-1 border-teal-600/40 text-teal-600 hover:bg-teal-600/10"
                    onClick={() => toast.success(`${b.partner.name} +${b.entry.bonusPercent}% bonus added to newsletter queue`)}
                  >
                    <Mail className="w-3 h-3" /> Add to Newsletter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => toast.success(`Team notified about ${b.partner.name} bonus`)}
                  >
                    <Bell className="w-3 h-3" /> Alert Team
                  </Button>
                </div>
              </div>
            );
          })}
          {!showAllBonuses && hiddenCount > 0 && (
            <button
              onClick={() => setShowAllBonuses(true)}
              className="text-xs text-teal-600 hover:underline px-3"
            >
              + {hiddenCount} more active {hiddenCount === 1 ? 'bonus' : 'bonuses'}
            </button>
          )}
        </div>
      )}

      {/* Program Badge */}
      <div className="flex items-center gap-3 p-3 bg-teal-600/5 border border-teal-600/20 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-teal-600/20 flex items-center justify-center text-teal-600 font-bold text-sm">
          {programName.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{programName}</div>
          <div className="text-xs text-muted-foreground">Transfer partners available via this card's rewards program</div>
        </div>
        <Badge variant="outline" className="ml-auto text-xs bg-teal-600/10 text-teal-600 border-teal-600/30">
          {partners.length} partners
        </Badge>
      </div>

      {/* Filters + View Full Matrix link */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as 'All' | 'airline' | 'hotel')}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        >
          <option value="All">All Types</option>
          <option value="airline">Airline</option>
          <option value="hotel">Hotel</option>
        </select>
        <select
          value={allianceFilter}
          onChange={e => setAllianceFilter(e.target.value as AllianceGroup | 'All')}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        >
          <option value="All">All Alliances</option>
          <option value="Star Alliance">Star Alliance</option>
          <option value="Oneworld">Oneworld</option>
          <option value="SkyTeam">SkyTeam</option>
          <option value="Non-Alliance">Non-Alliance</option>
          <option value="Hotels">Hotels</option>
        </select>
        <select
          value={activeFilter}
          onChange={e => setActiveFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <Link
          to="/cards/transfer-partners"
          className="ml-auto flex items-center gap-1 text-sm text-teal-600 hover:underline font-medium"
        >
          View Full Transfer Matrix <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Partners Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-blue-50/50 dark:bg-muted/30">
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Partner Name</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Alliance</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Ratio</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Speed</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Active</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No transfer partners match the current filters.
                </td>
              </tr>
            ) : (
              partners.map((tp, i) => {
                const entry = tp.programs?.[programId];
                if (!entry) return null;
                const isExpanded = expandedPartner === tp.id;
                return (
                  <PartnerRow
                    key={tp.id}
                    tp={tp}
                    entry={entry}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedPartner(isExpanded ? null : tp.id)}
                    even={i % 2 === 1}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Partner Row ──────────────────────────────────────────────────────────────

function PartnerRow({ tp, entry, isExpanded, onToggle, even }: {
  tp: TransferPartnerDocument;
  entry: ProgramEntry;
  isExpanded: boolean;
  onToggle: () => void;
  even: boolean;
}) {
  const now = Date.now();
  const hasActiveBonus = entry.bonusPercent !== null && entry.bonusEndDate &&
    (entry.bonusEndDate.toMillis ? entry.bonusEndDate.toMillis() : 0) > now;

  return (
    <>
      <tr className={`border-b border-border hover:bg-blue-50/30 dark:hover:bg-muted/30 ${even ? 'bg-muted/20' : ''}`}>
        <td className="px-3 py-2.5">
          <button onClick={onToggle} className="flex items-center gap-1.5 text-teal-600 hover:underline font-medium">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {tp.name}
          </button>
        </td>
        <td className="px-3 py-2.5">
          <Badge variant="outline" className={`text-[10px] ${typeBadge[tp.type]}`}>
            {tp.type === 'airline' ? 'Airline' : 'Hotel'}
          </Badge>
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground">{tp.alliance}</td>
        <td className="px-3 py-2.5 font-mono text-xs font-medium">{entry.ratio}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${speedDot[entry.speed] || 'bg-muted-foreground'}`} />
            <span className="text-xs">{speedLabel[entry.speed] || entry.speed}</span>
          </div>
        </td>
        <td className="px-3 py-2.5">
          {hasActiveBonus
            ? <span className="text-green-600 font-medium">✓</span>
            : <span className="text-red-600">✗</span>}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/10">
          <td colSpan={6} className="px-6 py-3 space-y-2">
            {tp.awardNotes && (
              <p className="text-xs text-muted-foreground">{tp.awardNotes}</p>
            )}
            {tp.sweetSpots && tp.sweetSpots.length > 0 && (
              <div>
                <span className="text-xs font-medium text-foreground">Sweet Spots:</span>
                <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                  {tp.sweetSpots.map((s: SweetSpotRedemption, i: number) => (
                    <li key={i}>
                      {s.route} — {s.points.toLocaleString()} pts ({s.cabin}){s.notes ? ` · ${s.notes}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tp.loyaltyProgram && (
              <p className="text-xs text-muted-foreground">
                Loyalty Program: <span className="font-medium text-foreground">{tp.loyaltyProgram}</span>
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
