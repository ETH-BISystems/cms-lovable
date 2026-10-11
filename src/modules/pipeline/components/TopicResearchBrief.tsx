import { useState, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  Database, Newspaper, Users, MessageCircle, Lightbulb, BarChart3, AlertTriangle, GitBranch,
  MessageSquare, CheckCircle2, RefreshCw, Sparkles, ChevronDown, ChevronRight, Check, X, ExternalLink,
  Globe, Star, ListChecks, Mic, KeySquare, BookOpen, FileText, Compass
} from 'lucide-react';
import type { ResearchFinding, SourceUrl } from '../types';
import { sourceUrlDomain, sourceUrlTitle } from '../utils/sourceUrls';
import { buildResearchPlan, includedPrimarySources } from '../utils/researchPlan';

type Confidence = 'verified' | 'likely' | 'needs_verification' | 'disputed';

interface ResearchBriefData {
  id: string;
  articleId: string;
  findings: ResearchFinding[];
  selectedFindings: string[];
  /** Per-finding editor steering notes (findingId → note). */
  findingNotes?: Record<string, string>;
  /** Source URLs Perplexity cited while generating the brief. */
  citations?: string[];
  /** Per-PRIMARY-source steering notes (source URL → note). */
  sourceNotes?: Record<string, string>;
  /** Primary source URLs the editor unchecked (default: all included). */
  excludedSourceUrls?: string[];
  /** Overall "steer the plan" note → global EDITOR DIRECTION line. */
  planNote?: string;
  approvalStatus: 'draft' | 'approved';
  lockedAt: Date | null;
  approvedBy: string | null;
  generatedAt: Date;
  keyword: string;
}

/** Everything the plan statement is derived from (CMS-154) — assembled by the
 * parent tab from the article doc + voice-note / experience hooks. */
export interface ResearchPlanContext {
  primaryKeyword: string;
  secondaryKeywords: string[];
  context?: string;
  angle?: string;
  targetAudience?: string;
  headingStructure?: { h1: string; h2s: string[]; targetWordCount: number } | null;
  voiceNoteCount: number;
  experienceCount: number;
}

interface TopicResearchBriefProps {
  articleId: string;
  researchBrief: ResearchBriefData | null;
  /** The article's Source Material URLs — the PRIMARY sources the draft is
   * written from (CMS-154). Shown above and distinct from the supporting
   * research findings. */
  sourceUrls?: SourceUrl[];
  planContext?: ResearchPlanContext;
  isLoading?: boolean;
  onApproveWriting?: () => void | Promise<void>;
  onRerunResearch?: () => void;
  onUpdateSelections?: (selectedIds: string[]) => void | Promise<void>;
  /** Persists the steering-note map (full-map replace). */
  onUpdateNotes?: (notes: Record<string, string>) => void | Promise<void>;
  /** Persists per-primary-source steering notes (full-map replace). */
  onUpdateSourceNotes?: (notes: Record<string, string>) => void | Promise<void>;
  /** Persists the excluded primary-source list (full-list replace). */
  onUpdateExcludedSources?: (excludedUrls: string[]) => void | Promise<void>;
  /** Persists the overall plan steering note. */
  onUpdatePlanNote?: (note: string) => void | Promise<void>;
  onUnlock?: () => void | Promise<void>;
  userRole?: 'admin' | 'editor' | 'writer' | 'viewer';
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Current Facts': Database,
  'Recent Developments': Newspaper,
  'Competitive Analysis': Users,
  'Expert Opinions': MessageCircle,
  'Unique Angles': Lightbulb,
  'Statistics': BarChart3,
  'Verification Flags': AlertTriangle,
  'Related Topics': GitBranch,
};

const confidenceConfig: Record<Confidence, { color: string; label: string; bgColor: string }> = {
  verified: { color: 'text-green-600', label: 'Verified', bgColor: 'bg-green-500' },
  likely: { color: 'text-yellow-600', label: 'Likely Accurate', bgColor: 'bg-yellow-400' },
  needs_verification: { color: 'text-amber-500', label: 'Needs Verification', bgColor: 'bg-amber-500' },
  disputed: { color: 'text-red-500', label: 'Disputed', bgColor: 'bg-red-500' },
};

/**
 * Parse the source field from a research finding into a structured object.
 * The source field can be:
 * - A plain URL: "https://example.com/article"
 * - A name + URL: "Bureau of Meteorology, https://www.bom.gov.au/climate/..."
 * - A name + URL in parens: "Bureau of Meteorology (https://www.bom.gov.au/...)"
 * - Just a name: "NerdWallet"
 * - "perplexity" (default/fallback)
 */
function parseSource(source?: string): { name: string; url: string | null } | null {
  if (!source || source === 'perplexity') return null;

  // Try to extract a URL from the source string
  const urlRegex = /(https?:\/\/[^\s),]+)/i;
  const urlMatch = source.match(urlRegex);

  if (urlMatch) {
    const url = urlMatch[1].replace(/[.,;]+$/, ''); // trim trailing punctuation
    // Get the name part by removing the URL
    let name = source.replace(urlMatch[0], '').replace(/[,()\s]+$/, '').replace(/^[,()\s]+/, '').trim();
    if (!name) {
      // Use domain as display name
      try {
        name = new URL(url).hostname.replace('www.', '');
      } catch {
        name = url;
      }
    }
    return { name, url };
  }

  // No URL found — just a name
  return { name: source, url: null };
}

/** Favicon for a source URL with a graceful Globe fallback when the icon
 * service can't resolve one. */
function SourceFavicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const domain = sourceUrlDomain(url);
  if (failed || !domain || domain === url) {
    return <Globe className="w-4 h-4 text-muted-foreground shrink-0" />;
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
      alt=""
      className="w-4 h-4 rounded-sm shrink-0"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const USAGE_ICONS: Record<string, React.ElementType> = {
  voiceNotes: Mic,
  keywords: KeySquare,
  experience: BookOpen,
  brief: FileText,
};

export function TopicResearchBrief({
  articleId,
  researchBrief,
  sourceUrls = [],
  planContext,
  isLoading = false,
  onApproveWriting,
  onRerunResearch,
  onUpdateSelections,
  onUpdateNotes,
  onUpdateSourceNotes,
  onUpdateExcludedSources,
  onUpdatePlanNote,
  onUnlock,
  userRole = 'editor',
}: TopicResearchBriefProps) {
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(
    new Set(researchBrief?.selectedFindings || [])
  );
  // Per-finding detail expansion ("deep dive" review) + steering notes.
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(researchBrief?.findingNotes || {});
  // CMS-154: plan-level review state — primary-source selection + notes, and
  // the overall direction note.
  const [excludedSources, setExcludedSources] = useState<Set<string>>(
    new Set(researchBrief?.excludedSourceUrls || [])
  );
  const [sourceNotes, setSourceNotes] = useState<Record<string, string>>(researchBrief?.sourceNotes || {});
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string>(researchBrief?.planNote || '');
  const [contextPreviewOpen, setContextPreviewOpen] = useState(false);
  const [showExperienceWarning, setShowExperienceWarning] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while the user has unsaved local toggles (or a save is in flight).
  // While dirty, inbound Firestore snapshots must NOT overwrite local state —
  // every snapshot rebuilds the selectedFindings array reference, and without
  // this guard any write anywhere in the collection resets in-progress checkboxes.
  const dirtyRef = useRef(false);
  const notesDirtyRef = useRef(false);
  const sourceDirtyRef = useRef(false);
  const selectedRef = useRef(selectedFindings);
  selectedRef.current = selectedFindings;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const excludedRef = useRef(excludedSources);
  excludedRef.current = excludedSources;
  const sourceNotesRef = useRef(sourceNotes);
  sourceNotesRef.current = sourceNotes;
  const planNoteRef = useRef(planNote);
  planNoteRef.current = planNote;

  const isLocked = researchBrief?.approvalStatus === 'approved';
  const canUnlock = userRole === 'admin' || userRole === 'editor';

  // Sync selections from server only when there are no unsaved local changes
  useEffect(() => {
    if (researchBrief?.selectedFindings && !dirtyRef.current) {
      setSelectedFindings(new Set(researchBrief.selectedFindings));
    }
  }, [researchBrief?.selectedFindings]);

  // Sync steering notes from server only when there are no unsaved local edits
  useEffect(() => {
    if (researchBrief?.findingNotes && !notesDirtyRef.current) {
      setNotes(researchBrief.findingNotes);
    }
  }, [researchBrief?.findingNotes]);

  // Sync plan-review state (primary sources, their notes, plan note)
  useEffect(() => {
    if (!sourceDirtyRef.current) {
      setExcludedSources(new Set(researchBrief?.excludedSourceUrls || []));
      setSourceNotes(researchBrief?.sourceNotes || {});
      setPlanNote(researchBrief?.planNote || '');
    }
  }, [researchBrief?.excludedSourceUrls, researchBrief?.sourceNotes, researchBrief?.planNote]);

  // Never fire a stale debounced save after the panel closes
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current);
    };
  }, []);

  // Group findings by category
  const groupedFindings = researchBrief?.findings.reduce((acc, finding) => {
    const category = finding.category || 'Current Facts';
    if (!acc[category]) acc[category] = [];
    acc[category].push(finding);
    return acc;
  }, {} as Record<string, ResearchFinding[]>) || {};

  const totalFindings = researchBrief?.findings.length || 0;
  const selectedCount = selectedFindings.size;
  const primarySources = includedPrimarySources(sourceUrls, Array.from(excludedSources));
  const sourceNotesCount = Object.values(sourceNotes).filter(n => n.trim()).length;

  // The derived plan ("what I plan to present / how I'll use your inputs").
  const plan = planContext
    ? buildResearchPlan({
        primaryKeyword: planContext.primaryKeyword,
        secondaryKeywords: planContext.secondaryKeywords,
        context: planContext.context,
        angle: planContext.angle,
        targetAudience: planContext.targetAudience,
        headingStructure: planContext.headingStructure,
        findings: researchBrief?.findings || [],
        voiceNoteCount: planContext.voiceNoteCount,
        experienceCount: planContext.experienceCount,
      })
    : null;

  // Persist the current selection and report the real outcome — no success
  // toast before the write actually lands.
  const persistSelections = useCallback(async (selections: Set<string>, label: string) => {
    try {
      await onUpdateSelections?.(Array.from(selections));
      dirtyRef.current = false;
      toast.success(label);
    } catch {
      toast.error('Failed to save selections — your changes are kept locally, try again.');
    }
  }, [onUpdateSelections]);

  // Debounced auto-save
  const scheduleAutoSave = useCallback((newSelections: Set<string>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistSelections(newSelections, 'Selections auto-saved');
    }, 2000);
  }, [persistSelections]);

  // Steering notes — same debounced persist pattern as selections.
  const persistNotes = useCallback(async (next: Record<string, string>, label: string) => {
    try {
      await onUpdateNotes?.(next);
      notesDirtyRef.current = false;
      toast.success(label);
    } catch {
      toast.error('Failed to save steering notes — your edits are kept locally, try again.');
    }
  }, [onUpdateNotes]);

  const scheduleNotesSave = useCallback((next: Record<string, string>) => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      notesTimerRef.current = null;
      void persistNotes(next, 'Steering note saved');
    }, 2000);
  }, [persistNotes]);

  const setNote = (findingId: string, value: string) => {
    if (isLocked) return;
    notesDirtyRef.current = true;
    setNotes(prev => {
      const next = { ...prev };
      if (value.trim()) next[findingId] = value;
      else delete next[findingId];
      scheduleNotesSave(next);
      return next;
    });
  };

  const notesCount = Object.values(notes).filter(n => n.trim()).length;

  // ── CMS-154: plan-level persists (primary sources + overall direction) ──
  // Selections, source notes and the plan note share one debounce timer so a
  // burst of plan edits lands as one write.
  const persistPlanState = useCallback(async (label: string) => {
    try {
      await Promise.all([
        onUpdateExcludedSources?.(Array.from(excludedRef.current)),
        onUpdateSourceNotes?.(sourceNotesRef.current),
        onUpdatePlanNote?.(planNoteRef.current),
      ]);
      sourceDirtyRef.current = false;
      toast.success(label);
    } catch {
      toast.error('Failed to save plan changes — your edits are kept locally, try again.');
    }
  }, [onUpdateExcludedSources, onUpdateSourceNotes, onUpdatePlanNote]);

  const schedulePlanSave = useCallback(() => {
    if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current);
    sourceTimerRef.current = setTimeout(() => {
      sourceTimerRef.current = null;
      void persistPlanState('Plan changes auto-saved');
    }, 2000);
  }, [persistPlanState]);

  const toggleSource = (url: string) => {
    if (isLocked) return;
    sourceDirtyRef.current = true;
    setExcludedSources(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      schedulePlanSave();
      return next;
    });
  };

  const setSourceNote = (url: string, value: string) => {
    if (isLocked) return;
    sourceDirtyRef.current = true;
    setSourceNotes(prev => {
      const next = { ...prev };
      if (value.trim()) next[url] = value;
      else delete next[url];
      schedulePlanSave();
      return next;
    });
  };

  const updatePlanNote = (value: string) => {
    if (isLocked) return;
    sourceDirtyRef.current = true;
    setPlanNote(value);
    schedulePlanSave();
  };

  const toggleFinding = (findingId: string) => {
    if (isLocked) return;
    dirtyRef.current = true;
    setSelectedFindings(prev => {
      const next = new Set(prev);
      if (next.has(findingId)) next.delete(findingId);
      else next.add(findingId);
      scheduleAutoSave(next);
      return next;
    });
  };

  const toggleAllInCategory = (category: string) => {
    if (isLocked) return;
    const categoryFindings = groupedFindings[category] || [];
    const allSelected = categoryFindings.every(f => selectedFindings.has(f.id));
    dirtyRef.current = true;
    setSelectedFindings(prev => {
      const next = new Set(prev);
      for (const f of categoryFindings) {
        if (allSelected) next.delete(f.id);
        else next.add(f.id);
      }
      scheduleAutoSave(next);
      return next;
    });
  };

  const handleApproveAndWrite = () => {
    setShowExperienceWarning(true);
  };

  const doApprove = async () => {
    setShowExperienceWarning(false);
    // Flush any pending debounced selection/note saves BEFORE approving —
    // otherwise the writer runs against a stale finding set and steering.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current);
      notesTimerRef.current = null;
    }
    if (sourceTimerRef.current) {
      clearTimeout(sourceTimerRef.current);
      sourceTimerRef.current = null;
    }
    try {
      if (dirtyRef.current) {
        await onUpdateSelections?.(Array.from(selectedRef.current));
        dirtyRef.current = false;
      }
      if (notesDirtyRef.current) {
        await onUpdateNotes?.(notesRef.current);
        notesDirtyRef.current = false;
      }
      if (sourceDirtyRef.current) {
        await Promise.all([
          onUpdateExcludedSources?.(Array.from(excludedRef.current)),
          onUpdateSourceNotes?.(sourceNotesRef.current),
          onUpdatePlanNote?.(planNoteRef.current),
        ]);
        sourceDirtyRef.current = false;
      }
      await onApproveWriting?.();
      toast.success('Research approved — advancing to writing', {
        description: `${selectedRef.current.size} findings locked for the writing stage.`,
      });
    } catch {
      toast.error('Failed to approve research — please try again.');
    }
  };

  const handleUnlock = () => {
    toast('Unlock Research?', {
      description: 'This will return the article to Deep Research stage.',
      action: {
        label: 'Unlock',
        onClick: async () => {
          try {
            await onUnlock?.();
            toast.success('Research unlocked — findings are editable again.');
          } catch {
            toast.error('Failed to unlock research.');
          }
        },
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <RefreshCw className="w-6 h-6 text-accent animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Generating research brief...</p>
      </div>
    );
  }

  // Empty state
  if (!researchBrief || totalFindings === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">No research brief yet</p>
        <Button onClick={onRerunResearch} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Sparkles className="w-4 h-4 mr-2" /> Generate Research Brief
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <p className="text-[13px] font-bold text-card-foreground">Research & Writing Plan</p>
          </div>
          <Badge variant="secondary" className="text-[9px] px-2 py-0.5 font-normal">
            {researchBrief.keyword}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Deep research brief · Powered by Perplexity · {totalFindings} findings · Generated {researchBrief.generatedAt instanceof Date ? researchBrief.generatedAt.toLocaleDateString() : 'recently'}
        </p>
      </div>

      {/* Approved banner */}
      {isLocked && (
        <div className="px-4 py-2.5 bg-success/10 border-b border-success/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            <span className="text-[11px] font-medium text-success">
              Research approved. Findings are locked for writing.
            </span>
          </div>
          {canUnlock && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] border-warning text-warning-foreground hover:bg-warning/10" onClick={handleUnlock}>
              Unlock Research
            </Button>
          )}
        </div>
      )}

      {/* ═══ THE PLAN ═══ — what the writer will do with all of this, stated
          up front (CMS-154): prioritized primary sources, what will be
          presented, how each input is used, and overall direction. */}
      <div className="border-b border-border bg-accent/[0.03]">
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-accent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-card-foreground">The plan</p>
        </div>
        <p className="px-4 pb-2 text-[10px] text-muted-foreground leading-relaxed">
          Here's what I plan to write and what I'm using to write it. Review each element, steer anything with a note, then approve below.
        </p>

        {/* ── PRIMARY SOURCES ── */}
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-accent/30 bg-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-accent" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-card-foreground">Primary sources</p>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 border-0">{primarySources.length}/{sourceUrls.length}</Badge>
              </div>
              <p className="text-[9px] text-muted-foreground">written from these first</p>
            </div>
            {sourceUrls.length === 0 ? (
              <p className="px-3 py-2.5 text-[10px] text-muted-foreground italic">
                No primary source URLs on this article — the draft leans on the supporting research alone. Add source URLs in the Overview tab's Source Material section to anchor it.
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {sourceUrls.map((source) => {
                  const included = !excludedSources.has(source.url);
                  const domain = sourceUrlDomain(source.url);
                  const title = sourceUrlTitle(source.url);
                  const note = (sourceNotes[source.url] ?? '').trim();
                  const expanded = expandedSource === source.url;
                  return (
                    <div key={source.url} className={`px-3 py-2 transition-colors ${included ? '' : 'opacity-55'}`}>
                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          checked={included}
                          onCheckedChange={() => toggleSource(source.url)}
                          disabled={isLocked}
                          className="mt-0.5 shrink-0"
                        />
                        <SourceFavicon url={source.url} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium text-card-foreground hover:text-accent transition-colors truncate max-w-[320px]"
                              title={source.url}
                            >
                              {title}
                            </a>
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-normal">{source.type}</Badge>
                            {note && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(258,90%,66%)]/10 text-[hsl(258,90%,66%)]">
                                <MessageSquare className="w-2.5 h-2.5" /> steering note
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-muted-foreground truncate">{domain}</span>
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent shrink-0" title="Open source">
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <button
                              onClick={() => setExpandedSource(expanded ? null : source.url)}
                              className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-card-foreground transition-colors shrink-0"
                            >
                              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              {expanded ? 'Hide' : 'Review & steer'}
                            </button>
                          </div>
                          {expanded && (
                            <div className="mt-2 rounded-md border border-border/70 bg-muted/30 p-2.5 space-y-2">
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {included
                                  ? <>Included — this URL is sent to the writing agent as a PRIMARY SOURCE the draft is written from{note ? ', with your steering note attached' : ''}. Uncheck to drop it.</>
                                  : <>Excluded — the writing agent won't treat this as a primary source. Check the box to bring it back.</>}
                              </p>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Steering note <span className="normal-case font-normal">(optional)</span></p>
                                {isLocked ? (
                                  note ? (
                                    <p className="text-[11px] text-card-foreground whitespace-pre-wrap bg-card rounded border border-border/60 px-2 py-1.5">{note}</p>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground italic">No steering note.</p>
                                  )
                                ) : (
                                  <textarea
                                    value={sourceNotes[source.url] ?? ''}
                                    onChange={e => setSourceNote(source.url, e.target.value)}
                                    rows={2}
                                    maxLength={1000}
                                    placeholder={'Steer this source — e.g. "mirror their structure but go deeper on fees", "only use the bonus table from this one", or "this one is outdated — don\'t take rates from it"'}
                                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-[11px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/30"
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── WHAT I PLAN TO PRESENT ── */}
        {plan && (
          <div className="px-4 pb-3">
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ListChecks className="w-3 h-3 text-accent" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-card-foreground">What I plan to present</p>
              </div>
              <ul className="space-y-1">
                {plan.presentItems.map((item, i) => (
                  <li key={i} className="text-[11px] text-card-foreground/90 leading-relaxed flex gap-1.5">
                    <span className="text-accent shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── HOW I'LL USE YOUR INPUTS ── */}
        {plan && (
          <div className="px-4 pb-3">
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageCircle className="w-3 h-3 text-accent" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-card-foreground">How I'll use your inputs</p>
              </div>
              <div className="space-y-1.5">
                {plan.inputUsage.map((usage) => {
                  const UsageIcon = USAGE_ICONS[usage.key] || FileText;
                  return (
                    <div key={usage.key} className="flex items-start gap-2">
                      <UsageIcon className={`w-3 h-3 mt-0.5 shrink-0 ${usage.active ? 'text-accent' : 'text-muted-foreground/50'}`} />
                      <p className={`text-[11px] leading-relaxed ${usage.active ? 'text-card-foreground/90' : 'text-muted-foreground'}`}>
                        <span className="font-medium">{usage.label}</span>
                        {' — '}
                        {usage.detail}
                        {!usage.active && usage.key === 'voiceNotes' && (
                          <span className="text-warning"> Record one in the Overview tab to lift E-E-A-T.</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── OVERALL DIRECTION ── */}
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-card-foreground mb-1">
              Overall direction <span className="normal-case font-normal text-muted-foreground">(optional — steers the whole draft)</span>
            </p>
            {isLocked ? (
              planNote.trim() ? (
                <p className="text-[11px] text-card-foreground whitespace-pre-wrap bg-muted/30 rounded border border-border/60 px-2 py-1.5">{planNote}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">No overall direction given.</p>
              )
            ) : (
              <>
                <textarea
                  value={planNote}
                  onChange={e => updatePlanNote(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder={'Steer the whole article — e.g. "I like this approach, but lead with the 70% bonus angle and keep the tone skeptical of the annual fee", or "write for beginners — avoid jargon"'}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-[11px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Sent verbatim to the writing agent as the top-level direction for the draft. Auto-saves.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selection progress bar */}
      <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-[11px] font-medium text-card-foreground whitespace-nowrap">
            {selectedCount} of {totalFindings} findings selected
          </span>
          <div className="flex-1 max-w-[120px] h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${totalFindings > 0 ? (selectedCount / totalFindings) * 100 : 0}%` }} />
          </div>
          {notesCount + sourceNotesCount > 0 && (
            <span className="text-[10px] text-[hsl(258,90%,66%)] font-medium whitespace-nowrap flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {notesCount + sourceNotesCount} steering note{notesCount + sourceNotesCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <Button size="sm" className="h-7 text-[10px] bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => {
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
          }
          void persistSelections(selectedFindings, 'Selections saved');
          if (sourceDirtyRef.current) {
            if (sourceTimerRef.current) {
              clearTimeout(sourceTimerRef.current);
              sourceTimerRef.current = null;
            }
            void persistPlanState('Plan changes saved');
          }
        }}>
          Save Selections
        </Button>
      </div>

      {/* ═══ SUPPORTING RESEARCH ═══ — the brief's findings, clearly framed
          as backing material for the primary sources above (CMS-154). */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-accent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-card-foreground">Supporting research</p>
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 border-0">{totalFindings} findings</Badge>
        </div>
        <p className="text-[9px] text-muted-foreground">backs up the primary sources</p>
      </div>

      {/* Deep-research provenance — the URLs Perplexity cited while building
          the brief, distinct from the PRIMARY sources above. */}
      {(researchBrief.citations?.length ?? 0) > 0 && (
        <div className="px-4 pb-2">
          <details className="group">
            <summary className="text-[10px] text-muted-foreground hover:text-card-foreground cursor-pointer transition-colors list-none flex items-center gap-1">
              <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
              {researchBrief.citations!.length} source{researchBrief.citations!.length === 1 ? '' : 's'} cited by the deep research
            </summary>
            <div className="mt-1.5 ml-4 space-y-1 max-h-40 overflow-y-auto">
              {researchBrief.citations!.map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-accent hover:underline truncate"
                >
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{sourceUrlDomain(url)}</span>
                  <span className="text-muted-foreground truncate hidden sm:inline">{url}</span>
                </a>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Category accordions */}
      <div className="divide-y divide-border">
        {Object.entries(groupedFindings).map(([category, findings]) => {
          const catSelected = findings.filter(f => selectedFindings.has(f.id)).length;
          const allSelected = findings.every(f => selectedFindings.has(f.id));
          const Icon = CATEGORY_ICONS[category] || Database;

          // Group findings by source within this category.
          // Strategy: extract a URL from source/text, merge findings with same URL.
          // Findings that are just "verified" or just a bare URL are metadata noise — merge into the previous real finding.
          interface ConsolidatedFinding {
            id: string; // primary finding id
            ids: string[]; // all finding IDs in this group (for selection)
            text: string;
            confidence: string;
            sourceInfo: { name: string; url: string | null } | null;
          }

          const consolidated: ConsolidatedFinding[] = [];

          for (const finding of findings) {
            let displayText = finding.text || '';
            // Clean JSON artifacts
            if (displayText.startsWith('"text"') || displayText.startsWith('"confidence"') || displayText.startsWith('"source"')) {
              const match = displayText.match(/"(?:text|confidence|source)":\s*"([^"]+)"/);
              displayText = match ? match[1] : displayText.replace(/^"[^"]*":\s*"?|"?,?\s*$/g, '');
            }

            const trimmed = displayText.trim();

            // Skip junk entries: "verified", empty, or entries that are JUST a source/URL
            const isJunk = !trimmed
              || trimmed === 'verified'
              || trimmed === 'likely'
              || trimmed === 'needs_verification'
              || trimmed === 'disputed'
              || trimmed.length < 5;

            // Is this entry just a URL or source reference? (e.g. "GOV.UK, https://...")
            const urlRegex = /^([\w\s.]+,?\s*)?(https?:\/\/[^\s]+)\s*$/i;
            const isJustSource = urlRegex.test(trimmed) && trimmed.length < 150;

            if (isJunk || isJustSource) {
              // Merge into previous consolidated finding if one exists
              if (consolidated.length > 0) {
                const prev = consolidated[consolidated.length - 1];
                prev.ids.push(finding.id);
                // If this junk entry has a URL, use it as the source for the group
                if (isJustSource && !prev.sourceInfo?.url) {
                  prev.sourceInfo = parseSource(trimmed);
                }
                // Update confidence to the most severe
                if (finding.confidence === 'needs_verification' || finding.confidence === 'disputed') {
                  prev.confidence = finding.confidence;
                }
              } else {
                // No previous finding — try to extract something useful
                if (isJustSource) {
                  consolidated.push({
                    id: finding.id,
                    ids: [finding.id],
                    text: '',
                    confidence: finding.confidence,
                    sourceInfo: parseSource(trimmed),
                  });
                }
              }
              continue;
            }

            // Real finding — extract source from the finding's source field OR from text
            let sourceInfo = parseSource(finding.source);
            if (!sourceInfo?.url) {
              // Try extracting a URL from the text itself
              const urlInText = trimmed.match(/(https?:\/\/[^\s,)]+)/);
              if (urlInText) {
                sourceInfo = parseSource(urlInText[1]);
              }
            }

            consolidated.push({
              id: finding.id,
              ids: [finding.id],
              text: displayText,
              confidence: finding.confidence,
              sourceInfo,
            });
          }

          // Filter out empty-text entries that have no URL either
          const validFindings = consolidated.filter(c => c.text.length > 0 || c.sourceInfo?.url);

          return (
            <Accordion key={category} type="single" collapsible defaultValue={category}>
              <AccordionItem value={category} className="border-0">
                <div className="flex items-center justify-between px-4 py-0">
                  <AccordionTrigger className="flex-1 py-2.5 hover:no-underline gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[12px] font-semibold text-card-foreground">{category}</span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 border-0">{catSelected}/{findings.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  {!isLocked && (
                    <button
                      className="text-[10px] text-accent hover:underline shrink-0 ml-2"
                      onClick={(e) => { e.stopPropagation(); toggleAllInCategory(category); }}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                <AccordionContent className="pb-0">
                  <div className="space-y-2 py-2">
                    {validFindings.map((item) => {
                      const allIds = item.ids;
                      const allSelected2 = allIds.every(id => selectedFindings.has(id));
                      const conf = confidenceConfig[item.confidence as Confidence] || confidenceConfig.likely;

                      const toggleItem = () => {
                        if (isLocked) return;
                        setSelectedFindings(prev => {
                          const next = new Set(prev);
                          if (allSelected2) {
                            for (const id of allIds) next.delete(id);
                          } else {
                            for (const id of allIds) next.add(id);
                          }
                          scheduleAutoSave(next);
                          return next;
                        });
                      };

                      return (
                        <div
                          key={item.id}
                          className={`mx-2 rounded-lg border transition-all ${
                            allSelected2
                              ? 'border-accent/40 bg-accent/5 shadow-sm'
                              : 'border-border/60 hover:border-border'
                          }`}
                        >
                          <div className="flex items-start gap-3 px-3 py-3">
                            <Checkbox
                              checked={allSelected2}
                              onCheckedChange={toggleItem}
                              disabled={isLocked}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <p className="text-[12px] text-card-foreground leading-relaxed">{item.text}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Confidence pill */}
                                <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                                  item.confidence === 'verified' ? 'bg-green-100 text-green-700' :
                                  item.confidence === 'likely' ? 'bg-yellow-100 text-yellow-700' :
                                  item.confidence === 'needs_verification' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {item.confidence === 'verified' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {item.confidence === 'likely' && <span className="w-2 h-2 rounded-full bg-yellow-400" />}
                                  {item.confidence === 'needs_verification' && <AlertTriangle className="w-2.5 h-2.5" />}
                                  {item.confidence === 'disputed' && <X className="w-2.5 h-2.5" />}
                                  {conf.label}
                                </span>
                                {/* Source link */}
                                {item.sourceInfo?.url && (
                                  <a
                                    href={item.sourceInfo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 font-medium transition-colors"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    {item.sourceInfo.name}
                                  </a>
                                )}
                                {/* Steering-note indicator — visible at a glance without expanding */}
                                {(notes[item.id] ?? '').trim() && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(258,90%,66%)]/10 text-[hsl(258,90%,66%)]">
                                    <MessageSquare className="w-2.5 h-2.5" /> steering note
                                  </span>
                                )}
                                {/* Deep-dive expand: source review + how it's used + steering */}
                                <button
                                  onClick={() => setExpandedFinding(expandedFinding === item.id ? null : item.id)}
                                  className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-card-foreground transition-colors"
                                >
                                  {expandedFinding === item.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  {expandedFinding === item.id ? 'Hide details' : 'Review & steer'}
                                </button>
                              </div>

                              {/* ── Deep-dive panel: source review, how it's used, steering note ── */}
                              {expandedFinding === item.id && (
                                <div className="mt-2 rounded-md border border-border/70 bg-muted/30 p-3 space-y-3">
                                  {/* Source review */}
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Source</p>
                                    {item.sourceInfo?.url ? (
                                      <div className="space-y-0.5">
                                        <a href={item.sourceInfo.url} target="_blank" rel="noopener noreferrer"
                                          className="text-[11px] text-accent hover:underline break-all flex items-center gap-1">
                                          {item.sourceInfo.name} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        </a>
                                        <p className="text-[10px] text-muted-foreground break-all">{item.sourceInfo.url}</p>
                                      </div>
                                    ) : item.sourceInfo?.name ? (
                                      <p className="text-[11px] text-card-foreground">{item.sourceInfo.name} <span className="text-muted-foreground">(no link captured)</span></p>
                                    ) : (
                                      <p className="text-[11px] text-muted-foreground italic">No source link was captured for this finding — treat it as unverified and steer it below (or unselect it).</p>
                                    )}
                                  </div>

                                  {/* How this is actually used by the writing agent */}
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">How this is used</p>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                      {allSelected2
                                        ? <>Selected — the writing agent receives this finding verbatim as a fact for the draft{notes[item.id]?.trim() ? ', and your steering note below is sent with it as EDITOR STEERING' : ''}. Uncheck it to exclude it entirely.</>
                                        : <>Not selected — this finding is excluded from the draft. Check the box to include it.</>}
                                    </p>
                                  </div>

                                  {/* Steering note */}
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Steering note <span className="normal-case font-normal">(optional)</span></p>
                                    {isLocked ? (
                                      (notes[item.id] ?? '').trim() ? (
                                        <p className="text-[11px] text-card-foreground whitespace-pre-wrap bg-card rounded border border-border/60 px-2 py-1.5">{notes[item.id]}</p>
                                      ) : (
                                        <p className="text-[10px] text-muted-foreground italic">No steering note.</p>
                                      )
                                    ) : (
                                      <>
                                        <textarea
                                          value={notes[item.id] ?? ''}
                                          onChange={e => setNote(item.id, e.target.value)}
                                          rows={2}
                                          maxLength={1000}
                                          placeholder={'Steer this finding — e.g. "use this, but frame it around the 70% bonus", "verify the date before using", or "don\'t mention the shutdown as confirmed"'}
                                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-[11px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/30"
                                        />
                                        <p className="text-[9px] text-muted-foreground mt-0.5">
                                          Sent verbatim to the writing agent with this finding (EDITOR STEERING) — it steers direction, it is not treated as fact. Auto-saves.
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 bg-muted/80 backdrop-blur-sm border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium text-card-foreground">{selectedCount} findings selected</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={onRerunResearch} disabled={isLocked}>
              <RefreshCw className="w-3 h-3" /> Re-run Research
            </Button>
            {!isLocked && (
              <Button size="sm" className="h-7 text-[10px] bg-accent text-accent-foreground hover:bg-accent/90 gap-1" onClick={handleApproveAndWrite}>
                <Sparkles className="w-3 h-3" /> Approve & Start Writing
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Writing Agent Context Preview */}
      <div className="border-t border-border">
        <button
          className="w-full px-4 py-2.5 flex items-center gap-2 text-[11px] font-medium text-muted-foreground hover:text-card-foreground transition-colors"
          onClick={() => setContextPreviewOpen(!contextPreviewOpen)}
        >
          {contextPreviewOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Writing Agent Context Preview
        </button>
        {contextPreviewOpen && (
          <div className="px-4 pb-4 space-y-2">
            {[
              { label: 'System Prompt', detail: 'ETH brand voice and article writing instructions', ok: true },
              { label: 'SEO Brief', detail: `Target keyword: ${researchBrief.keyword}`, ok: true },
              { label: 'Primary Sources', detail: primarySources.length > 0 ? `${primarySources.length} source URL${primarySources.length === 1 ? '' : 's'} the draft is written from` : 'None — draft leans on supporting research', ok: primarySources.length > 0 },
              { label: 'Selected Research Findings', detail: `${selectedCount} findings selected`, ok: selectedCount > 0 },
              { label: 'Editor Steering', detail: notesCount + sourceNotesCount > 0 ? `${notesCount + sourceNotesCount} note${notesCount + sourceNotesCount === 1 ? '' : 's'} sent verbatim as EDITOR STEERING` : 'No steering notes — research goes as-is', ok: true },
              { label: 'Overall Direction', detail: planNote.trim() ? 'Your plan-level note leads the prompt as EDITOR DIRECTION' : 'No overall direction given', ok: true },
              { label: 'Personal Experience', detail: 'Check voice notes in Overview tab', ok: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                {item.ok ? <Check className="w-3 h-3 text-green-600 shrink-0" /> : <span className="w-3 h-3 text-muted-foreground shrink-0">—</span>}
                <span className="font-medium text-card-foreground">{item.label}</span>
                <span className="text-muted-foreground">— {item.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Experience Warning Modal */}
      {showExperienceWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowExperienceWarning(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-[420px] max-w-[90vw] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="text-[15px] font-bold text-foreground">Approve & Start Writing?</h3>
            </div>
            <p className="text-[13px] text-muted-foreground mb-4">
              This will lock the research brief and advance to the writing stage. Consider adding voice notes with personal experience before proceeding — articles with experience rank higher.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowExperienceWarning(false)}>Cancel</Button>
              <Button onClick={doApprove} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Approve & Write
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
