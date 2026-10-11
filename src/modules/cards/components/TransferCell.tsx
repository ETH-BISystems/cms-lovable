/**
 * TransferCell — one program-partner cell in the matrix.
 *
 * Displays ratio + speed dot + bonus badge. Clicking opens a popover:
 * read-only details for viewers, or the full edit form (ratio, speed,
 * active, last verified + verify now, bonus, notes, remove partnership)
 * in edit mode. All writes flow through the updateTransferPartner callable.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { Timestamp } from '@/services/timestamp';
import { CalendarIcon, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { transferPartnerService } from '../services/transferPartnerService';
import { SPEED_CONFIG, CITI_NOTE, MARRIOTT_NOTE, getEffectiveRatio, hasActiveBonus } from './transferPartnerConstants';
import type { TransferPartnerDocument, CardProgram, ProgramEntry } from '../types';

interface TransferCellProps {
  partner: TransferPartnerDocument;
  program: CardProgram;
  entry: ProgramEntry | undefined;
  editMode: boolean;
}

function timeAgo(ts: { toMillis?: () => number } | null | undefined): string {
  if (!ts?.toMillis) return 'Never';
  const days = Math.floor((Date.now() - ts.toMillis()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return format(new Date(ts.toMillis()), 'PP');
}

export function TransferCell({ partner, program, entry, editMode }: TransferCellProps) {
  const [open, setOpen] = useState(false);

  if (!entry) {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="text-muted-foreground/20 select-none">·</span>
      </div>
    );
  }

  const speedConfig = SPEED_CONFIG[entry.speed] ?? SPEED_CONFIG['3-plus-days'];
  const activeBonus = hasActiveBonus(entry);
  const displayRatio = entry.ratioDisplay || entry.ratio;
  const isCiti = program === 'citi-ty';
  const inactive = entry.active === false;

  return (
    <div className={`flex items-center justify-center ${activeBonus ? 'bg-success/5 rounded-md' : ''}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`relative inline-flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 min-w-[72px] transition-colors hover:bg-muted/60 ${inactive ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center gap-1">
              <span className="font-mono text-[12px] font-semibold text-foreground tabular-nums">{displayRatio}</span>
              {isCiti && <span className="text-warning text-[9px] font-bold">*</span>}
            </div>
            <div className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${speedConfig.dot}`} />
              <span className="text-[10px] text-muted-foreground">{speedConfig.label}</span>
            </div>
            {activeBonus && (
              <span className="absolute -right-1 -top-1 rounded bg-success px-1 text-[8px] font-bold leading-tight text-success-foreground">
                +{entry.bonusPercent}%
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="center">
          {editMode ? (
            <EditForm partner={partner} program={program} entry={entry} onClose={() => setOpen(false)} />
          ) : (
            <ReadOnlyDetails partner={partner} entry={entry} isCiti={isCiti} />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ReadOnlyDetails({ partner, entry, isCiti }: { partner: TransferPartnerDocument; entry: ProgramEntry; isCiti: boolean }) {
  const speedConfig = SPEED_CONFIG[entry.speed] ?? SPEED_CONFIG['3-plus-days'];
  const activeBonus = hasActiveBonus(entry);
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex justify-between"><span className="text-muted-foreground">Transfer Ratio:</span><span className="font-mono font-medium">{entry.ratioDisplay || entry.ratio}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Speed:</span><span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${speedConfig.dot}`} />{speedConfig.label}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Active:</span><span className={entry.active !== false ? 'text-success' : 'text-destructive'}>{entry.active !== false ? 'Yes' : 'No'}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Last scraped:</span><span>{timeAgo(partner.lastScrapedAt)}</span></div>
      {entry.manualOverride && (
        <div className="rounded bg-accent/10 p-1.5 text-[11px] text-accent">Manual override — the scraper never rewrites this cell.</div>
      )}
      {entry.notes && <p className="rounded bg-muted/50 p-1.5 text-[11px] text-muted-foreground">{entry.notes}</p>}
      {activeBonus && (
        <div className="space-y-1 rounded bg-success/10 p-2">
          <div className="text-[11px] font-medium text-success">🔥 Active Bonus: +{entry.bonusPercent}%</div>
          <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Effective ratio:</span><span className="font-mono font-medium">{getEffectiveRatio(entry.ratio, entry.bonusPercent!)}</span></div>
          {entry.bonusEndDate?.toMillis && (
            <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Expires:</span><span>{format(new Date(entry.bonusEndDate.toMillis()), 'PP')}</span></div>
          )}
        </div>
      )}
      {partner.isMarriott && (
        <div className="rounded bg-accent/5 p-2 text-[11px] text-muted-foreground">
          <Info className="mr-1 inline h-3 w-3 text-accent" />
          {MARRIOTT_NOTE}
        </div>
      )}
      {isCiti && (
        <div className="rounded bg-warning/10 p-2 text-[11px] text-muted-foreground">
          <span className="font-bold text-warning">*</span> {CITI_NOTE}
        </div>
      )}
    </div>
  );
}

function EditForm({ partner, program, entry, onClose }: { partner: TransferPartnerDocument; program: CardProgram; entry: ProgramEntry; onClose: () => void }) {
  const [ratio, setRatio] = useState(entry.ratioDisplay || entry.ratio);
  const [active, setActive] = useState(entry.active !== false);
  const [manualOverride, setManualOverride] = useState(entry.manualOverride === true);
  const [bonusPercent, setBonusPercent] = useState(entry.bonusPercent !== null ? String(entry.bonusPercent) : '');
  const [bonusEndDate, setBonusEndDate] = useState<Date | null>(
    entry.bonusEndDate?.toMillis ? new Date(entry.bonusEndDate.toMillis()) : null
  );
  const [notes, setNotes] = useState(entry.notes || '');
  const [bonusCalOpen, setBonusCalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Spread the existing entry so fields the form no longer edits (speed,
      // lastVerified, ratioScraped) survive the write.
      const updatedEntry: ProgramEntry = {
        ...entry,
        ratio: ratio.trim() || '1:1',
        ratioDisplay: undefined,
        active,
        manualOverride,
        notes: notes.trim(),
        bonusPercent: bonusPercent.trim() ? Number(bonusPercent) : null,
        bonusEndDate: bonusPercent.trim() && bonusEndDate ? Timestamp.fromDate(bonusEndDate) : null,
      };
      await transferPartnerService.updatePartner({
        partnerId: partner.id,
        fields: { programs: { ...partner.programs, [program]: updatedEntry } },
      });
      toast.success('Partnership updated', { description: `${partner.name} — ratio ${updatedEntry.ratio}` });
      onClose();
    } catch (err) {
      toast.error('Update failed', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const nextPrograms = { ...partner.programs };
      delete nextPrograms[program];
      await transferPartnerService.updatePartner({ partnerId: partner.id, fields: { programs: nextPrograms } });
      toast.success('Partnership removed', { description: `${partner.name} no longer maps to this program` });
      onClose();
    } catch (err) {
      toast.error('Remove failed', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">Transfer Ratio</label>
        <Input value={ratio} onChange={(e) => setRatio(e.target.value)} className="h-8 font-mono text-sm" />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground">Active</label>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>

      {/* Dual-value override: when on, the TPG scraper skips this cell */}
      <div className="flex items-center justify-between rounded border border-accent/30 bg-accent/5 p-2">
        <div>
          <label className="text-[11px] font-medium text-foreground">Manual override</label>
          <p className="text-[10px] text-muted-foreground">The scraper never rewrites this cell.</p>
        </div>
        <Switch checked={manualOverride} onCheckedChange={setManualOverride} />
      </div>

      <div className="flex justify-between rounded bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
        <span>Scraped: <span className="font-mono">{entry.ratioScraped || '—'}</span></span>
        <span>Last scraped: {timeAgo(partner.lastScrapedAt)}</span>
      </div>

      <div className="space-y-1.5 rounded border border-success/20 bg-success/5 p-2">
        <label className="text-[11px] font-medium text-success">Bonus % (optional)</label>
        <div className="flex gap-2">
          <Input value={bonusPercent} onChange={(e) => setBonusPercent(e.target.value)} placeholder="e.g. 30" type="number" className="h-7 flex-1 text-xs" />
          <Popover open={bonusCalOpen} onOpenChange={setBonusCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 shrink-0 text-[10px] font-normal">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {bonusEndDate ? format(bonusEndDate, 'PP') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={bonusEndDate ?? undefined} onSelect={(d) => { if (d) { setBonusEndDate(d); setBonusCalOpen(false); } }} initialFocus className="pointer-events-auto p-3" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">Notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." className="min-h-[44px] text-xs" />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="h-8 flex-1 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="w-full pt-1 text-center text-[11px] text-destructive hover:underline" disabled={saving}>
            Remove Partnership
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Partnership?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {partner.name} transfer relationship for this program from the matrix. The partner row itself stays.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
