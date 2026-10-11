import { useState } from 'react';
import { Info, AlertTriangle, Check, X, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { SectionMeta } from '../../types';

/* ── CollapsibleSection ──
 * Shared expand/collapse wrapper used by every detail-tab section. Previously
 * duplicated (near-identically) in CardBenefitsTab, CardRewardsTab, and
 * CardOverviewTab — consolidated here so new tabs don't need a 4th copy. */

export function CollapsibleSection({ title, children, defaultOpen = false, icon, badge, metaKey }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  metaKey?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 border-b border-transparent data-[open=true]:border-border"
        data-open={open}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {typeof badge === 'string'
            ? <Badge variant="outline" className="text-[10px] px-1.5 py-0">{badge}</Badge>
            : badge}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          {metaKey && SECTION_META[metaKey] && <MetadataBar meta={SECTION_META[metaKey]} />}
          {children}
        </div>
      )}
    </div>
  );
}

/* ── MetadataBar ── */

export function MetadataBar({ meta }: { meta: SectionMeta }) {
  const [visible, setVisible] = useState(true);

  const sourceDot =
    meta.source === 'auto-scraped'
      ? 'bg-success'
      : meta.source === 'manual'
        ? 'bg-blue-500'
        : 'bg-warning';
  const sourceLabel =
    meta.source === 'auto-scraped'
      ? 'Auto-scraped'
      : meta.source === 'manual'
        ? 'Manual'
        : 'Override';

  const syncColor =
    meta.syncStatus === 'synced'
      ? 'text-muted-foreground'
      : meta.syncStatus === 'pending'
        ? 'text-warning'
        : meta.syncStatus === 'error' || meta.syncStatus === 'stale'
          ? 'text-destructive'
          : 'text-muted-foreground';

  const lastScrapedText = meta.lastScraped
    ? `Scraped ${meta.lastScraped.toLocaleDateString()}`
    : '—';

  const syncText =
    meta.syncStatus === 'synced'
      ? 'Synced'
      : meta.syncStatus === 'pending'
        ? 'Pending sync'
        : meta.syncStatus === 'error'
          ? 'Sync failed'
          : meta.syncStatus === 'stale'
            ? 'Stale'
            : 'Not synced';

  const handleVerify = () => {
    toast.success('Override verified ✓', {
      description: 'Review timer has been reset.',
    });
  };

  return (
    <div className="mb-2">
      {visible && (
        <div className="flex items-center gap-3 text-[11px] py-1 px-1 flex-wrap">
          {/* Source badge */}
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${sourceDot}`} />
            <span className="text-muted-foreground">{sourceLabel}</span>
          </span>

          {/* Last scraped */}
          <span className="text-muted-foreground">{lastScrapedText}</span>

          {/* Sync status */}
          <span className={syncColor}>{syncText}</span>

          {/* Confidence indicator */}
          {meta.confidence && (
            <span className="text-muted-foreground">
              Confidence: {meta.confidence}
            </span>
          )}

          {/* Override stale alert */}
          {meta.staleOverrideAlert && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="w-3 h-3" />
              <span>Override not recently reviewed</span>
              <button
                onClick={handleVerify}
                className="text-[10px] underline hover:text-warning/80 font-medium"
              >
                Verify
              </button>
            </span>
          )}

          <span className="ml-auto" />
          <button
            onClick={() => setVisible(false)}
            className="p-0.5 hover:bg-muted rounded text-muted-foreground/50"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
      )}
      {!visible && (
        <div className="flex justify-end">
          <button
            onClick={() => setVisible(true)}
            className="p-0.5 hover:bg-muted rounded text-muted-foreground/40"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Override Toggle for individual fields ── */

export function OverrideFieldWithProvenance({
  label,
  value,
  scrapedValue,
  isOverridden,
  onToggle,
  onChange,
  conflict,
  validate,
}: {
  label: string;
  value: string;
  scrapedValue?: string;
  isOverridden: boolean;
  onToggle: (v: boolean) => void | Promise<boolean>;
  onChange: (v: string) => void | Promise<boolean>;
  conflict?: { newScrapedValue: string } | null;
  /** Optional input validation — returns an error message to block the save, or null. */
  validate?: (v: string) => string | null;
}) {
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Draft-state editing: the override value is edited locally and saved on
  // blur / Enter / the Save button — one setOverride call per edit instead of
  // one per keystroke, and the user gets an explicit save affordance.
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!dirty) setDraft(value);
  }

  const commit = async () => {
    if (!dirty) return;
    // Validate before saving — an invalid value (e.g. non-numeric annual fee)
    // must not be saved silently, since it would be rejected downstream by the
    // Webflow sync (CMS-18).
    if (validate) {
      const error = validate(draft);
      if (error) {
        setValidationError(error);
        return;
      }
      setValidationError(null);
    }
    // Only clear the "unsaved" state once the save actually succeeds — the
    // previous fire-and-forget version cleared it immediately regardless of
    // outcome, so a failed save (permissions, network) looked identical to a
    // successful one once the error toast disappeared.
    const result = await onChange(draft);
    if (result !== false) setDirty(false);
  };

  const showConflict = conflict && !conflictDismissed && isOverridden;

  const handleAcceptScraper = () => {
    // Revert to the scraped value: turning the override off makes the
    // scraper value the live value again
    onToggle(false);
    setConflictDismissed(true);
    setDirty(false);
  };

  const handleKeepOverride = () => {
    setConflictDismissed(true);
    toast.success('Override kept ✓');
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground/70">{label}</label>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Override</span>
          <Switch
            checked={isOverridden}
            onCheckedChange={onToggle}
            className="scale-75"
          />
        </div>
      </div>
      {isOverridden ? (
        <div className="space-y-1">
          {/* Manual (override) value — editable */}
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 border-blue-500/30 shrink-0"
            >
              Override
            </Badge>
            <Input
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setDirty(true); setValidationError(null); }}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
              placeholder="Manual value…"
              className={`h-8 text-sm flex-1 ${validationError
                ? 'border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive'
                : 'border-accent ring-1 ring-accent/30 focus-visible:ring-accent'}`}
            />
            {dirty && (
              <Button
                size="sm"
                className="h-8 text-xs px-2 bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                onMouseDown={(e) => e.preventDefault() /* keep focus so onBlur doesn't double-fire */}
                onClick={commit}
              >
                <Check className="w-3 h-3 mr-0.5" /> Save
              </Button>
            )}
          </div>
          {validationError && (
            <p className="flex items-center gap-1 text-[11px] text-destructive">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {validationError}
            </p>
          )}
          {/* Scraper value — always visible for comparison while overridden */}
          <div className="flex items-center gap-1.5 bg-muted/30 rounded px-2 py-1">
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 bg-success/10 text-success border-success/30 shrink-0"
            >
              Scraper
            </Badge>
            <span className="text-xs text-muted-foreground truncate" title={scrapedValue || undefined}>
              {scrapedValue?.trim() ? scrapedValue : 'No scraped value yet'}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">
              toggle off to revert
            </span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-card-foreground bg-muted/30 rounded px-2 py-1.5 flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 bg-success/10 text-success border-success/30"
          >
            Auto-detected
          </Badge>
          {scrapedValue || value || <span className="text-muted-foreground">Not scraped yet</span>}
        </div>
      )}

      {/* Conflict alert — only rendered when the scraper found a NEW value
          after the override was set (computed by the parent) */}
      {showConflict && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-2 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <RefreshCw className="w-3 h-3" />
            <span>
              Scraper found <strong>{conflict.newScrapedValue}</strong> since this
              override was set — current override: <strong>{value}</strong>
            </span>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2 border-success/40 text-success hover:bg-success/10"
              onClick={handleAcceptScraper}
            >
              <Check className="w-2.5 h-2.5 mr-0.5" /> Use Scraper Value
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={handleKeepOverride}
            >
              Keep Override
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Default metadata configs ── */

export const SECTION_META: Record<string, SectionMeta> = {
  // Tab 1
  coreIdentity: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  offerPricing: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  offerHistory: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  bonusPrediction: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  editorialContent: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  iframeEmbeds: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  recommendationTier: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  transferCreditInfo: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  missionMethodology: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  ethScoring: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  faqs: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  cardRelationships: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  authorMetadata: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  // Tab 2
  statementCredits: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
    staleOverrideAlert: true,
  },
  travelBenefits: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  purchaseProtection: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  insuranceCoverage: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  loungeAccess: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  // Tab 3
  earningRates: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  bonusCategories: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  pointsValuation: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
  // Tab 4
  transferPartners: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  activeBonuses: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  // Tab 5
  signupBonusHistory: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  transferBonusHistory: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  changeLog: {
    source: 'auto-scraped',
    lastScraped: new Date(),
    syncStatus: 'synced',
    confidence: 'high',
  },
  // Tab 6
  articlesUsing: {
    source: 'manual',
    lastScraped: null,
    syncStatus: 'synced',
    confidence: 'high',
  },
};
