import { useState } from 'react';
import { Link } from '@/lib/router-compat';
import { ChevronRight, Clock, Loader2, MoreHorizontal, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Recommendation } from '../../types/intel';
import { useIntelAction } from '../../hooks/useSeoIntel';
import { RECOMMENDATION_META } from './recommendationMeta';
import { formatNumber } from '../analytics/format';

function scoreTone(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 40) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-muted text-muted-foreground border-border';
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums">{Math.round(value * 100)}</span>
    </div>
  );
}

export function ScoreBadge({ rec }: { rec: Recommendation }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-bold tabular-nums', scoreTone(rec.priorityScore))}>
          {rec.priorityScore}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="space-y-1.5 p-3">
        <BreakdownBar label="Impact" value={rec.impact} />
        <BreakdownBar label="Confidence" value={rec.confidence} />
        <BreakdownBar label="Effort" value={rec.effort} />
      </TooltipContent>
    </Tooltip>
  );
}

interface RecommendationCardProps {
  rec: Recommendation;
}

/** One row in the Priority Queue: type stripe, headline, evidence chips, score, actions. */
export function RecommendationCard({ rec }: RecommendationCardProps) {
  const meta = RECOMMENDATION_META[rec.type];
  const { act, pendingId } = useIntelAction();
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const pending = pendingId === rec.id;
  const Icon = meta.icon;

  const keywordChips = (rec.evidence.keywords ?? []).slice(0, 2);
  const domainChips = (rec.evidence.domains ?? []).slice(0, 2);

  return (
    <Card className="relative flex animate-fade-up gap-3 overflow-hidden rounded-2xl border-0 p-4 pl-5 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(3,43,52,0.06),0_12px_32px_-16px_rgba(3,43,52,0.18)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(3,43,52,0.08),0_24px_56px_-16px_rgba(0,147,167,0.35)]">
      <span className={cn('absolute inset-y-0 left-0 w-1', meta.stripeClass)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={cn('gap-1 text-[11px] font-medium', meta.chipClass)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{rec.expectedBenefit}</span>
        </div>
        <Link to={`/keywords/intelligence/${rec.id}`} className="mt-1.5 block font-semibold leading-snug hover:text-accent hover:underline">
          {rec.title}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{rec.reason}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {keywordChips.map(k => (
            <Badge key={k.keyword} variant="outline" className="text-[10px] font-normal text-muted-foreground">
              {k.keyword} · {formatNumber(k.volume)}/mo{k.position ? ` · #${k.position}` : ''}
            </Badge>
          ))}
          {domainChips.map(d => (
            <Badge key={d.domain} variant="outline" className="text-[10px] font-normal text-muted-foreground">
              {d.domain}{d.rank ? ` · rank ${d.rank}` : ''}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <ScoreBadge rec={rec} />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => act(rec.id, meta.primaryAction)}
          >
            {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {meta.primaryLabel}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="px-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/keywords/intelligence/${rec.id}`}>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  View details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => act(rec.id, 'snooze', { days: 30 })}>
                <Clock className="mr-2 h-4 w-4" />
                Snooze 30 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDismissOpen(true)} className="text-destructive focus:text-destructive">
                <XCircle className="mr-2 h-4 w-4" />
                Dismiss
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss recommendation</DialogTitle>
            <DialogDescription>
              It won't be suggested again. Telling the engine why helps tune future recommendations.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={dismissReason}
            onChange={e => setDismissReason(e.target.value)}
            placeholder="Why isn't this relevant? (optional)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const ok = await act(rec.id, 'dismiss', { reason: dismissReason });
                if (ok) setDismissOpen(false);
              }}
            >
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
