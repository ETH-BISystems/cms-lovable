import { useState } from 'react';
import { Lock, LockOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCardActions } from '../../hooks/useCardActions';
import type { CardDocument, OverridableFieldName } from '../../types';

/**
 * CMS-117 — per-field override (lock) button for the Card Data Manager.
 *
 * Locked (amber): the field is overridden — the scraper never touches it
 * (enforced centrally in scrapeCardCore, and the field is skipped by the
 * Gemma prose pass too). Unlocked (muted): the scraper may refresh it.
 *
 * Enabling the lock stores the value CURRENTLY shown in the editor as the
 * manual value ("lock in what you see"); the card's own Save flow is
 * unaffected. Unlocking re-enables scraper refreshes on the next scrape —
 * the current text stays until then.
 */
export interface FieldLockButtonProps {
  card: CardDocument;
  field: OverridableFieldName;
  /** The current editor value — written as the manual value on lock. */
  value: string | number;
}

export function FieldLockButton({ card, field, value }: FieldLockButtonProps) {
  const { setOverride } = useCardActions();
  const [busy, setBusy] = useState(false);
  const locked = !!card.overrides?.[field]?.isOverridden;

  const toggle = async () => {
    setBusy(true);
    try {
      await setOverride({ cardId: card.id, field, value: locked ? null : value, isOverriding: !locked });
      toast.success(
        locked
          ? 'Override removed — the scraper may update this field on the next scrape'
          : 'Field locked — the scraper will not change it',
      );
    } catch (err) {
      toast.error('Failed to update the override', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-label={locked ? `Unlock ${field}` : `Lock ${field} against the scraper`}
            className={`inline-flex items-center justify-center w-4 h-4 rounded transition-colors ${
              locked ? 'text-amber-600 hover:text-amber-700' : 'text-muted-foreground/40 hover:text-muted-foreground'
            }`}
          >
            {busy ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : locked ? (
              <Lock className="w-3 h-3" />
            ) : (
              <LockOpen className="w-3 h-3" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{locked
            ? 'Locked — the scraper cannot change this field. Click to unlock (current text stays until the next scrape).'
            : 'Lock this field against the scraper — your current text becomes the saved override.'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
