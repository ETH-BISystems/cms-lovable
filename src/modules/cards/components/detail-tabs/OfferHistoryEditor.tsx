import { useEffect, useState } from 'react';
import { Loader2, Lock, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCardActions } from '../../hooks/useCardActions';
import type { CardDocument } from '../../types';
import {
  emptyOfferHistoryRow,
  offerHistoryRowsEqual,
  toEditRows,
  toSaveRows,
  validateOfferHistoryRows,
  type OfferHistoryEditRow,
} from '../../utils/offerHistoryRows';

/**
 * CMS-162 — editable Offer History table (the rows behind the offer-history
 * iframe embed). The scraper owns card_data.offerHistory; editing here saves
 * through the setOverride callable, which writes the rows AND locks the field
 * so the next scrape can't clobber them ("if its not messing the scraper" —
 * the scraper feed stays the source whenever the team hasn't overridden).
 *
 * Revert clears the lock and restores the last scraped rows (server-side
 * snapshot, no scrape needed). Dates render on the live site normalized to
 * "Month YYYY" at render time — the stored text is never rewritten.
 */
export function OfferHistoryEditor({ card }: { card: CardDocument }) {
  const { setOverride } = useCardActions();
  const locked = !!card.overrides?.offerHistory?.isOverridden;

  // rows = what's in the inputs; baseline = what's persisted on the card doc.
  // dirty ⇔ rows ≠ baseline.
  const [state, setState] = useState(() => ({
    rows: toEditRows(card.offerHistory),
    baseline: toEditRows(card.offerHistory),
  }));
  const [busy, setBusy] = useState<'save' | 'revert' | null>(null);

  const dirty = !offerHistoryRowsEqual(state.rows, state.baseline);

  // Live card updates (a scrape landing, this save's Firestore echo) refresh
  // the table ONLY while there are no unsaved edits — never clobber typing.
  useEffect(() => {
    const next = toEditRows(card.offerHistory);
    setState((s) =>
      offerHistoryRowsEqual(s.rows, s.baseline)
        ? { rows: next, baseline: next }
        : { ...s, baseline: next },
    );
  }, [card.id, card.offerHistory]);

  const updateRow = (i: number, patch: Partial<OfferHistoryEditRow>) => {
    setState((s) => ({ ...s, rows: s.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  };

  const removeRow = (i: number) => {
    setState((s) => ({ ...s, rows: s.rows.filter((_, j) => j !== i) }));
  };

  const addRow = () => {
    setState((s) => ({ ...s, rows: [...s.rows, emptyOfferHistoryRow()] }));
  };

  const save = async () => {
    const error = validateOfferHistoryRows(state.rows);
    if (error) {
      toast.error(error);
      return;
    }
    setBusy('save');
    try {
      await setOverride({ cardId: card.id, field: 'offerHistory', value: toSaveRows(state.rows), isOverriding: true });
      toast.success(locked ? 'Offer history updated ✓' : 'Offer history saved — locked against the scraper', {
        description: 'Live embeds refresh within a few minutes (embed cache).',
      });
    } catch (err) {
      toast.error('Failed to save offer history', { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const revert = async () => {
    setBusy('revert');
    try {
      await setOverride({ cardId: card.id, field: 'offerHistory', value: null, isOverriding: false });
      // Optimistic local restore — the live Firestore echo confirms it.
      const restored = toEditRows(card.offerHistory_scraped);
      setState({ rows: restored, baseline: restored });
      toast.success('Reverted to the scraped offer history', {
        description: 'The scraper may refresh this table on the next scrape.',
      });
    } catch (err) {
      toast.error('Failed to revert offer history', { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const { rows } = state;
  const validationError = dirty ? validateOfferHistoryRows(rows) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {locked ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600 gap-1">
              <Lock className="w-2.5 h-2.5" /> Manual — scraper locked
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Scraper-maintained</Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Dates render on the live site as Month YYYY (e.g. April 2026) automatically.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-lg bg-muted/10">
          <p className="text-sm text-muted-foreground">No offer history rows yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            The scraper hasn’t found an offer history table for this card — add rows manually below.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden sm:grid sm:grid-cols-[10rem_1fr_8rem_2rem] gap-2 px-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Offer Dates</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Offer Details</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Est. Value</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid sm:grid-cols-[10rem_1fr_8rem_2rem] gap-2 items-start">
              <Input
                aria-label={`Row ${i + 1} dates`}
                value={row.dates}
                onChange={(e) => updateRow(i, { dates: e.target.value })}
                placeholder="April 2026 to now"
                className="h-8 text-sm"
              />
              <Textarea
                aria-label={`Row ${i + 1} offer details`}
                value={row.offer}
                onChange={(e) => updateRow(i, { offer: e.target.value })}
                placeholder="Earn 60,000 bonus points after you spend $4,000 in the first 3 months…"
                className="text-sm min-h-[38px] shadow-inner"
                rows={Math.min(4, Math.max(1, Math.ceil(row.offer.length / 60)))}
              />
              <Input
                aria-label={`Row ${i + 1} estimated value`}
                value={row.value}
                onChange={(e) => updateRow(i, { value: e.target.value })}
                placeholder="$1,308 (optional)"
                className="h-8 text-sm"
              />
              <button
                type="button"
                aria-label={`Remove row ${i + 1}`}
                onClick={() => removeRow(i)}
                className="p-1.5 mt-0.5 hover:bg-muted rounded justify-self-end"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {validationError && <p className="text-xs text-destructive">{validationError}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={addRow} disabled={busy !== null}>
          <Plus className="w-3 h-3" /> Add row
        </Button>
        <div className="flex-1" />
        {locked && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={revert}
            disabled={busy !== null}
            title="Clear the manual table and restore the last scraped rows"
          >
            {busy === 'revert' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Revert to scraped
          </Button>
        )}
        <Button
          size="sm"
          className="text-xs gap-1 bg-teal-600 text-white hover:bg-teal-700"
          onClick={save}
          disabled={!dirty || busy !== null || !!validationError}
          title={locked ? 'Update the manual offer history' : 'Save and lock this table against the scraper'}
        >
          {busy === 'save' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {locked ? 'Save changes' : 'Save & lock'}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Saving locks the table so the scraper can’t overwrite your edits; Revert restores the last scraped rows and
        re-enables scraper refreshes. Changes appear in the card’s Offer History embed within a few minutes.
      </p>
    </div>
  );
}
