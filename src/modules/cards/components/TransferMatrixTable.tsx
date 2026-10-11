/**
 * TransferMatrixTable — the transfer partner matrix grid.
 *
 * Sticky header + sticky partner column, program-branded column headers,
 * alliance group sections with collapsible headers, partner rows with brand
 * logo tiles, award release column with verification tooltip, transfer cells
 * (see TransferCell), inline expanded detail rows, and edit-mode Add Partner
 * affordances per alliance group.
 */
import { Fragment, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { ChevronDown, ChevronRight, FileText, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { AssetPickerDialog } from '@/modules/assets';
import { transferPartnerService } from '../services/transferPartnerService';
import { TransferCell } from './TransferCell';
import {
  PROGRAM_LABELS, PROGRAM_COLORS, PROGRAM_LOGOS, CITI_NOTE, AVIOS_NOTE, ALLIANCE_BADGES, ALL_PROGRAMS,
} from './transferPartnerConstants';
import type { TransferPartnerDocument, AllianceGroup, CardProgram } from '../types';

const ALLIANCE_GROUPS: AllianceGroup[] = ['Star Alliance', 'Oneworld', 'SkyTeam', 'Non-Alliance', 'Hotels'];

/** Scraper-created partners (alliance '') render in their own section until assigned. */
const UNGROUPED_LABEL = 'Ungrouped — set an alliance to publish';

interface TransferMatrixTableProps {
  partners: TransferPartnerDocument[];
  loading: boolean;
  visiblePrograms?: CardProgram[];
  editMode?: boolean;
  onAddPartner?: (alliance: AllianceGroup) => void;
}

/** Alliance '' (scraper-created) partners, rendered after the named groups. */
function ungroupedPartners(partners: TransferPartnerDocument[]): TransferPartnerDocument[] {
  return partners.filter((p) => !p.alliance);
}

/** Compact relative time for the scrape stamp ("today" / "3d ago"). */
function relTimeShort(ts: { toMillis?: () => number } | null | undefined): string {
  if (!ts?.toMillis) return 'never';
  const days = Math.floor((Date.now() - ts.toMillis()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export function TransferMatrixTable({
  partners,
  loading,
  visiblePrograms = ALL_PROGRAMS,
  editMode = false,
  onAddPartner,
}: TransferMatrixTableProps) {
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<AllianceGroup>>(new Set());
  const navigate = useNavigate();

  const toggleGroup = (group: AllianceGroup) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-card">
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const colCount = 2 + visiblePrograms.length;

  return (
    <TooltipProvider>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
        <div className="max-h-[65vh] overflow-y-auto overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-border">
                <th className="sticky left-0 z-30 min-w-[210px] border-r border-border bg-muted/80 px-3 py-2.5 text-left font-medium text-muted-foreground backdrop-blur">
                  Partner
                </th>
                <th className="min-w-[88px] bg-muted/80 px-2 py-2.5 text-center font-medium text-muted-foreground backdrop-blur">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help border-b border-dashed border-muted-foreground">Award Release</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      How far in advance this airline releases award seats for booking. "Partner differs" means booking
                      through a transfer partner may have a different availability window than booking directly.
                    </TooltipContent>
                  </Tooltip>
                </th>
                {visiblePrograms.map((program) => {
                  const colors = PROGRAM_COLORS[program];
                  const isCiti = program === 'citi-ty';
                  return (
                    <th key={program} className={`min-w-[100px] px-1 py-2 text-center font-medium ${colors.bg}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate('/cards')}
                            className={`inline-flex items-center gap-1 text-[10px] leading-tight ${colors.text} hover:underline`}
                          >
                            <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[7px] font-bold text-white ${colors.badge}`}>
                              {PROGRAM_LOGOS[program]}
                            </span>
                            {PROGRAM_LABELS[program]}
                            {isCiti && <span className="ml-0.5 text-warning">*</span>}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {isCiti ? CITI_NOTE : `View ${PROGRAM_LABELS[program]} cards in the Card Data Manager`}
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    No transfer partners match the current filters.
                  </td>
                </tr>
              )}
              {ALLIANCE_GROUPS.map((group) => {
                const groupPartners = partners.filter((p) => p.alliance === group);
                if (groupPartners.length === 0) return null;
                const badge = ALLIANCE_BADGES[group];
                const isCollapsed = collapsedGroups.has(group);

                return (
                  <Fragment key={group}>
                    <tr className="cursor-pointer" onClick={() => toggleGroup(group)}>
                      <td colSpan={colCount} className="border-y border-border/60 bg-muted/40 px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {isCollapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-sm ${badge.color}`}>
                            {badge.icon}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                            {badge.label}
                          </span>
                          <Badge variant="neutral" className="h-4 px-1.5 text-[9px] font-normal tabular-nums">
                            {groupPartners.length}
                          </Badge>
                        </div>
                      </td>
                    </tr>

                    {!isCollapsed && groupPartners.map((partner, i) => (
                      <PartnerRow
                        key={partner.id}
                        partner={partner}
                        visiblePrograms={visiblePrograms}
                        colCount={colCount}
                        even={i % 2 === 1}
                        editMode={editMode}
                        isExpanded={expandedPartner === partner.id}
                        onToggleExpand={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)}
                      />
                    ))}

                    {!isCollapsed && editMode && onAddPartner && (
                      <tr className="border-b border-border/40">
                        <td colSpan={colCount} className="bg-muted/20 px-6 py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-[10px] text-accent"
                            onClick={() => onAddPartner(group)}
                          >
                            <Plus className="h-3 w-3" /> Add Partner to {group === 'Hotels' ? 'Hotels' : group}
                          </Button>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {/* Scraper-created partners with no alliance yet */}
              {(() => {
                const ungrouped = ungroupedPartners(partners);
                if (ungrouped.length === 0) return null;
                return (
                  <Fragment key="__ungrouped__">
                    <tr>
                      <td colSpan={colCount} className="border-y border-warning/40 bg-warning/10 px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md text-sm text-warning bg-warning/15">!</span>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                            {UNGROUPED_LABEL}
                          </span>
                          <Badge variant="warning" className="h-4 px-1.5 text-[9px] font-normal tabular-nums">
                            {ungrouped.length}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                    {ungrouped.map((partner, i) => (
                      <PartnerRow
                        key={partner.id}
                        partner={partner}
                        visiblePrograms={visiblePrograms}
                        colCount={colCount}
                        even={i % 2 === 1}
                        editMode={editMode}
                        isExpanded={expandedPartner === partner.id}
                        onToggleExpand={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)}
                      />
                    ))}
                  </Fragment>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

function PartnerLogo({ partner }: { partner: TransferPartnerDocument }) {
  // CMS-108: a picked Asset Library logo wins over the text tile
  if (partner.logoUrl) {
    return (
      <img
        src={partner.logoUrl}
        alt={partner.name}
        className="inline-flex h-6 w-6 shrink-0 rounded object-contain bg-white"
      />
    );
  }
  if (!partner.iataCode) {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[8px] font-bold text-muted-foreground">
        {partner.name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
      style={{ backgroundColor: partner.brandColor || '#475569' }}
    >
      {partner.iataCode}
    </span>
  );
}

interface PartnerRowProps {
  partner: TransferPartnerDocument;
  visiblePrograms: CardProgram[];
  colCount: number;
  even: boolean;
  editMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function PartnerRow({ partner, visiblePrograms, colCount, even, editMode, isExpanded, onToggleExpand }: PartnerRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savingAlliance, setSavingAlliance] = useState(false);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const rowBg = even ? 'bg-muted/10' : 'bg-card';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transferPartnerService.deletePartner(partner.id);
      toast.success(`${partner.name} removed from the matrix`);
      setDeleteOpen(false);
    } catch (err) {
      toast.error('Delete failed', { description: (err as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  const handleAllianceChange = async (alliance: AllianceGroup) => {
    if (!alliance) return;
    setSavingAlliance(true);
    try {
      await transferPartnerService.updatePartner({ partnerId: partner.id, fields: { alliance } });
      toast.success(`${partner.name} moved to ${alliance}`);
    } catch (err) {
      toast.error('Failed to set alliance', { description: (err as Error).message });
    } finally {
      setSavingAlliance(false);
    }
  };

  const handleValuationOverride = async (on: boolean) => {
    try {
      await transferPartnerService.updatePartner({
        partnerId: partner.id,
        fields: { tpgValuationOverride: on },
      });
      toast.success(on ? 'TPG valuation locked (manual)' : 'TPG valuation follows the scrape again');
    } catch (err) {
      toast.error('Failed to update override', { description: (err as Error).message });
    }
  };

  // CMS-108: pick the partner's logo from the Asset Library (same flow as the
  // Branding tab) — the TP table embeds render it in the name cell.
  const handleLogoPicked = async (asset: { cdnUrl?: string; thumbnailUrl?: string }) => {
    const url = asset.cdnUrl || asset.thumbnailUrl || '';
    if (!url) {
      toast.error('That asset has no image URL yet — pick another one.');
      return;
    }
    try {
      await transferPartnerService.updatePartner({ partnerId: partner.id, fields: { logoUrl: url } });
      toast.success(`${partner.name} logo set`);
    } catch (err) {
      toast.error('Failed to save logo', { description: (err as Error).message });
    }
  };

  const handleLogoClear = async () => {
    try {
      await transferPartnerService.updatePartner({ partnerId: partner.id, fields: { logoUrl: '' } });
      toast.success(`${partner.name} logo cleared`);
    } catch (err) {
      toast.error('Failed to clear logo', { description: (err as Error).message });
    }
  };

  return (
    <>
      <tr className={`border-b border-border/40 transition-colors hover:bg-accent/5 ${rowBg}`}>
        {/* Partner name + logo (sticky) */}
        <td className={`sticky left-0 z-10 border-r border-border px-3 py-2 ${rowBg}`}>
          <button onClick={onToggleExpand} className="group flex w-full items-center gap-2 text-left">
            {isExpanded
              ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <PartnerLogo partner={partner} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[11px] font-semibold text-accent group-hover:underline">{partner.name}</span>
              {partner.loyaltyProgram && (
                <span className="truncate text-[9px] leading-tight text-muted-foreground">{partner.loyaltyProgram}</span>
              )}
            </div>
            {partner.isAvios && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-0.5 shrink-0 text-[8px] font-normal text-accent/60">(Avios)</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{AVIOS_NOTE}</TooltipContent>
              </Tooltip>
            )}
          </button>
        </td>

        {/* Award release */}
        <td className="px-2 py-1.5 text-center">
          {partner.awardReleaseDays ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help flex-col items-center gap-0.5">
                  <span className="font-mono text-[11px] font-semibold text-accent tabular-nums">{partner.awardReleaseDays}d</span>
                  {partner.awardReleasePattern && (
                    <span className="text-[8px] text-muted-foreground">{partner.awardReleasePattern}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="space-y-1">
                <div>
                  Release window: <strong>{partner.awardReleaseDays} days</strong>
                  {partner.awardReleasePattern && <> ({partner.awardReleasePattern})</>}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground/20">·</span>
          )}
        </td>

        {/* Program cells */}
        {visiblePrograms.map((program) => (
          <td key={program} className="px-1 py-1">
            <TransferCell partner={partner} program={program} entry={partner.programs?.[program]} editMode={editMode} />
          </td>
        ))}
      </tr>

      {/* Expanded detail */}
      {isExpanded && (
        <tr className="bg-muted/10">
          <td colSpan={colCount} className="border-b border-border p-0">
            <div className="ml-4 max-w-3xl space-y-3 border-l-2 border-accent py-3 pl-5 pr-6 animate-fade-in">
              {partner.awardNotes && <p className="text-xs text-muted-foreground">{partner.awardNotes}</p>}
              {partner.sweetSpots?.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-foreground">Sweet Spot Redemptions:</span>
                  <ul className="mt-1.5 space-y-1">
                    {partner.sweetSpots.map((spot, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>
                          {spot.route}
                          {spot.cabin && <Badge variant="outline" className="ml-1.5 px-1 py-0 text-[9px]">{spot.cabin}</Badge>}
                          {spot.points > 0 && <span className="ml-1.5 tabular-nums">{spot.points.toLocaleString()} pts</span>}
                          {spot.notes && <span className="ml-1.5 text-muted-foreground/80">— {spot.notes}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {partner.alsoBookable && (
                <div className="text-xs">
                  <span className="font-medium text-foreground">Also bookable:</span>{' '}
                  <span className="text-muted-foreground">{partner.alsoBookable}</span>
                </div>
              )}
              {/* TPG valuation (scraped) + partner-level override (edit mode) */}
              {(partner.tpgValuationText || editMode) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">TPG valuation:</span>
                  <span className="text-muted-foreground">
                    {partner.tpgValuationText ?? '—'}
                    {partner.tpgValuationAsOf && ` (${partner.tpgValuationAsOf})`}
                  </span>
                  {partner.lastScrapedAt?.toMillis && (
                    <span className="text-muted-foreground/70">· scraped {relTimeShort(partner.lastScrapedAt)}</span>
                  )}
                  {editMode && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Switch
                        className="scale-75"
                        checked={partner.tpgValuationOverride === true}
                        onCheckedChange={handleValuationOverride}
                      />
                      Manual (scraper skips)
                    </span>
                  )}
                </div>
              )}
              {/* CMS-108: partner logo (edit mode) — picked from the Asset
                  Library; the TP table embeds render it in the name cell. */}
              {editMode && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">Partner logo:</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded border border-border bg-white">
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => setLogoPickerOpen(true)}
                  >
                    Browse…
                  </Button>
                  {partner.logoUrl && (
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-destructive"
                      onClick={handleLogoClear}
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-[9px] text-muted-foreground/70">
                    tip: filter the library by the 'Transfer Partner Logo' tag
                  </span>
                </div>
              )}
              {/* CMS-110: hotel brand override (edit mode, hotel partners) — the
                  table renderer picks the brand icon from settings/tpTableBranding. */}
              {editMode && partner.alliance === 'Hotels' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">Hotel brand:</span>
                  <Select
                    value={partner.hotelBrand ?? 'auto'}
                    onValueChange={async (v) => {
                      try {
                        await transferPartnerService.updatePartner({
                          partnerId: partner.id,
                          fields: { hotelBrand: v === 'auto' ? '' : v },
                        });
                        toast.success(v === 'auto' ? 'Brand detection set to automatic' : `Brand set to ${v}`);
                      } catch (err) {
                        toast.error('Failed to set brand', { description: (err as Error).message });
                      }
                    }}
                  >
                    <SelectTrigger className="h-6 w-[170px] text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="text-xs">Auto (from name)</SelectItem>
                      {['IHG', 'Marriott', 'Hyatt', 'Wyndham', 'Accor', 'Choice', 'Leading Hotels', 'Hilton', 'Preferred Hotels'].map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                {/* Scraper-created partners land ungrouped — assign an alliance here (edit mode) */}
                {editMode && partner.alliance === '' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-warning font-medium">Ungrouped — set alliance:</span>
                    <Select value="" onValueChange={handleAllianceChange} disabled={savingAlliance}>
                      <SelectTrigger className="h-7 w-[150px] text-[10px]">
                        <SelectValue placeholder="Choose alliance…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLIANCE_GROUPS.map((g) => (
                          <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {partner.loyaltyProgram || partner.name}
                </span>
                {editMode && (
                  <button
                    className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-3 w-3" /> Remove partner
                  </button>
                )}
              </div>

              {/* Delete partner confirmation (edit mode) */}
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {partner.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This deletes the partner and all its program relationships from the matrix.
                      Any Transfer Partner Table embeds drop the row immediately. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? 'Removing…' : 'Remove partner'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* CMS-108: logo picker — same Asset Library flow as Branding */}
              <AssetPickerDialog
                open={logoPickerOpen}
                onOpenChange={setLogoPickerOpen}
                title={`Choose logo — ${partner.name}`}
                onSelect={(asset) => {
                  void handleLogoPicked(asset);
                  setLogoPickerOpen(false);
                }}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
