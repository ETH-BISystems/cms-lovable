import { useState, useEffect, useMemo, useCallback } from 'react';
import { format as formatDate, addDays } from 'date-fns';
import {
  X, Plus, Mic, Sparkles, ChevronDown, ChevronRight, Keyboard,
  Calendar as CalendarIcon, Loader2, Save, LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { VoiceNoteRecorder } from '@/components/shared/VoiceNoteRecorder';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useKeywords, type KeywordOpportunity } from '@/modules/keywords';
import type { VoiceNoteData } from '@/components/shared/VoiceNoteRecorder';
import type { CreateArticleInput, Priority, EntryPoint, SourceUrl } from '../types';
import { SOURCE_URL_TYPES, detectUrlType, sourceUrlTitle, MAX_SOURCE_URLS, type SourceUrlType } from '../utils/sourceUrls';
import { PAGE_TEMPLATES, getPageTemplate, buildTemplateSkeletonHtml } from './pageTemplates';
import { TemplateGallery, SCRATCH_ID } from './TemplateGallery';

const ARTICLE_TYPES = ['Review', 'Comparison', 'Guide', 'List Post', 'Strategy', 'News & Updates', 'Deep Dive'];
const TOPIC_CLUSTERS = ['Chase Cards', 'Amex Cards', 'Capital One', 'Airlines', 'Hotels', 'Transfer Partners', 'Lounges', 'Strategy', 'Deals', 'Trusted Traveler'];

const LENGTHS = [
  { key: 'short', label: 'Short', range: '800–1,200 words', desc: 'News, deal alerts, quick takes' },
  { key: 'standard', label: 'Standard', range: '1,500–2,500 words', desc: 'Reviews, comparisons, most articles' },
  { key: 'longform', label: 'Long-form', range: '3,000–4,500 words', desc: 'Comprehensive guides, deep dives' },
  { key: 'epic', label: 'Epic', range: '5,000+ words', desc: 'Pillar content, definitive guides' },
] as const;

const DEPTHS = ['Overview', 'Detailed', 'Comprehensive'] as const;

type CaptureCategory = 'flight' | 'hotel' | 'lounge' | 'destination' | 'card' | 'general';
const CATEGORY_META: Record<CaptureCategory, { emoji: string; label: string }> = {
  flight: { emoji: '✈️', label: 'Flight Review' },
  hotel: { emoji: '🏨', label: 'Hotel Stay' },
  lounge: { emoji: '🛋️', label: 'Lounge Visit' },
  destination: { emoji: '🌍', label: 'Destination' },
  card: { emoji: '💳', label: 'Card Strategy' },
  general: { emoji: '📝', label: 'General' },
};

const CATEGORY_PROMPTS: Record<CaptureCategory, string[]> = {
  flight: [
    'Which airline and route? (e.g., JAL NRT → JFK)',
    'Which aircraft type and seat? (e.g., 777-300ER, Sky Suite III, seat 2K)',
    'How was the ground experience? (check-in, lounge, boarding)',
    'How was the seat and cabin? (hard product, privacy, storage, IFE)',
    'How was the meal service? (courses, quality, presentation, drinks)',
    'How was the amenity kit and bedding?',
    'How was the in-flight service? (crew attentiveness, proactive vs reactive)',
    'Any standout moments or disappointments?',
    'Would you book this again? How does it compare to competitors?',
  ],
  hotel: [
    'Which property and room category?',
    'How was check-in? (elite recognition, upgrade, welcome amenity)',
    'How was the room? (size, view, design, bathroom, amenities)',
    'How was the pool, spa, or fitness center?',
    'How was breakfast? (included with status? quality?)',
    'How did you book? (points, cash, free night cert)',
    'Points value and overall value assessment?',
  ],
  lounge: [
    'Which lounge and airport terminal?',
    'How did you access? (card benefit, airline status, day pass)',
    'How crowded was it? What time did you visit?',
    'How was the food and drink selection?',
    'How were the facilities? (showers, workspaces, quiet areas)',
    'How does it compare to other lounges at this airport?',
  ],
  destination: [
    'Which city/country and how long did you stay?',
    'Best neighborhoods or areas to stay?',
    'Must-do experiences or hidden gems?',
    'Food and restaurant highlights?',
    'Transportation tips and budget notes?',
  ],
  card: [
    'Which card(s) are you discussing?',
    "What's the key insight or strategy?",
    'Current bonus offer details and timing?',
    'How does this fit into a broader card portfolio?',
    'Transfer partner sweet spots?',
    'Annual fee justification — is it worth keeping?',
  ],
  general: [],
};

function fmtVol(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v); }

function KDBarInline({ kd }: { kd: number }) {
  const color = kd <= 30 ? 'bg-success' : kd <= 60 ? 'bg-warning' : 'bg-destructive';
  const textColor = kd <= 30 ? 'text-success' : kd <= 60 ? 'text-warning-foreground' : 'text-destructive';
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      <span className="text-[9px] font-medium text-muted-foreground">KD</span>
      <span className={`inline-block w-6 h-1.5 rounded-full ${color}`} />
      <span className={`text-[10px] font-semibold ${textColor}`}>{kd}</span>
    </span>
  );
}

// Title suggestions are simple templates derived from the chosen keyword — no fabricated metrics.
function generateTitleSuggestions(keyword: string): { title: string; rationale: string; longTailKeyword: string }[] {
  const cap = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const year = new Date().getFullYear();
  return [
    { title: `${cap}: The Complete ${year} Guide`, rationale: `Targets '${keyword} guide ${year}' — informational intent`, longTailKeyword: `${keyword} guide ${year}` },
    { title: `Best ${cap} Compared (${year} Rankings)`, rationale: 'Comparison format — commercial intent', longTailKeyword: `best ${keyword} comparison` },
    { title: `${cap} Review: Is It Worth It in ${year}?`, rationale: "'Worth it' intent — high conversion", longTailKeyword: `${keyword} worth it` },
    { title: `How to Maximize ${cap} Benefits (Expert Tips)`, rationale: "'How to' captures instructional queries", longTailKeyword: `how to maximize ${keyword}` },
  ];
}

function KeywordAutocomplete({ value, onChange, onSelect, placeholder, keywords, selected }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (kw: KeywordOpportunity) => void;
  placeholder?: string;
  keywords: KeywordOpportunity[];
  selected?: string[];
}) {
  const [open, setOpen] = useState(false);
  const results = value.trim().length >= 2
    ? keywords.filter(k => k.keyword.toLowerCase().includes(value.toLowerCase()) && !(selected || []).includes(k.keyword)).slice(0, 6)
    : [];

  return (
    <div className="relative">
      <Input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder || 'Search keywords...'} className="h-9 text-[13px]" />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
          {results.map(kw => (
            <button key={kw.id} onMouseDown={() => { onSelect(kw); onChange(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between">
              <span className="text-[12px] text-foreground truncate flex-1">{kw.keyword}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                {fmtVol(kw.searchVolume)}/mo · {kw.kd <= 30 ? 'Easy' : kw.kd <= 60 ? 'Medium' : 'Hard'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface NewArticleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateArticleInput) => void;
  /** CMS-149: persist a partially filled form (target keyword optional). */
  onSaveDraft?: (input: CreateArticleInput) => void;
  prefillData?: Partial<CreateArticleInput> | null;
  loading?: boolean;
}

export function NewArticleModal({ open, onClose, onSubmit, onSaveDraft, prefillData, loading }: NewArticleModalProps) {
  const { members: teamMembers } = useTeamMembers();
  const { keywords: allKeywords } = useKeywords();

  // Section 1 — Article Basics
  const [title, setTitle] = useState('');
  const [articleType, setArticleType] = useState('');
  const [articleContext, setArticleContext] = useState('');
  const [articleAngle, setArticleAngle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [aiTitles, setAiTitles] = useState<{ title: string; rationale: string; longTailKeyword: string }[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);

  // CMS-150 — Page template choice (right after article type): 'scratch'
  // (blank body) or a PAGE_TEMPLATES id (blank body pre-filled with the
  // template's placeholder structure).
  const [templateChoice, setTemplateChoice] = useState<string>(SCRATCH_ID);

  // Section 2 — Keywords
  const [targetKeyword, setTargetKeyword] = useState('');
  const [kwSearch, setKwSearch] = useState('');
  const [selectedKw, setSelectedKw] = useState<KeywordOpportunity | null>(null);
  const [secondaryKws, setSecondaryKws] = useState<KeywordOpportunity[]>([]);
  const [secKwSearch, setSecKwSearch] = useState('');
  const [topicCluster, setTopicCluster] = useState('');

  // Section 3 — Length & Depth
  const [articleLength, setArticleLength] = useState<'short' | 'standard' | 'longform' | 'epic'>('standard');
  const [depth, setDepth] = useState<'Overview' | 'Detailed' | 'Comprehensive'>('Detailed');

  // Section 4 — Experience
  const [expMode, setExpMode] = useState<'record' | 'type'>('type');
  const [expCategory, setExpCategory] = useState<CaptureCategory>('general');
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [writtenExperience, setWrittenExperience] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [experienceVoiceNote, setExperienceVoiceNote] = useState<VoiceNoteData | null>(null);
  const [editorialNotes, setEditorialNotes] = useState('');

  // Section 5 — Source Material
  const [sourceUrls, setSourceUrls] = useState<SourceUrl[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [urlDropVoiceNote, setUrlDropVoiceNote] = useState<VoiceNoteData | null>(null);

  // Section 6 — Advanced
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [outline, setOutline] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState<Date>(addDays(new Date(), 7));
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [entryPoint, setEntryPoint] = useState<EntryPoint>('Manual');

  // Set default assignee when team loads
  useEffect(() => {
    if (teamMembers.length > 0 && !assignee) {
      setAssignee(teamMembers[0].name);
    }
  }, [teamMembers, assignee]);

  // Apply prefill data
  useEffect(() => {
    if (prefillData) {
      if (prefillData.title) setTitle(prefillData.title);
      if (prefillData.targetKeyword) setTargetKeyword(prefillData.targetKeyword);
      if (prefillData.priority) setPriority(prefillData.priority);
      if (prefillData.entryPoint) setEntryPoint(prefillData.entryPoint);
      if (prefillData.sourceUrls) setSourceUrls(prefillData.sourceUrls);
      if (prefillData.topicCluster) setTopicCluster(prefillData.topicCluster);
      if (prefillData.editorialNotes) setEditorialNotes(prefillData.editorialNotes);
      if (prefillData.format) setArticleType(prefillData.format);
    }
  }, [prefillData]);

  const triggerAiTitles = useCallback((kw: string) => {
    if (!kw.trim() || loadingTitles) return;
    setLoadingTitles(true);
    setTimeout(() => { setAiTitles(generateTitleSuggestions(kw)); setLoadingTitles(false); }, 300);
  }, [loadingTitles]);

  const generateOutline = () => {
    const kw = targetKeyword || title || 'this topic';
    setOutline([
      `1. Introduction — Why ${kw} matters in ${new Date().getFullYear()}`,
      `2. Key Features & Benefits — Detailed breakdown`,
      `3. Head-to-Head Comparison — How top options stack up`,
      ...(articleLength === 'longform' || articleLength === 'epic' ? [`4. In-Depth Analysis — Deep dive into specifics`, `5. Expert Tips & Strategies — Maximizing value`] : []),
      `${articleLength === 'longform' || articleLength === 'epic' ? '6' : '4'}. Verdict & Recommendations — Final take`,
    ]);
  };

  // Reset on close
  const handleClose = () => {
    setTitle('');
    setArticleType('');
    setAiTitles([]);
    setLoadingTitles(false);
    setTemplateChoice(SCRATCH_ID);
    setTargetKeyword('');
    setKwSearch('');
    setSelectedKw(null);
    setSecondaryKws([]);
    setSecKwSearch('');
    setTopicCluster('');
    setArticleLength('standard');
    setDepth('Detailed');
    setExpMode('type');
    setExpCategory('general');
    setShowAllPrompts(false);
    setWrittenExperience('');
    setAdditionalDetails('');
    setExperienceVoiceNote(null);
    setAssignee(teamMembers.length > 0 ? teamMembers[0].name : '');
    setPriority('Medium');
    setEntryPoint('Manual');
    setEditorialNotes('');
    setSourceUrls([]);
    setShowVoiceRecorder(false);
    setUrlDropVoiceNote(null);
    setAdvancedOpen(false);
    setOutline([]);
    setTargetDate(addDays(new Date(), 7));
    onClose();
  };

  const buildInput = (saveAsDraft: boolean): CreateArticleInput => {
    const member = teamMembers.find(t => t.name === assignee);
    const avatar = member?.avatar
      || assignee.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      || 'UN';
    const experienceText = [writtenExperience.trim(), additionalDetails.trim(), experienceVoiceNote?.transcript?.trim()]
      .filter(Boolean).join('\n\n');
    // CMS-150: a chosen template seeds the blank body with its placeholder
    // structure (headings, photo slots, table slots) at creation time.
    const chosenTemplate = templateChoice === SCRATCH_ID ? null : getPageTemplate(templateChoice);
    return {
      title,
      targetKeyword,
      assignee: { name: assignee || 'Unassigned', avatar },
      priority,
      entryPoint,
      source: { type: entryPoint, label: '' },
      sourceUrls: sourceUrls.filter(su => su.url.trim()).length > 0 ? sourceUrls.filter(su => su.url.trim()) : undefined,
      format: articleType || undefined,
      topicCluster: topicCluster || undefined,
      editorialNotes: editorialNotes || undefined,
      articleLength,
      depth,
      experienceCategory: experienceText ? expCategory : undefined,
      experienceText: experienceText || undefined,
      secondaryKeywords: secondaryKws.length > 0 ? secondaryKws.map(k => k.keyword) : undefined,
      outline: outline.length > 0 ? outline : undefined,
      targetDate: targetDate.toISOString(),
      context: articleContext || undefined,
      angle: articleAngle || undefined,
      targetAudience: targetAudience || undefined,
      pageTemplateId: chosenTemplate?.id,
      content: chosenTemplate ? buildTemplateSkeletonHtml(chosenTemplate) : undefined,
      ...(saveAsDraft ? { saveAsDraft: true } : {}),
    };
  };

  const handleSubmit = () => {
    onSubmit(buildInput(false));
    handleClose();
  };

  // CMS-149: park a half-entered form as an article in the New Article
  // column — nothing is lost when the author switches CMS areas.
  const handleSaveDraft = () => {
    onSaveDraft?.(buildInput(true));
    handleClose();
  };

  const addSourceUrl = () => {
    if (sourceUrls.length < MAX_SOURCE_URLS) setSourceUrls(prev => [...prev, { url: '', type: 'Reference Material' }]);
  };
  const updateSourceUrl = (index: number, field: 'url' | 'type', value: string) => {
    setSourceUrls(prev => prev.map((s, i) => {
      if (i !== index) return s;
      if (field === 'url') return { ...s, url: value, type: value.trim() ? detectUrlType(value) : s.type };
      return { ...s, type: value as SourceUrl['type'] };
    }));
  };
  const removeSourceUrl = (index: number) => setSourceUrls(prev => prev.filter((_, i) => i !== index));

  const prompts = CATEGORY_PROMPTS[expCategory];
  const visiblePrompts = showAllPrompts ? prompts : prompts.slice(0, 4);
  const lengthLabel = LENGTHS.find(l => l.key === articleLength);

  const isValid = title.trim() && targetKeyword.trim();
  // CMS-149: a draft only needs a title (something to recognise it by).
  const canSaveDraft = title.trim().length > 0 && !!onSaveDraft;

  const sectionHeader = (num: number, label: string, extra?: React.ReactNode) => (
    <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">{num}</span>
      {label}
      {extra}
    </h3>
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> Start New Article
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ═══ SECTION 1 — ARTICLE BASICS ═══ */}
          <section>
            {sectionHeader(1, 'Article Basics')}

            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Article Title or Topic <span className="text-destructive">*</span></label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Working title or topic idea..." className="h-10 text-[14px]" />
              <div className="mt-2">
                {!targetKeyword.trim() ? (
                  <Button size="sm" variant="outline" disabled className="h-7 text-[11px] gap-1.5 opacity-50">
                    <Sparkles className="h-3 w-3" /> Select a keyword to suggest titles
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5 border-accent text-accent hover:bg-accent/10"
                    onClick={() => triggerAiTitles(targetKeyword)} disabled={loadingTitles}>
                    {loadingTitles ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {loadingTitles ? 'Analyzing...' : 'AI Suggest Titles'}
                  </Button>
                )}
              </div>
              {aiTitles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {aiTitles.map((s, i) => (
                    <button key={i} onClick={() => setTitle(s.title)}
                      className={cn('w-full text-left px-3 py-2.5 rounded-lg border transition-colors',
                        title === s.title ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50')}>
                      <p className="text-[12px] font-semibold text-card-foreground">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{s.rationale}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">"{s.longTailKeyword}"</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Article Type <span className="text-[9px] text-muted-foreground">(recommended)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {ARTICLE_TYPES.map(t => (
                  <button key={t} onClick={() => setArticleType(articleType === t ? '' : t)}
                    className={cn('px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all',
                      articleType === t ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:bg-muted hover:border-accent/40')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* CMS-150 — Page template: start from a template OR from scratch,
                right after article type. Each option previews its structure;
                a chosen template seeds the blank body with placeholder blocks
                (headings, photo slots, table slots) the author edits and
                reorders in Content Preview. */}
            <div className="mt-4">
              <label className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5 text-accent" />
                Page Template <span className="text-[9px] text-muted-foreground">(optional — preview and pick a starting layout)</span>
              </label>
              <div className="max-h-[300px] overflow-y-auto pr-1 rounded-lg">
                <TemplateGallery
                  templates={PAGE_TEMPLATES}
                  selectedId={templateChoice}
                  onSelect={setTemplateChoice}
                  previewHeight={100}
                />
              </div>
              {templateChoice !== SCRATCH_ID && (
                <p className="text-[9px] text-muted-foreground mt-1.5 italic">
                  The blank article body will be pre-filled with this template's sections and placeholders — edit
                  text and drag blocks around in Content Preview, or pick "Start from Scratch" for an empty body.
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* ═══ ARTICLE BRIEF (Context, Angle, Audience) ═══ */}
          <section className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Article Context <span className="text-[9px] text-muted-foreground">(what is this article about?)</span></label>
              <Textarea value={articleContext} onChange={e => setArticleContext(e.target.value)} placeholder="Describe the article's purpose, what problem it solves, key points to cover..." className="text-[12px] min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Angle</label>
                <Input value={articleAngle} onChange={e => setArticleAngle(e.target.value)} placeholder="e.g., Budget-friendly, Premium, Beginner..." className="text-[12px]" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Target Audience</label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger className="text-[12px]"><SelectValue placeholder="Select audience..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginners</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced Enthusiasts</SelectItem>
                    <SelectItem value="digital-nomad">Digital Nomads</SelectItem>
                    <SelectItem value="family">Family Travelers</SelectItem>
                    <SelectItem value="luxury">Luxury Travelers</SelectItem>
                    <SelectItem value="business">Business Travelers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* ═══ SECTION 2 — KEYWORDS & CLUSTERS ═══ */}
          <section>
            {sectionHeader(2, 'Keywords & Clusters')}

            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Target Keyword <span className="text-destructive">*</span></label>
              {selectedKw ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/5">
                  <span className="text-[13px] font-medium text-foreground flex-1">{selectedKw.keyword}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtVol(selectedKw.searchVolume)}/mo</span>
                  <KDBarInline kd={selectedKw.kd} />
                  <button onClick={() => { setSelectedKw(null); setTargetKeyword(''); }}
                    className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <>
                  <KeywordAutocomplete value={kwSearch} onChange={v => { setKwSearch(v); setTargetKeyword(v); }}
                    keywords={allKeywords}
                    placeholder="Search: e.g., chase sapphire reserve review..."
                    onSelect={kw => { setSelectedKw(kw); setTargetKeyword(kw.keyword); setTopicCluster(kw.topicCluster); }} />
                  {targetKeyword && <p className="text-[9px] text-muted-foreground mt-1">Using "{targetKeyword}" as target keyword</p>}
                </>
              )}
            </div>

            {/* Keyword Brief */}
            {selectedKw && (
              <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Volume</p>
                    <p className="text-[12px] font-semibold text-foreground">{fmtVol(selectedKw.searchVolume)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Difficulty</p>
                    <p className={cn('text-[12px] font-semibold', selectedKw.kd <= 30 ? 'text-success' : selectedKw.kd <= 60 ? 'text-warning-foreground' : 'text-destructive')}>
                      {selectedKw.kd}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Our Rank</p>
                    <p className="text-[12px] font-semibold text-foreground">{selectedKw.ethRankPosition ? `#${selectedKw.ethRankPosition}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Top Competitor</p>
                    <p className="text-[10px] font-medium text-foreground truncate">{selectedKw.competitors[0]?.site || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Intent</p>
                    <Badge variant="outline" className="text-[8px] h-4 px-1">{selectedKw.intent}</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Secondary Keywords */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                Secondary Keywords <span className="text-[9px] text-muted-foreground">(optional, 2-5)</span>
              </label>
              {secondaryKws.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {secondaryKws.map(kw => (
                    <span key={kw.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-muted text-foreground">
                      {kw.keyword} <span className="text-muted-foreground">({fmtVol(kw.searchVolume)})</span>
                      <button onClick={() => setSecondaryKws(prev => prev.filter(k => k.id !== kw.id))}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
              {secondaryKws.length < 5 && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <KeywordAutocomplete value={secKwSearch} onChange={setSecKwSearch} placeholder="Add secondary keyword..."
                      keywords={allKeywords}
                      selected={[targetKeyword, ...secondaryKws.map(k => k.keyword)]}
                      onSelect={kw => setSecondaryKws(prev => [...prev, kw])} />
                  </div>
                  {selectedKw && (
                    <Button size="sm" variant="outline" className="h-9 text-[10px] gap-1 shrink-0 border-accent text-accent"
                      onClick={() => {
                        const suggestions = allKeywords.filter(k =>
                          k.topicCluster === selectedKw.topicCluster && k.keyword !== targetKeyword && !secondaryKws.find(s => s.keyword === k.keyword)
                        ).slice(0, 3);
                        setSecondaryKws(prev => [...prev, ...suggestions].slice(0, 5));
                      }}>
                      <Sparkles className="w-3 h-3" /> AI Suggest
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Topic Cluster */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Topic Cluster</label>
              <Select value={topicCluster} onValueChange={setTopicCluster}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Select cluster" /></SelectTrigger>
                <SelectContent>
                  {TOPIC_CLUSTERS.map(c => <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedKw && topicCluster && <p className="text-[9px] text-muted-foreground mt-1">Auto-populated from keyword cluster</p>}
            </div>
          </section>

          <Separator />

          {/* ═══ SECTION 3 — ARTICLE LENGTH & DEPTH ═══ */}
          <section>
            {sectionHeader(3, 'Article Length & Depth')}

            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted-foreground block mb-2">Suggested Article Length</label>
              <div className="grid grid-cols-2 gap-2">
                {LENGTHS.map(l => (
                  <button key={l.key} onClick={() => setArticleLength(l.key)}
                    className={cn('text-left px-3 py-2.5 rounded-lg border transition-all',
                      articleLength === l.key ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border hover:border-accent/40')}>
                    <p className="text-[12px] font-semibold text-foreground">{l.label}</p>
                    <p className="text-[10px] text-accent font-medium">{l.range}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{l.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-2 italic">
                AI will target {lengthLabel?.range} based on competitor analysis and topic complexity. You can adjust during editing.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Depth <span className="text-[9px] text-muted-foreground">(optional)</span></label>
              <div className="flex gap-2">
                {DEPTHS.map(d => (
                  <button key={d} onClick={() => setDepth(d)}
                    className={cn('flex-1 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all',
                      depth === d ? 'border-accent bg-accent/5 text-accent' : 'border-border text-muted-foreground hover:bg-muted')}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <Separator />

          {/* ═══ SECTION 4 — YOUR EXPERIENCE ═══ */}
          <section>
            {sectionHeader(4, 'Your Experience', (
              <Badge variant="outline" className="text-[8px] h-4 px-1 bg-accent/10 text-accent border-accent/20">Recommended</Badge>
            ))}
            <p className="text-[10px] text-muted-foreground mb-3 -mt-2">Share personal experience for authentic, E-E-A-T-optimized content.</p>

            {/* Category */}
            <div className="mb-3">
              <label className="text-[10px] font-medium text-muted-foreground block mb-1.5">What's this about?</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATEGORY_META) as CaptureCategory[]).map(c => (
                  <button key={c} onClick={() => { setExpCategory(c); setShowAllPrompts(false); }}
                    className={cn('px-2.5 py-1.5 rounded-full text-[10px] font-medium border transition-all',
                      expCategory === c ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:bg-muted')}>
                    {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Record/Type toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden mb-3">
              <button onClick={() => setExpMode('record')}
                className={cn('flex-1 px-4 py-2 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors',
                  expMode === 'record' ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
                <Mic className="w-3.5 h-3.5" /> Record
              </button>
              <button onClick={() => setExpMode('type')}
                className={cn('flex-1 px-4 py-2 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors',
                  expMode === 'type' ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
                <Keyboard className="w-3.5 h-3.5" /> Type
              </button>
            </div>

            {expMode === 'record' ? (
              <div>
                {experienceVoiceNote ? (
                  <p className="text-[10px] text-muted-foreground">
                    ✓ Experience recorded ({experienceVoiceNote.mode === 'typed' ? 'typed' : `${experienceVoiceNote.duration}s`})
                    <button className="ml-2 text-accent hover:underline" onClick={() => setExperienceVoiceNote(null)}>Re-record</button>
                  </p>
                ) : (
                  <VoiceNoteRecorder
                    contextId="new-article-experience"
                    context={'new-article' as 'experience'}
                    onSave={(note) => setExperienceVoiceNote(note)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Textarea value={writtenExperience} onChange={e => setWrittenExperience(e.target.value)}
                  placeholder="Type or dictate your personal experience with this topic..."
                  className="min-h-[120px] text-[12px]" />
                <p className="text-[9px] text-muted-foreground italic">Compatible with Wispr Flow, macOS Dictation, and other speech-to-text tools.</p>
              </div>
            )}

            {/* Category prompts */}
            {expCategory !== 'general' && prompts.length > 0 && (
              <div className="bg-success/5 border border-success/20 rounded-lg p-3 mt-3 space-y-2">
                <p className="text-[10px] font-semibold text-success flex items-center gap-1"><Sparkles className="w-3 h-3" /> Try to cover:</p>
                <ul className="space-y-1">
                  {visiblePrompts.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground leading-snug">
                      <span className="w-3.5 h-3.5 rounded border border-border bg-card flex items-center justify-center shrink-0 mt-0.5 text-[8px]">{i + 1}</span>
                      {p}
                    </li>
                  ))}
                </ul>
                {prompts.length > 4 && (
                  <button onClick={() => setShowAllPrompts(!showAllPrompts)} className="text-[9px] text-accent hover:underline flex items-center gap-1">
                    {showAllPrompts ? <><ChevronDown className="w-3 h-3" />Show fewer</> : <><ChevronRight className="w-3 h-3" />Show all {prompts.length}</>}
                  </button>
                )}
              </div>
            )}

            {/* Additional Details */}
            <div className="mt-3">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Additional Details <span className="text-[9px]">(optional)</span></label>
              <Textarea value={additionalDetails} onChange={e => setAdditionalDetails(e.target.value)}
                placeholder="Specific numbers, dates, prices, or details the AI should include..."
                rows={2} className="text-[12px] min-h-[50px] resize-none" />
            </div>

            {/* Editorial Notes */}
            <div className="mt-3">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Editorial Notes <span className="text-[9px]">(optional)</span></label>
              <Textarea value={editorialNotes} onChange={e => setEditorialNotes(e.target.value)}
                placeholder="Any specific angle, structure, or requirements?"
                rows={2} className="text-[12px] min-h-[50px] resize-none" />
            </div>
          </section>

          <Separator />

          {/* ═══ SECTION 5 — SOURCE MATERIAL ═══ */}
          <section>
            {sectionHeader(5, 'Source Material')}

            {sourceUrls.length > 0 && (
              <div className="space-y-2 mb-3">
                {sourceUrls.map((su, i) => {
                  const type = (SOURCE_URL_TYPES.includes(su.type as SourceUrlType) ? su.type : 'Reference Material') as SourceUrlType;
                  const borderColor: Record<SourceUrlType, string> = {
                    'Competitor Article': 'border-l-destructive',
                    'Issuer Page': 'border-l-accent',
                    'Data Source': 'border-l-[hsl(258,90%,66%)]',
                    'Reference Material': 'border-l-muted-foreground',
                    'Internal ETH Article': 'border-l-success',
                  };
                  const badgeColor: Record<SourceUrlType, string> = {
                    'Competitor Article': 'bg-destructive/10 text-destructive',
                    'Issuer Page': 'bg-accent/10 text-accent',
                    'Data Source': 'bg-[hsl(258,90%,66%)]/10 text-[hsl(258,90%,66%)]',
                    'Reference Material': 'bg-muted text-muted-foreground',
                    'Internal ETH Article': 'bg-success/10 text-success',
                  };
                  const urlObj = (() => { try { return new URL(su.url.startsWith('http') ? su.url : `https://${su.url}`); } catch { return null; } })();
                  const displayTitle = urlObj ? sourceUrlTitle(su.url) : 'Untitled';
                  return (
                    <div key={i} className={cn('rounded-lg border bg-card p-3 border-l-4', borderColor[type])}>
                      {su.url.trim() ? (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-foreground truncate">{displayTitle}</p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{su.url}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium', badgeColor[type])}>
                                {type}
                              </span>
                              <Select value={type} onValueChange={v => updateSourceUrl(i, 'type', v)}>
                                <SelectTrigger className="h-5 text-[9px] w-auto border-0 bg-transparent px-1 gap-0.5">
                                  <ChevronDown className="w-2.5 h-2.5" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SOURCE_URL_TYPES.map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <button onClick={() => removeSourceUrl(i)} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input value={su.url} onChange={e => updateSourceUrl(i, 'url', e.target.value)}
                            placeholder="Paste URL..." className="h-8 text-[11px] flex-1" autoFocus />
                          <button onClick={() => removeSourceUrl(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={addSourceUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent/40 text-muted-foreground hover:text-accent transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-[12px] font-medium">Add URL</span>
            </button>
            <p className="text-[9px] text-muted-foreground mt-1.5 italic">
              Paste competitor articles, reference posts, or data sources. The AI research agent will analyze these alongside its own research.
            </p>

            {/* Voice note for URL Drop */}
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1.5"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
              >
                <Mic className="w-3 h-3" />
                {urlDropVoiceNote ? 'Voice note attached' : 'Add voice note'}
              </Button>
              {showVoiceRecorder && !urlDropVoiceNote && (
                <div className="mt-2">
                  <VoiceNoteRecorder
                    contextId="url-drop-temp"
                    context="url-drop"
                    onSave={(note) => {
                      setUrlDropVoiceNote(note);
                      setShowVoiceRecorder(false);
                    }}
                  />
                </div>
              )}
              {urlDropVoiceNote && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  ✓ Voice note recorded ({urlDropVoiceNote.mode === 'typed' ? 'typed' : `${urlDropVoiceNote.duration}s`})
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* ═══ SECTION 6 — ADVANCED OPTIONS ═══ */}
          <section>
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">6</span>
                Advanced Options
                {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-3 space-y-4">
                {/* AI Outline */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-accent" /> AI Article Outline
                    </label>
                    {outline.length === 0 && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={generateOutline}>Generate Outline</Button>
                    )}
                  </div>
                  {outline.length > 0 && (
                    <div className="space-y-1">
                      {outline.map((section, i) => (
                        <Input key={i} value={section} onChange={e => { const u = [...outline]; u[i] = e.target.value; setOutline(u); }} className="text-[11px] h-8" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Date + Assignee + Priority + Entry Point */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Publish Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 text-[11px] justify-start">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {formatDate(targetDate, 'MMM d')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={targetDate} onSelect={d => d && setTargetDate(d)} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Assignee</label>
                    <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger className="h-9 text-[11px]"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {teamMembers.length > 0 ? (
                          teamMembers.map(m => (
                            <SelectItem key={m.id} value={m.name} className="text-[11px]">{m.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="Unassigned">No team members found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Priority</label>
                    <div className="flex gap-1">
                      {(['Low', 'Medium', 'High'] as const).map(p => {
                        const colors: Record<string, string> = {
                          Low: priority === p ? 'bg-success text-white' : 'bg-muted text-muted-foreground',
                          Medium: priority === p ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground',
                          High: priority === p ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground',
                        };
                        return (
                          <button key={p} onClick={() => setPriority(p)} className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors', colors[p])}>
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Entry Point</label>
                    <Select value={entryPoint} onValueChange={v => setEntryPoint(v as EntryPoint)}>
                      <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="RSS">RSS</SelectItem>
                        <SelectItem value="Keyword">Keyword</SelectItem>
                        <SelectItem value="URL Drop">URL Drop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <Separator />

          {/* ═══ SUBMIT ═══ */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {/* CMS-149: Save Draft — park a half-entered form in the New
                  Article column and finish it later (keyword not required). */}
              <Button onClick={handleSaveDraft} disabled={!canSaveDraft || loading} variant="outline"
                className="h-11 px-4 text-[13px] font-semibold gap-1.5 shrink-0"
                title={canSaveDraft ? 'Save everything entered so far — finish later from the New Article column' : 'Enter a title to save a draft'}>
                <Save className="w-4 h-4" /> Save Draft
              </Button>
              <Button onClick={handleSubmit} disabled={!isValid || loading}
                className="flex-1 h-11 bg-accent hover:bg-accent/90 text-accent-foreground text-[13px] font-semibold gap-1.5">
                <Sparkles className="w-4 h-4" /> {loading ? 'Creating...' : 'Start Research'}
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground text-center">
              Save Draft keeps everything entered so far in the New Article column — come back and finish any time.
            </p>
            <p className="text-[9px] text-muted-foreground text-center">
              Research (~2h) → Experience (~waiting) → Writing (~1h) → Review → Publish by {formatDate(targetDate, 'MMM d')}
            </p>
            <button onClick={handleClose} className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
