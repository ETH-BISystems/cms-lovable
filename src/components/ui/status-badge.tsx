/**
 * StatusBadge — the app-wide vocabulary of status pills.
 *
 * Maps every known status/priority/source/platform string to one consistent
 * soft badge treatment so pages never hand-roll pill colours. Unknown values
 * fall back to a neutral pill, so it is always safe to render raw data.
 *
 * Usage: <StatusBadge status="In Progress" />
 * Escape hatch: <StatusBadge status="Custom" variant="info" /> to force a tone.
 */
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = NonNullable<BadgeProps["variant"]>;

const STATUS_TONES: Record<string, Tone> = {
  // Workflow states
  pending: "neutral",
  "in progress": "info",
  processing: "info",
  researching: "info",
  writing: "info",
  scheduled: "accent",
  published: "success",
  "re-published": "success",
  approved: "success",
  completed: "success",
  done: "success",
  active: "success",
  synced: "success",
  draft: "neutral",
  "needs refresh": "warning",
  refreshing: "warning",
  "awaiting experience": "warning",
  changed: "warning",
  review: "warning",
  "review & edit": "warning",
  blocked: "danger",
  overdue: "danger",
  error: "danger",
  failed: "danger",
  dismissed: "neutral",
  archived: "neutral",
  "not published": "neutral",
  "not synced": "neutral",

  // Priority
  high: "danger",
  medium: "warning",
  low: "neutral",
  urgent: "danger",
  critical: "danger",

  // Sources / entry points
  "rss feed": "accent",
  rss: "accent",
  manual: "neutral",
  keyword: "info",
  "url drop": "info",
  "original idea": "neutral",

  // Product areas
  "blog engine": "accent",
  newsletter: "info",
  "card data": "accent",
  "client dashboard": "info",
  "content creation": "accent",

  // AI confidence / brands
  "ai: high": "success",
  "ai: medium": "warning",
  "ai: low": "neutral",
  personal: "accent",
  editorial: "info",
  epm: "accent",
  cc: "info",
  jf: "neutral",
};

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string;
  /** Force a tone when the automatic mapping isn't right for the context */
  variant?: Tone;
}

export function getStatusTone(status: string): Tone {
  return STATUS_TONES[status.trim().toLowerCase()] ?? "neutral";
}

export function StatusBadge({ status, variant, className, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={variant ?? getStatusTone(status)} className={cn("whitespace-nowrap", className)} {...props}>
      {status}
    </Badge>
  );
}
