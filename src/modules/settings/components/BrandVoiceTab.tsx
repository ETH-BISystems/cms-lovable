import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Sparkles, ExternalLink, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import { testBrandVoiceSample } from '../services/settingsService';
import { ExemplarPickerDialog, type ExemplarPickItem } from './ExemplarPickerDialog';
import type { BrandVoiceSettings } from '../types';

const ARTICLE_TYPES = ['Review', 'Comparison', 'Guide', 'List Post', 'Strategy', 'News', 'Deep Dive'];

// Default ETH voice — mirrors the fallback baked into the article-generation
// prompt (functions/src/shared/brandVoice.ts). Pre-fills the form the first
// time so editors refine an existing voice instead of starting blank.
const DEFAULT_TONE =
  "Knowledgeable and approachable — like a trusted friend who's an expert in points, miles, and travel hacking. " +
  'Never clickbait: specific, data-driven, and honest. Personal experience is woven naturally into the narrative, ' +
  'not bolted on as a separate section. Written for intermediate to advanced points/miles enthusiasts.';

const DEFAULT_TRAITS = ['Knowledgeable', 'Approachable', 'Data-driven', 'Honest', 'Experience-led'];

const DEFAULT_HARD_RULES = [
  'Never use clickbait framing or exaggerated claims',
  'Use "we" when speaking as ETH, "I" when sharing personal experience',
  'Back every recommendation with specific numbers (points values, fees, transfer ratios)',
  'No external backlinks or internal links in drafts — links are managed post-publication',
];

const DEFAULT_TERMINOLOGY = [
  { insteadOf: 'credit card churning', useThis: 'travel hacking' },
  { insteadOf: 'free travel', useThis: 'nearly-free travel' },
];

const AI_WRITING_SIGNS_URL = 'https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing';

// Curated snapshot of "signs of AI writing" negative patterns, distilled from
// the Wikipedia guideline above. Mirrors DEFAULT_AI_WRITING_AVOIDANCES in
// functions/src/shared/brandVoice.ts — seeded the first time the tab loads a
// doc without aiWritingAvoidances, then team-owned/editable like hard rules.
const DEFAULT_AI_WRITING_AVOIDANCES: { pattern: string; example?: string }[] = [
  { pattern: 'Puffery or promotional tone; no travel-brochure superlatives', example: 'a breathtaking, must-visit destination nestled in a vibrant landscape' },
  { pattern: 'Editorializing asides that tell the reader what to think', example: "it's important to note; it is worth mentioning" },
  { pattern: 'Vague attribution implying unearned consensus', example: 'industry reports; experts argue; observers have cited' },
  { pattern: 'Inflated claims of significance or legacy', example: 'stands as a testament; marks a pivotal moment; enduring legacy' },
  { pattern: 'Formulaic "not only... but also" and "not just X, but Y" constructions', example: "it's not just about the points, it's about the journey" },
  { pattern: 'Rule-of-three overuse (triads of adjectives or phrases used for rhythm)', example: 'flexible, rewarding, and easy to use' },
  { pattern: 'AI-favored vocabulary: delve, tapestry, testament, boasts, pivotal, crucial, intricate, showcase, underscore, foster, garner, landscape, realm, vibrant, seamless, elevate, leverage, robust' },
  { pattern: 'Fancy substitutes for plain "is/are"', example: 'serves as; stands as; represents; boasts' },
  { pattern: '"In conclusion"-style wrap-up summaries and vague forward-looking closers', example: 'In conclusion, ...; challenges and future prospects' },
  { pattern: 'Superficial present-participle filler bolted onto sentences', example: '..., highlighting the importance of flexibility' },
  { pattern: 'Em dashes (—) or double hyphens (--) anywhere in body text — both are banned outright (models dodge the em-dash ban by writing "--" instead; it is the same tell). If a sentence seems to need a dash, rewrite it as one complete sentence without a dash, or split it into two sentences. Em dashes are allowed only in the article title and section headers', example: '"The bonus is high — but the fee is steep" → "The bonus is high, but the fee is steep." or "The bonus is high. The fee is steep."' },
  { pattern: 'Excessive boldface on keywords mid-prose' },
  { pattern: 'Turning flowing prose into bullet lists with bolded inline headers', example: 'bullet + "**Flexibility**: ..."' },
  { pattern: 'Title Case in headings; use sentence case' },
  { pattern: 'Curly/smart quotes or apostrophes and decorative emoji; use straight quotes, no emoji' },
];

export function BrandVoiceTab() {
  const { data, loading, error, save } = useSettings<BrandVoiceSettings>('brandVoice');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('brandVoice');

  const [toneDescription, setToneDescription] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [newTrait, setNewTrait] = useState('');
  const [exampleParagraphs, setExampleParagraphs] = useState<{ label: string; text: string }[]>([]);
  const [hardRules, setHardRules] = useState<{ id: string; rule: string; active: boolean }[]>([]);
  const [newRule, setNewRule] = useState('');
  const [aiAvoidances, setAiAvoidances] = useState<{ id: string; pattern: string; example?: string; active: boolean }[]>([]);
  const [newAvoidPattern, setNewAvoidPattern] = useState('');
  const [newAvoidExample, setNewAvoidExample] = useState('');
  const [terminology, setTerminology] = useState<{ insteadOf: string; useThis: string }[]>([]);
  const [formattingStandards, setFormattingStandards] = useState<{ rule: string; standard: string }[]>([]);

  // Voice Test state
  const [testTopic, setTestTopic] = useState('');
  const [testType, setTestType] = useState('Review');
  const [testContentType, setTestContentType] = useState<'article' | 'newsletter'>('article');
  const [showExemplars, setShowExemplars] = useState(true);
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exemplarPicker, setExemplarPicker] = useState<'article' | 'newsletter' | null>(null);

  useEffect(() => {
    if (loading) return;
    const hasSavedVoice =
      !!data &&
      ((data.toneDescription || '').trim().length > 0 ||
        (data.personalityTraits || []).length > 0 ||
        (data.hardRules || []).length > 0);
    if (hasSavedVoice) {
      setToneDescription(data.toneDescription || '');
      setPersonalityTraits(data.personalityTraits || []);
      setExampleParagraphs(data.exampleParagraphs || []);
      setHardRules(data.hardRules || []);
      setTerminology(data.preferredTerminology || []);
      setFormattingStandards(data.formattingStandards || []);
    } else {
      // First run — pre-fill the default ETH voice so there's a real starting
      // point to edit (matches the fallback the writing agent uses)
      setToneDescription(DEFAULT_TONE);
      setPersonalityTraits(DEFAULT_TRAITS);
      setExampleParagraphs(data?.exampleParagraphs || []);
      setHardRules(DEFAULT_HARD_RULES.map(rule => ({ id: crypto.randomUUID(), rule, active: true })));
      setTerminology(DEFAULT_TERMINOLOGY);
      setFormattingStandards(data?.formattingStandards || []);
    }
    // Seed the AI-writing negative patterns whenever they have never been
    // saved (older docs predate the field); a saved empty list stays empty.
    setAiAvoidances(
      data?.aiWritingAvoidances ??
        DEFAULT_AI_WRITING_AVOIDANCES.map(a => ({ id: crypto.randomUUID(), pattern: a.pattern, example: a.example, active: true }))
    );
  }, [data, loading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({
        toneDescription,
        personalityTraits: personalityTraits.filter(t => t.trim()),
        exampleParagraphs: exampleParagraphs.filter(e => e.text.trim()),
        hardRules: hardRules.filter(r => r.rule.trim()),
        aiWritingAvoidances: aiAvoidances
          .filter(a => a.pattern.trim())
          .map(a => ({ id: a.id, pattern: a.pattern, example: a.example || '', active: a.active })),
        preferredTerminology: terminology.filter(t => t.insteadOf.trim() && t.useThis.trim()),
        formattingStandards: formattingStandards.filter(f => f.rule.trim() && f.standard.trim()),
      } as Partial<BrandVoiceSettings>);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const addTrait = () => {
    if (!newTrait.trim()) return;
    setPersonalityTraits([...personalityTraits, newTrait.trim()]);
    setNewTrait('');
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    setHardRules([...hardRules, { id: crypto.randomUUID(), rule: newRule.trim(), active: true }]);
    setNewRule('');
  };

  const addAvoidance = () => {
    if (!newAvoidPattern.trim()) return;
    setAiAvoidances([
      ...aiAvoidances,
      { id: crypto.randomUUID(), pattern: newAvoidPattern.trim(), example: newAvoidExample.trim() || undefined, active: true },
    ]);
    setNewAvoidPattern('');
    setNewAvoidExample('');
  };

  // Exemplar libraries live on the saved settings doc (not local form state) —
  // adds/removes persist immediately and the live subscription re-renders.
  const handleAddExemplar = async (kind: 'article' | 'newsletter', item: ExemplarPickItem) => {
    const field = kind === 'article' ? 'exemplarArticles' : 'exemplarNewsletters';
    const current = (kind === 'article' ? data?.exemplarArticles : data?.exemplarNewsletters) || [];
    if (current.some(e => e.id === item.id)) return;
    await save({
      [field]: [...current, { id: item.id, title: item.title, url: item.url, addedAt: new Date().toISOString() }],
    } as Partial<BrandVoiceSettings>);
  };

  const handleRemoveExemplar = async (kind: 'article' | 'newsletter', id: string) => {
    const field = kind === 'article' ? 'exemplarArticles' : 'exemplarNewsletters';
    const current = (kind === 'article' ? data?.exemplarArticles : data?.exemplarNewsletters) || [];
    await save({ [field]: current.filter(e => e.id !== id) } as Partial<BrandVoiceSettings>);
  };

  const handleVoiceTest = async () => {
    if (!testTopic) return;
    setTesting(true);
    try {
      const result = await testBrandVoiceSample({
        topic: testTopic,
        articleType: testType,
        contentType: testContentType,
      });
      setTestOutput(result.sample);
      if (!result.usedCustomVoice) {
        toast.info('Sample used the default ETH voice', {
          description: 'Save your brand voice changes first for them to influence the sample.',
        });
      }
    } catch (err) {
      toast.error('Voice test failed', { description: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save bar */}
      {!readOnly && (
        <div className="flex items-center justify-between bg-card rounded-lg border border-border px-5 py-3">
          <p className="text-[12px] text-muted-foreground">
            The saved brand voice is injected into every AI article draft. Unsaved edits are not used.
          </p>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 text-[12px]">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save Brand Voice'}
          </Button>
        </div>
      )}

      {/* Voice Profile */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Voice Profile</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Tone Description</label>
            <Textarea
              value={toneDescription}
              onChange={e => setToneDescription(e.target.value)}
              disabled={readOnly}
              placeholder="Describe the overall tone and voice..."
              rows={6}
              className="text-[13px]"
            />
            <span className="text-[10px] text-muted-foreground">{toneDescription.length} characters</span>
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Voice Personality Traits</label>
            {personalityTraits.map((trait, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={trait}
                  onChange={e => { const t = [...personalityTraits]; t[i] = e.target.value; setPersonalityTraits(t); }}
                  disabled={readOnly}
                  className="text-[12px] h-8 flex-1"
                />
                {!readOnly && (
                  <button onClick={() => setPersonalityTraits(personalityTraits.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  value={newTrait}
                  onChange={e => setNewTrait(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTrait()}
                  placeholder="Add trait..."
                  className="text-[12px] h-8 max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={addTrait} className="text-[11px] gap-1">
                  <Plus className="h-3 w-3" />Add Trait
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Example Paragraphs */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Example Paragraphs</h3>
          <span className="text-[10px] text-muted-foreground">{exampleParagraphs.length}/10</span>
        </div>
        <div className="px-5 py-4 space-y-4">
          {exampleParagraphs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-[12px]">No example paragraphs added yet.</p>
              {!readOnly && (
                <Button variant="outline" size="sm" className="mt-3 text-[11px] gap-1" onClick={() => setExampleParagraphs([...exampleParagraphs, { label: '', text: '' }])}>
                  <Plus className="h-3 w-3" />Add Example
                </Button>
              )}
            </div>
          ) : (
            <>
              {exampleParagraphs.map((ex, i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Input
                      value={ex.label}
                      onChange={e => { const x = [...exampleParagraphs]; x[i] = { ...x[i], label: e.target.value }; setExampleParagraphs(x); }}
                      disabled={readOnly}
                      className="text-[12px] h-7 w-56 font-medium"
                      placeholder="Label..."
                    />
                    {!readOnly && (
                      <button onClick={() => setExampleParagraphs(exampleParagraphs.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Textarea
                    value={ex.text}
                    onChange={e => { const x = [...exampleParagraphs]; x[i] = { ...x[i], text: e.target.value }; setExampleParagraphs(x); }}
                    disabled={readOnly}
                    rows={4}
                    className="text-[12px]"
                  />
                </div>
              ))}
              {!readOnly && exampleParagraphs.length < 10 && (
                <Button variant="outline" size="sm" className="text-[11px] gap-1" onClick={() => setExampleParagraphs([...exampleParagraphs, { label: '', text: '' }])}>
                  <Plus className="h-3 w-3" />Add Example
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hard Rules */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Hard Rules</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          {hardRules.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No hard rules defined yet.</p>
          ) : (
            hardRules.map((rule, i) => (
              <div key={rule.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <Switch
                  checked={rule.active}
                  onCheckedChange={checked => { const r = [...hardRules]; r[i] = { ...r[i], active: checked }; setHardRules(r); }}
                  disabled={readOnly}
                />
                <span className={cn('text-[12px] flex-1', !rule.active && 'text-muted-foreground line-through')}>{rule.rule}</span>
                {!readOnly && (
                  <button onClick={() => setHardRules(hardRules.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
          {!readOnly && (
            <div className="flex gap-2 mt-2">
              <Input value={newRule} onChange={e => setNewRule(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRule()} placeholder="Add a hard rule..." className="text-[12px] h-8" />
              <Button variant="outline" size="sm" onClick={addRule} className="text-[12px]"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      </div>

      {/* AI Writing — Patterns to Avoid */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">AI Writing — Patterns to Avoid</h3>
          <a
            href={AI_WRITING_SIGNS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-accent hover:underline flex items-center gap-1"
          >
            Source: Wikipedia — Signs of AI writing
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Active patterns are injected into every AI prose generator (article drafts, rewrites, refreshes,
            newsletter curation, subject lines, social posts, titles) as an explicit avoid-list.
          </p>
          {aiAvoidances.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No avoid patterns defined yet.</p>
          ) : (
            aiAvoidances.map((avoidance, i) => (
              <div key={avoidance.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <Switch
                  checked={avoidance.active}
                  onCheckedChange={checked => { const a = [...aiAvoidances]; a[i] = { ...a[i], active: checked }; setAiAvoidances(a); }}
                  disabled={readOnly}
                />
                <div className="flex-1 space-y-1">
                  <Input
                    value={avoidance.pattern}
                    onChange={e => { const a = [...aiAvoidances]; a[i] = { ...a[i], pattern: e.target.value }; setAiAvoidances(a); }}
                    disabled={readOnly}
                    className={cn('text-[12px] h-8', !avoidance.active && 'text-muted-foreground line-through')}
                  />
                  <Input
                    value={avoidance.example ?? ''}
                    onChange={e => { const a = [...aiAvoidances]; a[i] = { ...a[i], example: e.target.value }; setAiAvoidances(a); }}
                    disabled={readOnly}
                    placeholder="Example (optional)..."
                    className={cn('text-[11px] h-7 text-muted-foreground', !avoidance.active && 'line-through')}
                  />
                </div>
                {!readOnly && (
                  <button onClick={() => setAiAvoidances(aiAvoidances.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
          {!readOnly && (
            <div className="flex gap-2 mt-2">
              <Input
                value={newAvoidPattern}
                onChange={e => setNewAvoidPattern(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAvoidance()}
                placeholder="Add a pattern to avoid..."
                className="text-[12px] h-8"
              />
              <Input
                value={newAvoidExample}
                onChange={e => setNewAvoidExample(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAvoidance()}
                placeholder="Example (optional)..."
                className="text-[12px] h-8 max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={addAvoidance} className="text-[12px]"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      </div>

      {/* Preferred Terminology */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Preferred Terminology</h3>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
            <span>Instead Of</span><span></span><span>Use This</span><span></span>
          </div>
          {terminology.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No terminology preferences set.</p>
          ) : (
            terminology.map((term, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                <Input value={term.insteadOf} onChange={e => { const t = [...terminology]; t[i] = { ...t[i], insteadOf: e.target.value }; setTerminology(t); }} disabled={readOnly} className="text-[12px] h-8" />
                <span className="text-[10px] text-accent">→</span>
                <Input value={term.useThis} onChange={e => { const t = [...terminology]; t[i] = { ...t[i], useThis: e.target.value }; setTerminology(t); }} disabled={readOnly} className="text-[12px] h-8" />
                {!readOnly && (
                  <button onClick={() => setTerminology(terminology.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
          {!readOnly && (
            <Button variant="outline" size="sm" className="text-[11px] gap-1" onClick={() => setTerminology([...terminology, { insteadOf: '', useThis: '' }])}>
              <Plus className="h-3 w-3" />Add Row
            </Button>
          )}
        </div>
      </div>

      {/* Formatting Standards */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Formatting Standards</h3>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="grid grid-cols-[160px_1fr_auto] gap-2 items-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
            <span>Rule</span><span>Standard</span><span></span>
          </div>
          {formattingStandards.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No formatting standards defined.</p>
          ) : (
            formattingStandards.map((fmt, i) => (
              <div key={i} className="grid grid-cols-[160px_1fr_auto] gap-2 items-center">
                <Input value={fmt.rule} onChange={e => { const f = [...formattingStandards]; f[i] = { ...f[i], rule: e.target.value }; setFormattingStandards(f); }} disabled={readOnly} className="text-[12px] h-8 font-medium" />
                <Input value={fmt.standard} onChange={e => { const f = [...formattingStandards]; f[i] = { ...f[i], standard: e.target.value }; setFormattingStandards(f); }} disabled={readOnly} className="text-[12px] h-8" />
                {!readOnly && (
                  <button onClick={() => setFormattingStandards(formattingStandards.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
          {!readOnly && (
            <Button variant="outline" size="sm" className="text-[11px] gap-1" onClick={() => setFormattingStandards([...formattingStandards, { rule: '', standard: '' }])}>
              <Plus className="h-3 w-3" />Add Row
            </Button>
          )}
        </div>
      </div>

      {/* Exemplar Article Library */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Exemplar Article Library</h3>
          {!readOnly && (
            <Button variant="outline" size="sm" className="text-[11px] gap-1" onClick={() => setExemplarPicker('article')}>
              <Plus className="h-3 w-3" />Add Article
            </Button>
          )}
        </div>
        <div className="px-5 py-4">
          {data?.exemplarArticles && data.exemplarArticles.length > 0 ? (
            <div className="space-y-2">
              {data.exemplarArticles.map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent hover:underline flex items-center gap-1.5">
                      {a.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[12px] text-card-foreground">{a.title}</span>
                  )}
                  {!readOnly && (
                    <button onClick={() => handleRemoveExemplar('article', a.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground text-center py-4">No exemplar articles added yet.</p>
          )}
        </div>
      </div>

      {/* Exemplar Newsletter Library */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Exemplar Newsletter Library</h3>
          {!readOnly && (
            <Button variant="outline" size="sm" className="text-[11px] gap-1" onClick={() => setExemplarPicker('newsletter')}>
              <Plus className="h-3 w-3" />Add Newsletter
            </Button>
          )}
        </div>
        <div className="px-5 py-4">
          {data?.exemplarNewsletters && data.exemplarNewsletters.length > 0 ? (
            <div className="space-y-2">
              {data.exemplarNewsletters.map(n => (
                <div key={n.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  {n.url ? (
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent hover:underline flex items-center gap-1.5">
                      {n.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[12px] text-card-foreground">{n.title}</span>
                  )}
                  {!readOnly && (
                    <button onClick={() => handleRemoveExemplar('newsletter', n.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground text-center py-4">No exemplar newsletters added yet.</p>
          )}
        </div>
      </div>

      {exemplarPicker && (
        <ExemplarPickerDialog
          open
          onOpenChange={(open) => { if (!open) setExemplarPicker(null); }}
          kind={exemplarPicker}
          existingIds={(exemplarPicker === 'article' ? data?.exemplarArticles : data?.exemplarNewsletters)?.map(e => e.id) || []}
          onAdd={(item) => handleAddExemplar(exemplarPicker, item)}
        />
      )}

      {/* Version History */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Version History</h3>
        </div>
        <div className="px-5 py-4">
          {data?.versionHistory && data.versionHistory.length > 0 ? (
            <div className="space-y-2">
              {data.versionHistory.map((v, i) => (
                <div key={i} className="flex items-start gap-3 text-[12px]">
                  <span className="text-muted-foreground shrink-0 w-24">
                    {v.timestamp?.toDate ? v.timestamp.toDate().toLocaleDateString() : '—'}
                  </span>
                  <span className="text-card-foreground">
                    <span className="font-medium">{v.changedBy}</span> — {v.summary}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground text-center py-4">No version history yet.</p>
          )}
        </div>
      </div>

      {/* Voice Test Panel */}
      <div className="bg-card rounded-lg border-l-4 border-l-accent border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />Voice Test
          </h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_160px] gap-3">
            <Input
              value={testTopic}
              onChange={e => setTestTopic(e.target.value)}
              placeholder="Enter a topic to generate a sample paragraph..."
              className="text-[12px] h-9"
            />
            <select
              value={testType}
              onChange={e => setTestType(e.target.value)}
              className="text-[12px] h-9 rounded-md border border-input bg-background px-3"
            >
              {ARTICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex rounded-md overflow-hidden border border-input h-9">
              <button
                onClick={() => setTestContentType('article')}
                className={cn(
                  'flex-1 text-[11px] font-medium transition-colors',
                  testContentType === 'article' ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'
                )}
              >
                Blog Article
              </button>
              <button
                onClick={() => setTestContentType('newsletter')}
                className={cn(
                  'flex-1 text-[11px] font-medium transition-colors',
                  testContentType === 'newsletter' ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'
                )}
              >
                Newsletter
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showExemplars}
                onChange={e => setShowExemplars(e.target.checked)}
                className="rounded border-input"
              />
              Show Matched Exemplars
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleVoiceTest}
              disabled={testing || !testTopic}
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 text-[12px]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {testing ? 'Generating...' : 'Generate Sample'}
            </Button>
          </div>

          {testOutput && (
            <div className="space-y-3">
              <div className="bg-muted/40 rounded-lg p-4 text-[13px] text-card-foreground leading-relaxed">
                {testOutput}
              </div>

              {showExemplars && (
                <div className="bg-muted/20 rounded-lg p-3 text-[11px] text-muted-foreground">
                  <span className="font-medium">Voice trained on:</span>{' '}
                  {data?.exemplarArticles && data.exemplarArticles.length > 0
                    ? data.exemplarArticles.map(a => a.title).join(', ')
                    : 'saved tone description, personality traits, hard rules, and example paragraphs'}
                </div>
              )}

              {/* Hard rules included in the generation prompt */}
              <div className="border border-border rounded-lg p-3 space-y-1.5">
                <h5 className="text-[11px] font-semibold text-card-foreground">Hard Rules Applied</h5>
                {hardRules.filter(r => r.active).length > 0 ? (
                  hardRules.filter(r => r.active).map((rule) => (
                    <div key={rule.id} className="flex items-center gap-2 text-[10px]">
                      <span className="text-green-600">✓</span>
                      <span className="text-muted-foreground">{rule.rule}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground">No active hard rules were included in the prompt.</p>
                )}
              </div>

              <Button variant="outline" size="sm" className="text-[11px]" onClick={handleVoiceTest}>
                Regenerate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
