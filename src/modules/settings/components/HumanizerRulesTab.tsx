/**
 * Settings → Humanizer Rules — the editable rule set that makes AI-written
 * text read human (business request 2026-09-15).
 *
 * The rules are distilled from StoryScope (Russell et al., arXiv:2604.03136 —
 * a 2026 study of 61,608 stories by 5 LLMs vs human authors) and adapted for
 * ETH's non-fiction content. They are applied in THREE places:
 *   1. Gemma humaniser — blog articles (AI Final Processing / Humanise stage)
 *   2. Gemma humaniser — Card Data Manager prose fields
 *   3. Claude editorial generation — card written fields at scrape time
 *
 * The Gemma job reads this doc (settings/humanizerRules) at the start of every
 * execution; card generation reads it on every scrape. Saves take effect on
 * the next run — no redeploy needed. Banned phrases are ALSO enforced
 * deterministically by the job: a rewrite that introduces one is rejected.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { BookOpenCheck, Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import { useSettings } from '../hooks/useSettings';

interface HumanizerRulesSettings {
  rules?: string[];
  bannedPhrases?: string[];
  source?: string;
  updatedBy?: string;
}

/** Mirrors the bundled fallbacks (functions/src/shared/humanizerRules.ts +
 * services/gemma-rewrite-job/humanizer_rules.py) so the editor can show and
 * reset to them. The Firestore doc always wins when saved. */
const DEFAULT_RULES: string[] = [
  'Do not over-explain the point. AI text states its takeaway out loud far more than human writing. Let the specifics carry the argument — end paragraphs on the fact, not on a summary of what it means.',
  'Break the tidy single-track pattern. A human expert adds the aside, the caveat, the exception, the practical tip. Not every paragraph must serve one thesis — a useful detour reads human; a perfectly unified essay reads AI.',
  'Vary the rhythm. Mix short punchy sentences into runs of longer ones, and let paragraph lengths vary — flat, even pacing is the strongest structural AI tell.',
  "Never use stock transitions such as 'Moreover', 'Furthermore', 'In addition', 'It's worth noting', 'When it comes to', 'On the other hand' or 'In conclusion'. Start the sentence with its subject instead.",
  'Prefer the named, concrete detail over the generic statement — real program names, real numbers, a specific example. Human writers reference the real world roughly twice as often as AI.',
  "Address the reader directly when it helps ('If you fly twice a year…') — practical second-person guidance is a strong human marker in review writing.",
  'Allow mild imperfection. Not every sentence needs parallel grammar, and a one-line paragraph is fine.',
];

const DEFAULT_BANNED: string[] = [
  "it's worth noting", 'it is worth noting', "in today's fast-paced world", 'when it comes to',
  'at the end of the day', 'the bottom line is', 'first and foremost', 'in conclusion', 'moreover',
  'furthermore', 'in addition to this', 'delve into', 'delves into', 'a testament to', 'game-changer',
  'look no further', 'buckle up', 'without further ado', 'in the world of', 'stands out as', 'boasts',
];

export function HumanizerRulesTab() {
  const { isAdmin } = useSettingsPermissions();
  const { data, loading, save } = useSettings<HumanizerRulesSettings>('humanizerRules');
  const [rulesText, setRulesText] = useState('');
  const [bannedText, setBannedText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) {
      // Never saved yet — show the bundled defaults the jobs would use.
      setRulesText(DEFAULT_RULES.join('\n'));
      setBannedText(DEFAULT_BANNED.join('\n'));
      return;
    }
    setRulesText((data.rules?.length ? data.rules : DEFAULT_RULES).join('\n'));
    setBannedText((data.bannedPhrases?.length ? data.bannedPhrases : DEFAULT_BANNED).join('\n'));
  }, [data]);

  const readOnly = !isAdmin;

  const handleSave = async () => {
    const rules = rulesText.split('\n').map((r) => r.trim()).filter(Boolean);
    const bannedPhrases = bannedText.split('\n').map((p) => p.trim()).filter(Boolean);
    if (rules.length === 0) {
      toast.error('Keep at least one rule — an empty rule set disables the style guidance.');
      return;
    }
    setSaving(true);
    try {
      await save({ rules, bannedPhrases, source: 'StoryScope (arXiv:2604.03136), edited in Settings' } as Partial<HumanizerRulesSettings>);
    } catch {
      // useSettings toasts the error already
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRulesText(DEFAULT_RULES.join('\n'));
    setBannedText(DEFAULT_BANNED.join('\n'));
    toast.info('Bundled defaults restored — Save to apply them.');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg border border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <BookOpenCheck className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-card-foreground">Humanizer Rules</h3>
              <Badge variant={data?.rules?.length ? 'default' : 'secondary'} className="text-[10px]">
                {data?.rules?.length ? 'Custom rules saved' : 'Bundled defaults'}
              </Badge>
            </div>
            <p className="text-[12px] text-muted-foreground">
              The style rules the humaniser follows to make AI-written text read human — distilled from
              StoryScope (arXiv:2604.03136, a 2026 study of 61,608 texts by 5 AI platforms vs human
              authors) and adapted for our articles and card reviews. Applied by the Gemma humaniser
              (articles + Card Data Manager prose) and by card editorial generation at scrape time.
              Saved rules take effect on the next run — no redeploy.
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
              </Button>
              <Button size="sm" className="text-[12px] gap-1.5" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save rules
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Rules editor */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Style rules</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            One rule per line — injected into the humaniser's prompt for every article and card field.
            Keep rules that genuinely change the writing; vague rules get ignored by the model.
          </p>
        </div>
        <div className="px-5 py-4 space-y-1.5">
          <Label className="text-[12px] font-medium text-muted-foreground">Rules ({rulesText.split('\n').filter((r) => r.trim()).length})</Label>
          <Textarea
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            rows={10}
            disabled={readOnly}
            className="text-[12px] font-mono leading-relaxed"
          />
        </div>
      </div>

      {/* Banned phrases */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Banned stock phrases</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            One per line. Two-layer enforcement: the prompt tells the model to remove them, and the job
            deterministically REJECTS any rewrite that introduces one (a phrase already in the original
            text is left alone).
          </p>
        </div>
        <div className="px-5 py-4 space-y-1.5">
          <Label className="text-[12px] font-medium text-muted-foreground">Phrases ({bannedText.split('\n').filter((p) => p.trim()).length})</Label>
          <Textarea
            value={bannedText}
            onChange={(e) => setBannedText(e.target.value)}
            rows={8}
            disabled={readOnly}
            className="text-[12px] font-mono leading-relaxed"
          />
        </div>
      </div>

      {readOnly && (
        <p className="text-[11px] text-muted-foreground">Only admins can edit the humanizer rules.</p>
      )}
    </div>
  );
}
