import { useEffect, useState } from 'react';
import { Loader2, Globe, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types';
import { cardService } from '../services/cardService';

/**
 * CMS-116 — Global Fields tab (Card Data Manager).
 *
 * Fields that are the SAME across all card review pages, edited once and
 * applied everywhere: 'Our Mission' and 'Rating Methodology' today. Stored
 * in settings/card-global-fields; the sync falls back to the global text
 * for every card whose OWN field is empty (a card's own text always wins).
 * Nothing here is scraper-updated.
 */
export function GlobalFieldsTab() {
  const { role } = useAuth();
  const canEdit = role === Role.Admin || role === Role.Editor;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ourMission, setOurMission] = useState('');
  const [ratingMethodology, setRatingMethodology] = useState('');
  const [lastSaved, setLastSaved] = useState<{ ourMission: string; ratingMethodology: string } | null>(null);

  useEffect(() => {
    // production: onSnapshot(doc(db, 'settings', 'card-global-fields'))
    const unsub = cardService.subscribeToCardGlobalFields(
      (data) => {
        const om = data.ourMission ?? '';
        const rm = data.ratingMethodology ?? '';
        setOurMission(om);
        setRatingMethodology(rm);
        setLastSaved({ ourMission: om, ratingMethodology: rm });
        setLoading(false);
      },
      (err) => {
        console.error('[GlobalFieldsTab] load failed:', err);
        toast.error('Failed to load the global fields');
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const dirty =
    lastSaved !== null &&
    (ourMission !== lastSaved.ourMission || ratingMethodology !== lastSaved.ratingMethodology);

  const handleSave = async () => {
    setSaving(true);
    try {
      await cardService.updateCardGlobalFields({ ourMission, ratingMethodology });
      toast.success('Global fields saved', {
        description: 'Applied to every card with an empty field on its next sync to Webflow.',
      });
    } catch (err) {
      toast.error('Failed to save global fields', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading global fields…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 flex items-start gap-3">
        <Globe className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div className="text-[13px] text-foreground space-y-1">
          <p>
            Text saved here is <strong>shared across all cards</strong>: on every sync to Webflow it fills the
            field on each card that doesn't have its own text. A card's own text (Card → Overview → Mission
            &amp; Methodology) always wins when set — use that for card-specific exceptions.
          </p>
          <p className="text-muted-foreground">
            The scraper never updates these fields. Existing cards pick the text up on their next sync
            (Sync to Webflow / Bulk Sync).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground/70">Our Mission</label>
        <Textarea
          value={ourMission}
          onChange={(e) => setOurMission(e.target.value)}
          placeholder="The mission statement shown on every card review page…"
          className="text-sm min-h-[120px] shadow-inner"
          disabled={!canEdit || saving}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground/70">Rating Methodology</label>
        <Textarea
          value={ratingMethodology}
          onChange={(e) => setRatingMethodology(e.target.value)}
          placeholder="How ETH scores cards — shown on every card review page…"
          className="text-sm min-h-[120px] shadow-inner"
          disabled={!canEdit || saving}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!canEdit || saving || !dirty} className="gap-1.5 bg-teal-600 text-white hover:bg-teal-700">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : 'Save Global Fields'}
        </Button>
        {dirty && <span className="text-[12px] text-amber-600">Unsaved changes</span>}
        {!canEdit && <span className="text-[12px] text-muted-foreground">Only editors and admins can edit the global fields.</span>}
      </div>
    </div>
  );
}
