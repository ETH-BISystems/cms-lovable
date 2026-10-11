/**
 * ActiveBonusesBanner — lists all currently-active transfer bonuses derived
 * from program entries in the matrix. "Alert Team" posts a real Slack alert
 * via the alertTeamTransfer callable. (Newsletter integration intentionally
 * omitted — out of scope.)
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { Bell, Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { transferPartnerService } from '../services/transferPartnerService';
import { PROGRAM_FULL_NAMES, getEffectiveRatio } from './transferPartnerConstants';
import type { TransferPartnerDocument, CardProgram, ProgramEntry } from '../types';

interface ActiveBonusEntry {
  partner: TransferPartnerDocument;
  program: CardProgram;
  entry: ProgramEntry;
}

interface ActiveBonusesBannerProps {
  activeBonus: ActiveBonusEntry[];
}

function daysRemaining(endDate: { toMillis?: () => number } | null): number | null {
  if (!endDate?.toMillis) return null;
  return Math.max(0, Math.ceil((endDate.toMillis() - Date.now()) / 86400000));
}

export function ActiveBonusesBanner({ activeBonus }: ActiveBonusesBannerProps) {
  const [alerting, setAlerting] = useState<string | null>(null);

  if (activeBonus.length === 0) return null;

  const handleAlert = async (bonus: ActiveBonusEntry) => {
    const key = `${bonus.program}_${bonus.partner.id}`;
    setAlerting(key);
    try {
      const effective = getEffectiveRatio(bonus.entry.ratio, bonus.entry.bonusPercent!);
      const ends = bonus.entry.bonusEndDate?.toMillis
        ? format(new Date(bonus.entry.bonusEndDate.toMillis()), 'PP')
        : 'unknown';
      await transferPartnerService.alertTeam({
        kind: 'transfer-bonus',
        title: `${PROGRAM_FULL_NAMES[bonus.program]} → ${bonus.partner.name} +${bonus.entry.bonusPercent}%`,
        detail: `Effective ratio ${effective} · Ends ${ends}`,
      });
      toast.success('Team alerted on Slack', { description: `${bonus.partner.name} +${bonus.entry.bonusPercent}% bonus` });
    } catch (err) {
      toast.error('Alert failed', { description: (err as Error).message });
    } finally {
      setAlerting(null);
    }
  };

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-accent">
        <Flame className="h-4 w-4" />
        {activeBonus.length} Active Transfer Bonus{activeBonus.length !== 1 ? 'es' : ''}
      </div>
      <div className="space-y-2">
        {activeBonus.map((bonus) => {
          const key = `${bonus.program}_${bonus.partner.id}`;
          const days = daysRemaining(bonus.entry.bonusEndDate);
          const endStr = bonus.entry.bonusEndDate?.toMillis
            ? format(new Date(bonus.entry.bonusEndDate.toMillis()), 'PP')
            : 'Unknown';
          return (
            <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {PROGRAM_FULL_NAMES[bonus.program]} → {bonus.partner.name}
                </span>
                <Badge variant="success" className="text-xs">+{bonus.entry.bonusPercent}%</Badge>
                <span className="text-xs text-muted-foreground">
                  Effective: <strong className="font-mono">{getEffectiveRatio(bonus.entry.ratio, bonus.entry.bonusPercent!)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Ends {endStr}
                  {days !== null && (
                    <> · <strong className={days <= 7 ? 'text-destructive' : 'text-foreground'}>{days}d left</strong></>
                  )}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => handleAlert(bonus)}
                  disabled={alerting === key}
                >
                  {alerting === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                  Alert Team
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
