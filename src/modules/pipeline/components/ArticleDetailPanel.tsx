import { useState, useRef, useEffect, useCallback } from 'react';
import { callUpdateArticleStage, callRefreshArticleSections, callGenerateTopicResearch } from '../services/articleService';
import {
  X, Check, Minus, Play, Pause, Mic, ChevronDown, ChevronUp, ExternalLink,
  Pencil, Shield, Link as LinkIcon, ImageIcon, Plus, RotateCw, Clock,
  CheckCircle2, AlertTriangle, FileText, Eye, Globe, Camera, Upload,
  Smartphone, RefreshCw, Rocket, Sparkles, Library, Loader2, Frame, Share2, Video, Trash2,
  ImagePlus, ArrowRightLeft, Maximize2, Minimize2, Save, Undo2, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QualityScoreRing, TimeAgo, PriorityPill } from './shared/KanbanCard';
import { VoiceNoteRecorder } from '@/components/shared/VoiceNoteRecorder';
import { TopicResearchBrief } from './TopicResearchBrief';
import { ContentEditToolbar } from './ContentEditToolbar';
import { ContentFormatBar } from './ContentFormatBar';
import { AssetLibraryPickerModal } from './AssetLibraryPickerModal';
import { IframeInsertModal, iframeService, extractInstanceIdFromSrc } from '@/modules/iframes';
import { TpTableInsertModal } from '@/modules/transfer-partners';
import {
  AssetPickerDialog,
  GenerateAIImageDialog,
  UploadDialog,
  assetService,
  checkReelPortrait,
  REEL_PORTRAIT,
} from '@/modules/assets';
import type { AssetDocument } from '@/modules/assets';
import { EmbedSocialPostDialog } from './EmbedSocialPostDialog';
import { SourceImagesSection } from './SourceImagesSection';
import { TemplateLibraryModal } from './TemplateLibraryModal';
import { getPageTemplate, buildTemplateSkeletonHtml, type PageTemplate } from './pageTemplates';
import { useBlockDragAndDrop, BLOCK_DRAG_HANDLE_ATTR } from '../hooks/useBlockDragAndDrop';
import { LayoutTemplate } from 'lucide-react';
import { AttachExperienceDialog } from './AttachExperienceDialog';
import { useExperiences, callDetachFromArticle, buildSocialEmbedHtml, type ExperienceItem } from '@/modules/experience';
import { AddVideoDialog } from './AddVideoDialog';
import { AddImageDialog } from './AddImageDialog';
import { StageActionPanel } from './StageActionPanel';
import { RefreshArticleModal } from './RefreshArticleModal';
import { RefreshDiffView } from './RefreshDiffView';
import { VersionHistoryMenu } from './VersionHistoryMenu';
import { findPreviousRestorableVersion } from '../utils/versionHistory';
import { InlineDatePicker, StatusCycler, InlineTitleEditor, CommentThread } from './TaskInlineEditors';
import { useVoiceNotes } from '../hooks/useVoiceNotes';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useArticles } from '../hooks/useArticles';
import { uploadVoiceNote, callSaveVoiceNote } from '../services/voiceNoteService';
import { useArticleMutations } from '../hooks/useArticleMutations';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { toast } from 'sonner';
import type { PipelineVoiceNote } from '../hooks/useVoiceNotes';
import type { VoiceNoteData } from '@/components/shared/VoiceNoteRecorder';
import type { PipelineArticle, ArticleStatus, ArticleStage, ArticleTask, ArticleVersion, SourceUrl, PanelTab } from '../types';
import { HUMAN_GATE_STAGES, STAGE_ORDER, PANEL_TABS, getStageDefaultTab, getStageTabs } from '../types';
import {
  SOURCE_URL_TYPES,
  asSourceUrlType,
  detectUrlType,
  normalizeSourceUrls,
  sourceUrlTitle,
  MAX_SOURCE_URLS,
  type SourceUrlType,
} from '../utils/sourceUrls';

// PANEL_TABS / PanelTab come from ../types (CMS-153) — the stage-scoped tab
// sets (STAGE_TABS) and the stepper share that single definition.

const ALL_STATUSES: ArticleStatus[] = ['Discovered', 'Researching', 'Writing', 'In Review', 'Approved', 'Published'];
// Note: ALL_STATUSES kept for legacy compat; new pipeline uses article.stage

// === Source Material Section (Overview tab — CMS-147) ===
// The same Section-5 source-URL list the New Article modal collects at
// creation, editable afterwards: add/remove/re-type reference URLs and SAVE
// them to the article. Deep research (generateTopicResearch) analyzes these
// alongside its own research — previously only settable at creation time, so
// keyword/RSS-created articles could never gain reference URLs.
function SourceMaterialSection({ article }: { article: PipelineArticle }) {
  const { updateArticle, loading } = useArticleMutations();
  const [urls, setUrls] = useState<SourceUrl[]>(() =>
    (article.sourceUrls ?? []).map(su => ({ url: su.url, type: asSourceUrlType(su.type) }))
  );
  const [saving, setSaving] = useState(false);

  // Re-seed local state when a different article opens in the panel
  useEffect(() => {
    setUrls((article.sourceUrls ?? []).map(su => ({ url: su.url, type: asSourceUrlType(su.type) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  const persisted = normalizeSourceUrls(article.sourceUrls ?? []);
  const normalizedDraft = normalizeSourceUrls(urls);
  const dirty = JSON.stringify(normalizedDraft) !== JSON.stringify(persisted);
  // Unsaved blank rows should not block Save (they're dropped by normalize).
  const hasBlankRow = urls.some(su => !su.url.trim());

  const handleSave = () => {
    setSaving(true);
    updateArticle(article.id, { sourceUrls: normalizedDraft })
      .then(() => {
        setUrls(normalizedDraft); // drop blank rows from the editor too
        toast.success('Source material saved — the research agent will analyze these alongside its own research.');
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const updateUrl = (index: number, field: 'url' | 'type', value: string) => {
    setUrls(prev => prev.map((s, i) => {
      if (i !== index) return s;
      if (field === 'url') return { ...s, url: value, type: value.trim() ? detectUrlType(value) : s.type };
      return { ...s, type: asSourceUrlType(value) };
    }));
  };

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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground flex items-center gap-1.5">
          <LinkIcon className="w-3 h-3" /> Source Material
          {persisted.length > 0 && <span className="text-[10px] normal-case">({persisted.length})</span>}
        </p>
        {dirty && (
          <Button size="sm" className="h-6 text-[10px]" onClick={handleSave} disabled={saving || !!loading.updateArticle}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Sources'}
          </Button>
        )}
      </div>

      {urls.length > 0 && (
        <div className="space-y-2 mb-2">
          {urls.map((su, i) => {
            const type = asSourceUrlType(su.type);
            return (
              <div key={i} className={cn('rounded-lg border bg-card p-2.5 border-l-4', borderColor[type])}>
                {su.url.trim() ? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <a href={su.url.startsWith('http') ? su.url : `https://${su.url}`} target="_blank" rel="noopener noreferrer"
                        className="text-[12px] font-semibold text-foreground hover:text-accent truncate flex items-center gap-1">
                        <span className="truncate">{sourceUrlTitle(su.url)}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{su.url}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium', badgeColor[type])}>
                          {type}
                        </span>
                        <Select value={type} onValueChange={v => updateUrl(i, 'type', v)}>
                          <SelectTrigger className="h-5 text-[9px] w-auto border-0 bg-transparent px-1 gap-0.5">
                            <ChevronDown className="w-2.5 h-2.5" />
                          </SelectTrigger>
                          <SelectContent>
                            {SOURCE_URL_TYPES.map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <button onClick={() => setUrls(prev => prev.filter((_, x) => x !== i))} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input value={su.url} onChange={e => updateUrl(i, 'url', e.target.value)}
                      placeholder="Paste URL..." className="h-8 text-[11px] flex-1" autoFocus />
                    <button onClick={() => setUrls(prev => prev.filter((_, x) => x !== i))} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {urls.length < MAX_SOURCE_URLS && (
        <button onClick={() => setUrls(prev => [...prev, { url: '', type: 'Reference Material' }])}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-border hover:border-accent/40 text-muted-foreground hover:text-accent transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-[12px] font-medium">Add URL</span>
        </button>
      )}
      <p className="text-[9px] text-muted-foreground mt-1.5 italic">
        Paste competitor articles, reference posts, or data sources. The AI research agent will analyze these alongside its own research.
        {dirty && hasBlankRow && ' Blank rows are dropped on save.'}
      </p>
    </div>
  );
}

// === Article Brief Section (Overview tab — CMS-54) ===
// Context / Angle / Audience are plain text fields (voice tools like Wispr
// Flow type into them like any input). Stored top-level on the article and
// consumed by generateTopicResearch as prompt context.
function ArticleBriefSection({ article }: { article: PipelineArticle }) {
  const { updateArticle, loading } = useArticleMutations();
  const [context, setContext] = useState(article.context || '');
  const [angle, setAngle] = useState(article.angle || '');
  const [audience, setAudience] = useState(article.targetAudience || '');

  // Re-seed local state when a different article opens in the panel
  useEffect(() => {
    setContext(article.context || '');
    setAngle(article.angle || '');
    setAudience(article.targetAudience || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  const dirty =
    context !== (article.context || '') ||
    angle !== (article.angle || '') ||
    audience !== (article.targetAudience || '');

  const handleSave = () => {
    updateArticle(article.id, { context, angle, targetAudience: audience })
      .then(() => toast.success('Article brief saved'))
      .catch(() => {});
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Article Brief</p>
        {dirty && (
          <Button size="sm" className="h-6 text-[10px]" onClick={handleSave} disabled={!!loading.updateArticle}>
            {loading.updateArticle ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Brief'}
          </Button>
        )}
      </div>
      <div>
        <label className="text-[10px] font-medium text-muted-foreground block mb-1">Article Context</label>
        <Textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="What is this article about? Background, scope, key points to cover..."
          className="min-h-[64px] text-[12px] bg-background"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground block mb-1">Angle</label>
          <Input
            value={angle}
            onChange={e => setAngle(e.target.value)}
            placeholder="e.g. First-hand review, contrarian take..."
            className="h-8 text-[12px] bg-background"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground block mb-1">Target Audience</label>
          <Input
            value={audience}
            onChange={e => setAudience(e.target.value)}
            placeholder="e.g. Beginner points collectors..."
            className="h-8 text-[12px] bg-background"
          />
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground">Used as context for keyword discovery, deep research, and AI drafting.</p>
    </div>
  );
}

// === Target Keyword empty-state editor (Overview tab — CMS-149) ===
// Drafts saved from a half-filled New Article form may have no keyword.
// Set it here later (or Discover Keywords will seed from the title).
function TargetKeywordEditor({ article }: { article: PipelineArticle }) {
  const { updateArticle } = useArticleMutations();
  const [kw, setKw] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    const next = kw.trim();
    if (!next) return;
    setSaving(true);
    updateArticle(article.id, { targetKeyword: next })
      .then(() => toast.success('Target keyword saved'))
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Target Keyword</p>
      <div className="flex gap-2">
        <Input
          value={kw}
          onChange={e => setKw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="e.g. japan airlines first class"
          className="h-8 text-[12px] bg-background"
        />
        <Button size="sm" className="h-8 text-[11px] shrink-0" disabled={!kw.trim() || saving} onClick={handleSave}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Set keyword'}
        </Button>
      </div>
      <p className="text-[9px] text-muted-foreground">
        This article was saved as a draft without a keyword — set it now, or keyword discovery will seed from the title.
      </p>
    </div>
  );
}


function OverviewTab({ article, onStatusChange, isRefreshContext }: { article: PipelineArticle; onStatusChange: (id: string, status: ArticleStatus) => void; isRefreshContext?: boolean }) {
  const [priority, setPriority] = useState(article.priority);
  const [assignee, setAssignee] = useState(article.assignee.name);
  const [expandCompetitors, setExpandCompetitors] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showEditorialNote, setShowEditorialNote] = useState(false);
  const [showAttachExperience, setShowAttachExperience] = useState(false);
  const [detachingExperienceId, setDetachingExperienceId] = useState<string | null>(null);
  const [editorialNoteText, setEditorialNoteText] = useState(article.editorialNotes || '');
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());
  const [outlineChecks, setOutlineChecks] = useState<Set<number>>(new Set());
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  const { voiceNotes, loading: voiceNotesLoading } = useVoiceNotes(article.id);
  // Experience Library items attached to this article via "Attach from
  // Library" — shown alongside the article's own voice notes below.
  const { allItems: libraryItems } = useExperiences();
  const attachedExperiences = libraryItems.filter(i =>
    i.attachedArticles.some(a => a.id === article.id)
  );
  const { members: teamMembers, loading: teamLoading } = useTeamMembers();
  const { userProfile } = useAuth();
  const { publishToWebflow, unpublishFromWebflow, updateArticle, generateSeoResearch, loading: mutationLoading } = useArticleMutations();

  const handlePublish = async () => {
    try {
      const result = await publishToWebflow(article.id);
      // CMS-113: thumbnail upload failures used to be silent — the publish
      // looked fully successful while the featured image never transferred.
      if (result.featuredImageWarning) {
        toast.warning('Published — but the thumbnail did not transfer', {
          description: result.featuredImageWarning,
          duration: 12000,
        });
      } else {
        toast.success('Published to Webflow', { description: result.publishedUrl });
      }
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishFromWebflow(article.id);
      toast.success('Article unpublished');
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  const handlePriorityChange = (value: PipelineArticle['priority']) => {
    setPriority(value);
    updateArticle(article.id, { priority: value }).catch(() => setPriority(article.priority));
  };

  const handleAssigneeChange = (name: string) => {
    setAssignee(name);
    const member = teamMembers.find(m => m.name === name);
    updateArticle(article.id, {
      assignee: { name, avatar: member?.avatar || name.split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2) },
    }).catch(() => setAssignee(article.assignee.name));
  };

  const handleDetachExperience = async (item: ExperienceItem) => {
    setDetachingExperienceId(item.id);
    try {
      await callDetachFromArticle(item.id, article.id);
      toast.success('Experience detached');
    } catch (err) {
      toast.error('Failed to detach experience', { description: (err as Error).message });
    } finally {
      setDetachingExperienceId(null);
    }
  };

  const toggleTranscript = (noteId: string) => {
    setExpandedTranscripts(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const handleVoiceNoteSave = async (note: VoiceNoteData) => {
    try {
      let audioStoragePath: string | null = null;
      if (note.mode === 'recorded' && note.audioBlob) {
        audioStoragePath = await uploadVoiceNote(article.id, note.audioBlob, userProfile?.uid || 'unknown');
      }
      await callSaveVoiceNote({
        articleId: article.id,
        audioStoragePath,
        transcript: note.transcript,
        duration: note.duration,
        mode: note.mode,
        contributor: userProfile?.displayName || userProfile?.email || 'Unknown',
      });
      toast.success(note.mode === 'recorded' ? 'Voice note saved — transcribing…' : 'Note saved');
      setShowRecorder(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save voice note';
      toast.error('Voice note failed', { description: msg });
      throw err;
    }
  };

  const rm = article.refreshMeta;
  const ri = article.refreshInfo;

  // Build timeline from real article dates
  const timeline: Array<{ label: string; time: Date }> = [];
  if (article.createdAt) timeline.push({ label: 'Discovered', time: article.createdAt });
  if (article.stageEnteredAt && article.status !== 'Discovered') {
    // For current stage, use stageEnteredAt
    timeline.push({ label: article.status, time: article.stageEnteredAt });
  }

  // SEO research metrics (from real data if available)
  const seo = article.seoResearch;

  return (
    <div className="space-y-6">
      {/* Refresh Context Banner */}
      {rm && ri && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-warning-foreground" />
            <span className="text-sm font-semibold text-warning-foreground">Refresh Context</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning/15 text-warning-foreground">{ri.reason}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Flagged by:</span> <span className="font-medium">{rm.flaggedBy}</span></div>
            <div><span className="text-muted-foreground">Flagged:</span> <span className="font-medium"><TimeAgo date={rm.flaggedDate} /></span></div>
            <div><span className="text-muted-foreground">Published:</span> <span className="font-medium"><TimeAgo date={rm.originalPublishDate} /></span></div>
            <div><span className="text-muted-foreground">Last refreshed:</span> <span className="font-medium">{rm.lastRefreshed ? <TimeAgo date={rm.lastRefreshed} /> : 'Never'}</span></div>
          </div>
          {ri.notes && ri.notes.length > 0 && (
            <ul className="space-y-0.5">
              {ri.notes.map((note, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-accent">•</span>{note}</li>)}
            </ul>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Position</p>
              <p className="text-sm font-bold">#{rm.currentPosition || '—'}</p>
              {rm.targetPosition && <p className="text-[9px] text-accent">Target: #{rm.targetPosition}</p>}
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Traffic</p>
              <p className="text-sm font-bold">{rm.traffic.toLocaleString()}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">SEO Score</p>
              <QualityScoreRing score={rm.seoScore} size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={article.stage} variant="accent" className="text-[10px]" />
        <StatusBadge status={article.entryPoint} className="text-[10px]" />
        <select value={priority} onChange={e => handlePriorityChange(e.target.value as PipelineArticle['priority'])} className="h-6 rounded border border-input bg-background px-1.5 text-[10px] font-medium">
          <option value="High">🔴 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>
      </div>

      {/* Quality Score — only show after writing (Stage 5+) */}
      {article.qualityScore > 0 && (
      <div className="flex items-center gap-4">
        <QualityScoreRing score={article.qualityScore || 0} size={56} />
        <div>
          <p className="text-[14px] font-display font-semibold tracking-tight text-card-foreground tabular-nums">Quality Score</p>
          <p className="text-[11px] text-muted-foreground">Generated during draft creation</p>
        </div>
      </div>
      )}

      {/* CMS-130: ZeroGPT AI score next to the quality/SEO score — the
          Humanise-stage pair (draft → humanised) while it exists, else the
          pre-publish AI Final Processing pair. */}
      {(() => {
        const zg =
          article.humanise && (article.humanise.initialAiScore != null || article.humanise.finalAiScore != null)
            ? { label: 'Humanise stage', ...article.humanise }
            : article.finalProcessing && (article.finalProcessing.initialAiScore != null || article.finalProcessing.finalAiScore != null)
              ? { label: 'AI Final Processing', ...article.finalProcessing }
              : null;
        if (!zg) return null;
        const passed = zg.finalAiScore != null && zg.finalAiScore <= 40;
        return (
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[13px] font-bold tabular-nums border-4 ${passed ? 'border-success/30 text-success' : 'border-warning/30 text-warning-foreground'}`}>
              {zg.finalAiScore != null ? `${Math.round(zg.finalAiScore)}%` : zg.initialAiScore != null ? `${Math.round(zg.initialAiScore)}%` : '—'}
            </div>
            <div>
              <p className="text-[14px] font-display font-semibold tracking-tight text-card-foreground tabular-nums">ZeroGPT AI Score</p>
              <p className="text-[11px] text-muted-foreground">
                {zg.initialAiScore != null && zg.finalAiScore != null
                  ? `${Math.round(zg.initialAiScore)}% before → ${Math.round(zg.finalAiScore)}% after humanising (${zg.label})`
                  : `Detection complete (${zg.label})`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Target Keyword — after keywords selected (Stage 3+); CMS-149 drafts
          saved without one get the empty-state editor instead */}
      {(article.primaryKeyword || article.targetKeyword) ? (
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-[13px] font-semibold text-card-foreground">{article.primaryKeyword || article.targetKeyword}</p>
        {seo ? (
          <>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="text-[11px] text-muted-foreground">KD <span className="font-medium text-card-foreground">{seo.metrics.keywordDifficulty}</span></span>
              <span className="text-[11px] text-muted-foreground">Vol <span className="font-medium text-card-foreground">{seo.metrics.searchVolume.toLocaleString()}</span></span>
              <span className="text-[11px] text-muted-foreground">CPC <span className="font-medium text-card-foreground">${seo.metrics.cpc.toFixed(2)}</span></span>
            </div>
            {seo.serp && seo.serp.length > 0 && (
              <>
                <div className="mt-2 flex items-center gap-3 text-[11px]">
                  <span className="text-muted-foreground">Top SERP Results:</span>
                  <button onClick={() => setExpandCompetitors(!expandCompetitors)} className="flex items-center gap-1 text-primary hover:underline">
                    <span className="font-medium">{seo.serp.slice(0, 3).map(s => `${s.domain} #${s.position}`).join(' · ')}</span>
                    {expandCompetitors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                {expandCompetitors && (
                  <div className="mt-2 space-y-1.5 bg-muted/20 rounded-lg p-3">
                    {seo.serp.map(c => (
                      <div key={c.url} className="flex items-start gap-3 text-[11px] py-1.5 border-b border-border last:border-0">
                        <span className="w-6 text-right font-bold text-muted-foreground shrink-0">#{c.position}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-card-foreground">{c.title}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.domain}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-muted-foreground">{c.estimatedWordCount?.toLocaleString() || '—'} words</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-1.5">Keyword metrics will appear after the Keyword Discovery stage</p>
        )}
        {article.topicCluster && <Badge variant="secondary" className="text-[10px] mt-2">{article.topicCluster}</Badge>}
      </div>
      ) : (
        <TargetKeywordEditor article={article} />
      )}

      {/* Article Brief — Context / Angle / Audience (CMS-54) */}
      <ArticleBriefSection article={article} />

      {/* Assigned */}
      <div>
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">Assigned To</p>
        {teamLoading ? (
          <span className="text-[12px] text-muted-foreground">Loading team...</span>
        ) : teamMembers.length > 0 ? (
          <select value={assignee} onChange={e => handleAssigneeChange(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-[12px]">
            {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
          </select>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            {article.assignee.name} <span className="text-[10px]">(team members load from Settings)</span>
          </p>
        )}
      </div>

      {/* Timeline */}
      <div>
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Stage Timeline</p>
        {timeline.length > 0 ? (
          <div className="flex items-center gap-1">
            {timeline.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${i === timeline.length - 1 ? 'bg-accent' : 'bg-success'}`} />
                  <span className="text-[9px] text-muted-foreground mt-1 whitespace-nowrap">{s.label}</span>
                  <TimeAgo date={s.time} className="text-[8px] text-muted-foreground" />
                </div>
                {i < timeline.length - 1 && <div className="w-8 h-px bg-success mb-5" />}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No timeline data available</p>
        )}
      </div>

      {/* Personal Experience - Voice Notes */}
      <div className="bg-muted/40 rounded-lg border border-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-card-foreground">Personal Experience</p>
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              voiceNotes.length + attachedExperiences.length > 0 ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
            }`}>
              {voiceNotes.length + attachedExperiences.length > 0
                ? <><Check className="w-3 h-3" /> {voiceNotes.length + attachedExperiences.length} item{voiceNotes.length + attachedExperiences.length !== 1 ? 's' : ''}</>
                : <><Minus className="w-3 h-3" /> No experience</>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => { setShowRecorder(!showRecorder); setShowEditorialNote(false); }}>
              <Mic className="w-3 h-3 mr-1" /> Record Experience
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] border-accent text-accent hover:bg-accent/10" onClick={() => { setShowEditorialNote(!showEditorialNote); setShowRecorder(false); }}>
              🎯 Add Editorial Note
            </Button>
          </div>
        </div>
        {showEditorialNote && (
          <div className="p-4 space-y-2">
            <Textarea
              value={editorialNoteText}
              onChange={e => setEditorialNoteText(e.target.value)}
              placeholder="Type your editorial notes — strategic direction, angle, requirements..."
              className="min-h-[80px] text-[12px]"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-[11px]" onClick={() => {
                updateArticle(article.id, { editorialNotes: editorialNoteText })
                  .then(() => { toast.success('Editorial note saved'); setShowEditorialNote(false); })
                  .catch(() => {});
              }}>Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setShowEditorialNote(false)}>Cancel</Button>
            </div>
          </div>
        )}
        {showRecorder && (
          <div className="p-4">
            <VoiceNoteRecorder
              contextId={article.id}
              context="pipeline"
              onSave={handleVoiceNoteSave}
            />
          </div>
        )}
        {/* Voice notes list */}
        {voiceNotesLoading && (
          <div className="px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading voice notes...
          </div>
        )}
        {voiceNotes.length > 0 && (
          <div className="divide-y divide-border/60">
            {voiceNotes.map((note) => (
              <div key={note.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  {note.audioStoragePath && (
                    <Button size="icon" variant="outline" className="h-6 w-6 shrink-0">
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                  <span className="text-[11px] font-medium text-card-foreground">{note.contributor || 'Unknown'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {note.recordedAt.toLocaleDateString()}
                  </span>
                  {note.duration > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {Math.floor(note.duration / 60)}:{(note.duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                  {note.transcriptionStatus === 'pending' && (
                    <Badge variant="secondary" className="text-[9px] gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Transcribing...
                    </Badge>
                  )}
                  {note.transcriptionStatus === 'error' && (
                    <Badge variant="destructive" className="text-[9px]">Transcription failed</Badge>
                  )}
                </div>
                {note.transcriptionStatus === 'completed' && note.transcript && (
                  <div>
                    <button
                      onClick={() => toggleTranscript(note.id)}
                      className="text-[10px] text-accent hover:underline"
                    >
                      {expandedTranscripts.has(note.id) ? 'Hide transcript' : 'Show transcript'}
                    </button>
                    {expandedTranscripts.has(note.id) && (
                      <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">{note.transcript}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Experience Library items attached to this article — every attach
            adds another transcript to the article's E-E-A-T / draft context */}
        {attachedExperiences.length > 0 && (
          <div className="divide-y divide-border/60 border-t border-border/60">
            {attachedExperiences.map((item) => (
              <div key={item.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-start gap-2.5">
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="w-12 h-9 object-cover rounded shrink-0 border border-border/60"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 capitalize">
                        {item.source === 'x-twitter' ? 'X/Twitter' : item.source.replace('-', ' ')}
                      </Badge>
                      <span className="text-[11px] font-medium text-card-foreground truncate flex-1" title={item.title || item.caption || ''}>
                        {item.title || item.caption || item.sourceUrl || 'Untitled'}
                      </span>
                      {item.accountHandle && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{item.accountHandle}</span>
                      )}
                    </div>
                    {item.transcript && (
                      <div>
                        <button
                          onClick={() => toggleTranscript(item.id)}
                          className="text-[10px] text-accent hover:underline"
                        >
                          {expandedTranscripts.has(item.id) ? 'Hide transcript' : 'Show transcript'}
                        </button>
                        {expandedTranscripts.has(item.id) && (
                          <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">{item.transcript}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-muted-foreground hover:text-destructive shrink-0"
                    disabled={detachingExperienceId === item.id}
                    onClick={() => handleDetachExperience(item)}
                  >
                    {detachingExperienceId === item.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <X className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Attach from Library — pick Experience items without leaving the article */}
        <div className="px-4 py-2 border-t border-border/60 flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground"
            onClick={() => setShowAttachExperience(true)}
          >
            <Library className="w-3 h-3 mr-1" /> Attach from Library
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground"
            onClick={() => window.open('/experience', '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" /> Open Library
          </Button>
        </div>
        <AttachExperienceDialog
          open={showAttachExperience}
          onOpenChange={setShowAttachExperience}
          articleId={article.id}
          articleTitle={article.title}
        />
      </div>

      {/* AI Article Outline */}
      {(() => {
        const outlineItems: string[] = article.outline && article.outline.length > 0
          ? article.outline
          : article.seoResearch?.recommendedStructure
            ? [article.seoResearch.recommendedStructure.suggestedH1, ...article.seoResearch.recommendedStructure.suggestedH2s]
            : [];
        return (
          <div>
            <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-2">AI Article Outline</p>
            {outlineItems.length > 0 ? (
              <div>
                {outlineItems.map((s, i) => (
                  <label key={i} className="flex items-center gap-2.5 py-2 cursor-pointer group border-b border-border/40 last:border-0">
                    <input
                      type="checkbox"
                      checked={outlineChecks.has(i)}
                      onChange={() => setOutlineChecks(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      })}
                      className="w-3.5 h-3.5 rounded border-input"
                    />
                    <span className={`text-[12px] transition-all duration-150 ${outlineChecks.has(i) ? 'line-through text-muted-foreground opacity-60' : 'text-card-foreground'}`}>{s}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Outline will appear after SEO research generates a recommended structure</p>
            )}
          </div>
        );
      })()}

      {/* Source Material (CMS-147) — reference URLs editable after creation;
          deep research analyzes them alongside its own research. */}
      <SourceMaterialSection article={article} />

      {/* Published status — show live URL and unpublish (kept for monitoring view) */}
      {article.stage === 'Published' && article.publishedUrl && (
        <div className="bg-success/5 border border-success/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-success" />
            <span className="text-sm font-semibold text-success">Published & Monitored</span>
            <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded ml-auto">Live ●</span>
          </div>
          <a href={article.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
            {article.publishedUrl} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

    </div>
  );
}


// === Tasks Tab ===
// === Image Management (Images task) ===
interface ManagedImage {
  id: string;
  filename: string;
  altText: string;
  placement: string;
}

function ImageManagementSection() {
  const [featured, setFeatured] = useState<ManagedImage | null>(null);
  const [inArticleImages, setInArticleImages] = useState<ManagedImage[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'featured' | 'in-article'>('featured');

  const checklist = [
    { label: 'Featured image selected', passed: !!featured, required: true },
    { label: 'All in-article images have alt text', passed: inArticleImages.every(i => i.altText.length > 0) || inArticleImages.length === 0, required: true },
  ];

  const handleAssetSelect = (asset: { id: string; filename: string; altText: string }) => {
    const img: ManagedImage = { id: `img-${Date.now()}`, filename: asset.filename, altText: asset.altText, placement: '' };
    if (pickerTarget === 'featured') setFeatured(img);
    else setInArticleImages(prev => [...prev, img]);
    setPickerOpen(false);
  };

  return (
    <div className="mt-2 bg-muted/30 rounded-lg p-3 space-y-3">
      <p className="text-[11px] font-semibold text-card-foreground">📷 Image Management</p>

      {/* Featured image */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">Featured Image</p>
        {featured ? (
          <div className="flex items-center gap-2 p-2 rounded border border-border bg-card">
            <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-card-foreground truncate">{featured.filename}</p>
              <Input value={featured.altText} onChange={e => setFeatured({ ...featured, altText: e.target.value })} placeholder="Alt text..." className="h-6 text-[10px] mt-1" />
            </div>
            <button onClick={() => setFeatured(null)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => { setPickerTarget('featured'); setPickerOpen(true); }}>
              <ImageIcon className="w-3 h-3 mr-1" /> Asset Library
            </Button>
            <label className="inline-flex items-center h-6 px-2 rounded border border-input text-[10px] font-medium cursor-pointer hover:bg-muted transition-colors">
              <Upload className="w-3 h-3 mr-1" /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const f = e.target.files?.[0];
                if (f) setFeatured({ id: `img-${Date.now()}`, filename: f.name, altText: '', placement: '' });
              }} />
            </label>
          </div>
        )}
      </div>

      {/* In-article images */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">In-Article Images</p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => { setPickerTarget('in-article'); setPickerOpen(true); }}>
              <ImageIcon className="w-3 h-3 mr-1" /> Asset Library
            </Button>
            <label className="inline-flex items-center h-6 px-2 rounded border border-input text-[10px] font-medium cursor-pointer hover:bg-muted transition-colors">
              <Upload className="w-3 h-3 mr-1" /> Upload
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                const files = Array.from(e.target.files || []);
                setInArticleImages(prev => [...prev, ...files.map(f => ({ id: `img-${Date.now()}-${f.name}`, filename: f.name, altText: '', placement: '' }))]);
              }} />
            </label>
          </div>
        </div>
        {inArticleImages.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">No in-article images added yet.</p>
        ) : (
          <div className="space-y-1.5">
            {inArticleImages.map(img => (
              <div key={img.id} className="flex items-center gap-2 p-2 rounded border border-border bg-card">
                <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-card-foreground truncate">{img.filename}</p>
                  <Input
                    value={img.altText}
                    onChange={e => setInArticleImages(prev => prev.map(i => i.id === img.id ? { ...i, altText: e.target.value } : i))}
                    placeholder="Alt text..."
                    className="h-6 text-[10px] mt-1"
                  />
                </div>
                {!img.altText && <Badge className="text-[8px] border-0 bg-warning/15 text-warning-foreground shrink-0">Missing alt</Badge>}
                <button onClick={() => setInArticleImages(prev => prev.filter(i => i.id !== img.id))} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="space-y-1">
        {checklist.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            {c.passed ? <CheckCircle2 className="w-3 h-3 text-success" /> : <AlertTriangle className="w-3 h-3 text-warning" />}
            <span className={c.passed ? 'text-muted-foreground' : 'text-warning-foreground font-medium'}>{c.label}</span>
            {c.required && !c.passed && <span className="text-destructive">*</span>}
          </div>
        ))}
      </div>

      <AssetLibraryPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleAssetSelect} />
    </div>
  );
}

// === Social Embeds Management (Social Embeds task) ===
const SOCIAL_PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'X/Twitter', 'LinkedIn'] as const;

function SocialEmbedsManagementSection() {
  const [activePlatform, setActivePlatform] = useState<typeof SOCIAL_PLATFORMS[number]>('TikTok');
  const [embeds, setEmbeds] = useState<Array<{ id: string; platform: string; url: string; placement: string }>>([]);
  const [newUrl, setNewUrl] = useState('');

  const checklist = [
    { label: 'All embeds have valid URLs', passed: embeds.every(e => e.url.startsWith('http')) || embeds.length === 0 },
    { label: 'Embeds placed in relevant sections', passed: embeds.every(e => e.placement !== '') || embeds.length === 0 },
  ];

  const addEmbed = () => {
    if (!newUrl.trim() || !newUrl.startsWith('http')) return;
    setEmbeds(prev => [...prev, { id: `e-${Date.now()}`, platform: activePlatform, url: newUrl.trim(), placement: '' }]);
    setNewUrl('');
  };

  return (
    <div className="mt-2 bg-muted/30 rounded-lg p-3 space-y-3">
      <p className="text-[11px] font-semibold text-card-foreground">📱 Social Embeds</p>

      {/* Platform tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {SOCIAL_PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setActivePlatform(p)}
            className={`px-2 py-1 text-[10px] font-medium border-b-2 -mb-px transition-colors ${
              activePlatform === p ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Add embed */}
      <div className="flex gap-2">
        <Input
          placeholder={`Paste ${activePlatform} URL...`}
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEmbed()}
          className="h-7 text-[11px] flex-1"
        />
        <Button size="sm" className="h-7 text-[10px]" onClick={addEmbed}>Add</Button>
      </div>

      {/* Embed list */}
      {embeds.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">No embeds added yet</p>
      ) : (
        <div className="space-y-1.5">
          {embeds.map(embed => (
            <div key={embed.id} className="flex items-center gap-2 p-2 rounded border border-border bg-card">
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-card-foreground">{embed.platform}</p>
                <p className="text-[10px] text-muted-foreground truncate">{embed.url}</p>
              </div>
              <Input
                placeholder="Placement (section)..."
                value={embed.placement}
                onChange={e => setEmbeds(prev => prev.map(em => em.id === embed.id ? { ...em, placement: e.target.value } : em))}
                className="h-6 text-[10px] w-32 shrink-0"
              />
              <button onClick={() => setEmbeds(prev => prev.filter(e2 => e2.id !== embed.id))} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-1">
        {checklist.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            {c.passed ? <CheckCircle2 className="w-3 h-3 text-success" /> : <AlertTriangle className="w-3 h-3 text-warning" />}
            <span className={c.passed ? 'text-muted-foreground' : 'text-warning-foreground font-medium'}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Assignee dropdown (per task) ===
function AssigneeDropdown({ currentAssignee, currentAvatar, onAssign }: {
  currentAssignee: string;
  currentAvatar: string;
  onAssign: (name: string, avatar: string) => void;
}) {
  const { members } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
        <div className="w-4 h-4 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[7px] font-medium">{currentAvatar || '??'}</div>
        <span className="text-[10px]">{currentAssignee}</span>
        <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-raised z-50 py-1">
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Assign to</p>
          {members.length === 0 && <p className="px-3 py-2 text-[11px] text-muted-foreground">No team members found</p>}
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => { onAssign(m.name, m.avatar || m.name.split(' ').map(w => w[0]).join('')); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left ${m.name === currentAssignee ? 'bg-muted/30' : ''}`}
            >
              <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[8px] font-semibold">{m.avatar || m.name.split(' ').map(w => w[0]).join('')}</span>
              <span className="text-[11px] font-medium text-card-foreground">{m.name}</span>
              {m.role && <span className="text-[9px] text-muted-foreground ml-auto">{m.role}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// === Blocker dropdown (blocked tasks) ===
function BlockerDropdown({ task, onResolve, onUpdate, onReassign }: {
  task: ArticleTask;
  onResolve: () => void;
  onUpdate: (reason: string) => void;
  onReassign: (name: string, avatar: string) => void;
}) {
  const { members } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.blockReason || '');
  const [showReassign, setShowReassign] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setEditing(false); setShowReassign(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="cursor-pointer">
        <span className="flex items-center gap-1.5 text-[10px] text-destructive hover:text-destructive/80 transition-colors">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {task.blockReason || 'Blocked'}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-popover border border-border rounded-lg shadow-raised z-50 py-1">
          {!editing && !showReassign && (
            <>
              <button onClick={() => { onResolve(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left text-[11px] text-card-foreground">
                <Check className="w-3.5 h-3.5 text-success" /> Mark Resolved
              </button>
              <button onClick={() => { setEditing(true); setEditText(task.blockReason || ''); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left text-[11px] text-card-foreground">
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Update Blocker
              </button>
              <button onClick={() => setShowReassign(true)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left text-[11px] text-card-foreground">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" /> Reassign
              </button>
            </>
          )}
          {editing && (
            <div className="p-2 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Update blocker reason</p>
              <Input value={editText} onChange={e => setEditText(e.target.value)} className="h-7 text-[11px]" autoFocus />
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" className="h-6 text-[10px]" onClick={() => { onUpdate(editText); setEditing(false); setOpen(false); }}>Save</Button>
              </div>
            </div>
          )}
          {showReassign && (
            <div className="py-1">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Reassign to</p>
              {members.map(m => (
                <button key={m.id} onClick={() => { onReassign(m.name, m.avatar || m.name.split(' ').map(w => w[0]).join('')); setShowReassign(false); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left">
                  <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[8px] font-semibold">{m.avatar || m.name.split(' ').map(w => w[0]).join('')}</span>
                  <span className="text-[11px] font-medium text-card-foreground">{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TasksTab({ tasks, loading: tasksLoading, articleId }: { tasks: ArticleTask[]; loading: boolean; articleId: string }) {
  const taskIconMap: Record<string, any> = { pencil: Pencil, shield: Shield, link: LinkIcon, image: ImageIcon, camera: Camera, smartphone: Smartphone };
  const { manageTasks } = useArticleMutations();
  const { members } = useTeamMembers();
  const { userProfile: currentUser } = useAuth();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmCompleteBlockedId, setConfirmCompleteBlockedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) setBulkOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (tasksLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading tasks...</div>;

  const completed = tasks.filter(t => t.status === 'Complete').length;
  const blockedCount = tasks.filter(t => t.status === 'Blocked').length;

  const handleComplete = (task: ArticleTask) => {
    if (task.status === 'Blocked') {
      setConfirmCompleteBlockedId(task.id);
      return;
    }
    manageTasks({ action: 'complete', taskId: task.id }).catch(() => {});
  };

  const resolveAndComplete = (taskId: string) => {
    manageTasks({ action: 'unblock', taskId })
      .then(() => manageTasks({ action: 'complete', taskId }))
      .catch(() => {});
    setConfirmCompleteBlockedId(null);
    toast.success('Blocker resolved & task completed');
  };

  const reassignTask = (taskId: string, name: string) => {
    manageTasks({ action: 'update', taskId, assignee: name }).catch(() => {});
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTask(true);
    try {
      await manageTasks({ action: 'delete', taskId });
      toast.success('Task deleted');
      setConfirmDeleteId(null);
    } catch {
      // error toast handled in useArticleMutations
    } finally {
      setDeletingTask(false);
    }
  };

  const bulkReassign = (name: string) => {
    tasks.forEach(t => manageTasks({ action: 'update', taskId: t.id, assignee: name }).catch(() => {}));
    setBulkOpen(false);
    toast.success(`All tasks reassigned to ${name}`);
  };

  return (
    <div className="space-y-4">
      {/* Confirm complete blocked task */}
      {confirmCompleteBlockedId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" onClick={() => setConfirmCompleteBlockedId(null)}>
          <div className="bg-card border border-border rounded-xl shadow-overlay w-[380px] p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-card-foreground mb-2">This task is currently blocked</h3>
            <p className="text-[12px] text-muted-foreground mb-4">Resolve the blocker and mark as complete?</p>
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setConfirmCompleteBlockedId(null)}>Cancel</Button>
              <Button size="sm" className="h-7 text-[11px]" onClick={() => resolveAndComplete(confirmCompleteBlockedId)}>
                Resolve & Complete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete task */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" onClick={() => !deletingTask && setConfirmDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl shadow-overlay w-[380px] p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-card-foreground mb-2">Delete this task?</h3>
            <p className="text-[12px] text-muted-foreground mb-4">
              "{tasks.find(t => t.id === confirmDeleteId)?.name || 'This task'}" will be permanently removed from this article. This cannot be undone.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={deletingTask} onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" className="h-7 text-[11px] gap-1" disabled={deletingTask} onClick={() => handleDeleteTask(confirmDeleteId)}>
                {deletingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {deletingTask ? 'Deleting…' : 'Delete Task'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress + Bulk Reassign */}
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-card-foreground">
              {completed} of {tasks.length} tasks complete
              {blockedCount > 0 && <span className="text-destructive ml-1">· ⚠ {blockedCount} blocked</span>}
            </span>
            <div className="relative" ref={bulkRef}>
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setBulkOpen(!bulkOpen)}>
                <RefreshCw className="w-3 h-3" /> Reassign All <ChevronDown className="w-3 h-3" />
              </Button>
              {bulkOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-raised z-50 py-1">
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Reassign all tasks to</p>
                  {members.length === 0 && <p className="px-3 py-2 text-[11px] text-muted-foreground">No team members found</p>}
                  {members.map(m => (
                    <button key={m.id} onClick={() => bulkReassign(m.name)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left">
                      <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[9px] font-semibold">{m.avatar || m.name.split(' ').map(w => w[0]).join('')}</span>
                      <span className="text-[11px] font-medium text-card-foreground">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Auto-progression info */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
        <p className="text-[11px] text-accent font-medium">⚡ Auto-progression active</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">AI stages run automatically. Human tasks (Images + Social Embeds) must be completed before the article advances to Review & Edit.</p>
      </div>

      {tasks.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No tasks yet</p>}
      <div className="space-y-2">
        {tasks.map(task => {
          const Icon = taskIconMap[task.icon] || FileText;
          const isMediaTask = task.isImagesTask || task.isSocialEmbedsTask;
          return (
            <div key={task.id}>
              <div className={`bg-card rounded-lg border p-3 ${task.status === 'Blocked' ? 'border-l-[3px] border-l-destructive border-destructive/30' : isMediaTask ? 'border-warning/40' : 'border-border'}`}>
                <div className="flex items-start gap-3">
                  {/* Completion checkbox */}
                  <button
                    onClick={() => {
                      if (task.status === 'Complete') {
                        // Untick — revert to Pending
                        manageTasks({ action: 'update', taskId: task.id, status: 'Pending' }).catch(() => {});
                      } else {
                        handleComplete(task);
                      }
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
                      task.status === 'Complete'
                        ? 'bg-primary border-primary text-primary-foreground'
                        : task.status === 'Blocked'
                        ? 'border-destructive/40 hover:border-destructive/60 bg-destructive/5'
                        : 'border-muted-foreground/40 hover:border-primary/60 hover:bg-primary/5'
                    }`}
                  >
                    {task.status === 'Complete' && <Check className="w-3.5 h-3.5" />}
                    {task.status === 'Blocked' && <AlertTriangle className="w-3 h-3 text-destructive" />}
                  </button>

                  <Icon className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <InlineTitleEditor
                          title={task.name}
                          onChange={(name) => manageTasks({ action: 'update', taskId: task.id, name }).catch(() => {})}
                          isComplete={task.status === 'Complete'}
                          className="text-[12px]"
                        />
                        {task.isImagesTask && task.status !== 'Complete' && (
                          <Badge className="text-[9px] border-0 bg-warning/15 text-warning-foreground">📷 Blocks Advancement</Badge>
                        )}
                        {task.isSocialEmbedsTask && task.status !== 'Complete' && (
                          <Badge className="text-[9px] border-0 bg-warning/15 text-warning-foreground">📱 Blocks Advancement</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusCycler
                          status={task.status}
                          onChange={(status, reason) => {
                            const input = status === 'Blocked'
                              ? { action: 'block' as const, taskId: task.id, blockReason: reason || 'Blocked' }
                              : { action: 'update' as const, taskId: task.id, status };
                            manageTasks(input).catch(() => {});
                          }}
                        />
                        <button
                          onClick={() => setConfirmDeleteId(task.id)}
                          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {task.description && <p className="text-[10px] text-muted-foreground mt-1">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <AssigneeDropdown
                        currentAssignee={task.assignee}
                        currentAvatar={task.avatar}
                        onAssign={(name) => reassignTask(task.id, name)}
                      />
                      <InlineDatePicker
                        date={task.dueDate}
                        onChange={(date) => manageTasks({ action: 'update', taskId: task.id, dueDate: date }).catch(() => {})}
                      />
                      <CommentThread taskId={task.id} commentCount={task.comments} />
                    </div>
                    {/* Auto/Manual assignment label */}
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                      {task.autoAssigned ? (
                        <>⚙ Auto-assigned based on role and availability</>
                      ) : task.assignee && task.assignee !== 'Unassigned' ? (
                        <><Pencil className="w-2.5 h-2.5" /> Manually assigned</>
                      ) : (
                        <><AlertTriangle className="w-2.5 h-2.5 text-warning" /> No available team member — please assign manually</>
                      )}
                    </p>
                    {task.status === 'Blocked' && task.blockReason && (
                      <div className="mt-2">
                        <BlockerDropdown
                          task={task}
                          onResolve={() => { manageTasks({ action: 'unblock', taskId: task.id }).catch(() => {}); toast.success('Blocker resolved'); }}
                          onUpdate={(reason) => { manageTasks({ action: 'block', taskId: task.id, blockReason: reason }).catch(() => {}); toast.success('Blocker updated'); }}
                          onReassign={(name) => { reassignTask(task.id, name); toast.success(`Task reassigned to ${name}`); }}
                        />
                        {task.blocksAdvancement && (
                          <p className="text-[10px] text-destructive mt-1">🚫 Blocks Advancement</p>
                        )}
                      </div>
                    )}
                    {/* Resolved blocker history */}
                    {task.resolvedBlockers && task.resolvedBlockers.length > 0 && (
                      <details className="mt-1.5">
                        <summary className="text-[9px] text-muted-foreground italic cursor-pointer">Previously blocked ({task.resolvedBlockers.length})</summary>
                        <div className="mt-0.5 space-y-0.5 pl-2">
                          {task.resolvedBlockers.map((rb, i) => (
                            <p key={i} className="text-[9px] text-muted-foreground italic">
                              {rb.reason} — resolved {rb.resolvedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                    {isMediaTask && (
                      <button
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        className="flex items-center gap-1 mt-2 text-[11px] text-primary hover:text-primary/80 transition-colors"
                      >
                        {expandedTask === task.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expandedTask === task.id ? `Hide ${task.isImagesTask ? 'image' : 'embed'} management` : `Manage ${task.isImagesTask ? 'images' : 'social embeds'}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {task.isImagesTask && expandedTask === task.id && <ImageManagementSection />}
              {task.isSocialEmbedsTask && expandedTask === task.id && <SocialEmbedsManagementSection />}
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1" onClick={() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        (manageTasks as (input: any) => Promise<unknown>)({
          action: 'create',
          articleId,
          name: 'New custom task',
          icon: 'pencil',
          assignee: currentUser?.displayName || currentUser?.email || 'Unassigned',
          avatar: (currentUser?.displayName || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
          dueDate: tomorrow.toISOString(),
        })
          .then(() => toast.success('Task added', { description: 'New custom task created.' }))
          .catch(() => {});
      }}><Plus className="w-3.5 h-3.5" /> Add Custom Task</Button>
    </div>
  );
}

// === Research Brief Tab ===
function ResearchBriefTab({ article }: { article: PipelineArticle; onStatusChange: (id: string, status: ArticleStatus) => void }) {
  const { generateResearch, updateArticle, loading } = useArticleMutations();
  // CMS-154: the plan header states how the writer will use voice notes and
  // attached Experience Library items — count them live (same pattern as the
  // Overview tab).
  const { voiceNotes } = useVoiceNotes(article.id);
  const { allItems: libraryItems } = useExperiences();
  const experienceCount = libraryItems.filter(i =>
    i.attachedArticles.some(a => a.id === article.id)
  ).length;

  const handleRerunResearch = async () => {
    try {
      await generateResearch({
        articleId: article.id,
        targetKeyword: article.primaryKeyword || article.targetKeyword || article.title,
        sourceUrls: article.sourceUrls?.map(s => s.url),
      });
      toast.success('Topic research regenerated');
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  const handleApproveWriting = async () => {
    // Errors propagate to TopicResearchBrief, which owns the outcome toast
    await updateArticle(article.id, { briefApprovalStatus: 'approved' });
    // Advance stage from Deep Research → Write Article
    // production: httpsCallable(functions, 'updateArticleStage')
    await callUpdateArticleStage(article.id, 'Write Article');
  };

  const handleUnlockResearch = async () => {
    await updateArticle(article.id, { briefApprovalStatus: 'draft' });
    // Return the article to the research stage so findings are editable again
    // production: httpsCallable(functions, 'updateArticleStage')
    await callUpdateArticleStage(article.id, 'Deep Research');
  };

  return (
    <TopicResearchBrief
      articleId={article.id}
      researchBrief={article.researchBrief ? {
        id: article.researchBrief.id || `brief-${article.id}`,
        articleId: article.id,
        findings: article.researchBrief.findings || [],
        selectedFindings: article.researchBrief.selectedFindings || [],
        findingNotes: article.researchBrief.findingNotes || {},
        citations: article.researchBrief.citations || [],
        sourceNotes: article.researchBrief.sourceNotes || {},
        excludedSourceUrls: article.researchBrief.excludedSourceUrls || [],
        planNote: article.researchBrief.planNote || '',
        approvalStatus: article.researchBrief.approvalStatus || 'draft',
        lockedAt: article.researchBrief.lockedAt || null,
        approvedBy: article.researchBrief.approvedBy || null,
        generatedAt: article.researchBrief.generatedAt || new Date(),
        keyword: article.researchBrief.keyword || article.targetKeyword,
      } : null}
      sourceUrls={article.sourceUrls || []}
      planContext={{
        primaryKeyword: article.primaryKeyword || article.targetKeyword || article.title,
        secondaryKeywords: article.secondaryKeywords || [],
        context: article.context,
        angle: article.angle,
        targetAudience: article.targetAudience,
        headingStructure: article.seoResearch?.recommendedStructure
          ? {
              h1: article.seoResearch.recommendedStructure.suggestedH1,
              h2s: article.seoResearch.recommendedStructure.suggestedH2s,
              targetWordCount: article.seoResearch.recommendedStructure.targetWordCount,
            }
          : null,
        voiceNoteCount: voiceNotes.filter(n => n.transcriptionStatus === 'completed' && n.transcript.trim()).length,
        experienceCount,
      }}
      isLoading={loading.generateResearch}
      onApproveWriting={handleApproveWriting}
      onRerunResearch={handleRerunResearch}
      onUpdateSelections={(selectedIds) =>
        updateArticle(article.id, { selectedFindings: selectedIds })
      }
      onUpdateNotes={(findingNotes) =>
        updateArticle(article.id, { findingNotes })
      }
      onUpdateSourceNotes={(sourceNotes) =>
        updateArticle(article.id, { sourceNotes })
      }
      onUpdateExcludedSources={(excludedSourceUrls) =>
        updateArticle(article.id, { excludedSourceUrls })
      }
      onUpdatePlanNote={(planNote) =>
        updateArticle(article.id, { planNote })
      }
      onUnlock={handleUnlockResearch}
    />
  );
}

// === Content Preview Tab ===
function cleanContent(raw: string): string {
  if (!raw) return '';
  let content = raw.trim();

  // ── Strip Claude preamble text before JSON/code blocks ─────────────
  // Claude sometimes outputs thinking text before the actual content:
  // "I need to research this topic... ```json { "html": "..."
  // Strip everything before the first code block or JSON object
  const codeBlockStart = content.indexOf('```');
  if (codeBlockStart > 0 && codeBlockStart < 500) {
    // There's text before the code block — it's Claude's preamble
    content = content.slice(codeBlockStart);
  }

  // Strip markdown code block wrapper (```json ... ``` or ``` ... ```)
  const codeBlockMatch = content.match(/`{3}(?:json)?\s*\n?([\s\S]*?)\n?\s*`{3}/);
  if (codeBlockMatch) content = codeBlockMatch[1].trim();

  // If starts with "json" literal (Claude sometimes outputs this without backticks)
  if (content.startsWith('json')) {
    content = content.replace(/^json\s*/, '').trim();
  }

  // Try JSON.parse directly
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && parsed.html) {
      return typeof parsed.html === 'string' ? parsed.html : String(parsed.html);
    }
  } catch { /* not valid JSON */ }

  // Try to extract JSON object containing "html" field anywhere in the text
  const jsonObjMatch = content.match(/\{\s*"html"\s*:\s*"([\s\S]*)"\s*\}/);
  if (jsonObjMatch) {
    let html = jsonObjMatch[1];
    html = html.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (html.includes('<p>') || html.includes('<h1') || html.includes('<h2')) {
      return html;
    }
    return markdownToBasicHtml(html);
  }

  // Content has literal backslash-n characters (displayed as \n in the UI)
  if (content.includes('\\n')) {
    content = content.replace(/^\s*\{\s*"html"\s*:\s*"?\s*/, '');
    content = content.replace(/"\s*\}\s*$/, '');
    content = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (content.includes('<p>') || content.includes('<h1') || content.includes('<h2')) {
      return content;
    }
    return markdownToBasicHtml(content);
  }

  // If content has preamble text followed by HTML — strip the preamble
  // Detect: text before first HTML tag
  const firstHtmlTag = content.match(/(<h[1-6]|<p|<div|<article|<section)/i);
  if (firstHtmlTag && firstHtmlTag.index && firstHtmlTag.index > 20) {
    // There's significant text before the first HTML tag — likely Claude preamble
    content = content.slice(firstHtmlTag.index);
  }

  // Already valid HTML
  if (content.includes('<p>') || content.includes('<h1') || content.includes('<h2') || content.includes('<div')) {
    return content;
  }

  // Plain text with real newlines — convert to HTML
  if (content.includes('\n\n')) {
    return markdownToBasicHtml(content);
  }

  // Single block of text
  return `<p>${content}</p>`;
}

function markdownToBasicHtml(text: string): string {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
    if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
    if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
    if (trimmed.startsWith('#### ')) return `<h4>${trimmed.slice(5)}</h4>`;
    if (trimmed.match(/^[-*]\s/m)) {
      const items = trimmed.split('\n').filter(l => l.trim().match(/^[-*]\s/));
      return `<ul>${items.map(i => `<li>${i.replace(/^[-*]\s*/, '').trim()}</li>`).join('')}</ul>`;
    }
    if (trimmed.match(/^\d+\.\s/m)) {
      const items = trimmed.split('\n').filter(l => l.trim().match(/^\d+\./));
      return `<ol>${items.map(i => `<li>${i.replace(/^\d+\.\s*/, '').trim()}</li>`).join('')}</ol>`;
    }
    let para = trimmed.replace(/\n/g, ' ');
    para = para.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    para = para.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return `<p>${para}</p>`;
  }).join('\n');
}

/** Clean meta title/description fields that may contain raw JSON artifacts */
function cleanMetaField(value: string): string {
  if (!value) return '';
  let clean = value.trim();
  // Strip json prefix and HTML field wrapper
  clean = clean.replace(/^json\s*\{\s*"html"\s*:\s*"?\s*/, '');
  clean = clean.replace(/^`{3}(?:json)?\s*\{?\s*"html"\s*:\s*"?\s*/, '');
  // Strip trailing JSON artifacts
  clean = clean.replace(/"\s*,?\s*"metaTitle.*$/, '');
  clean = clean.replace(/"\s*\}\s*`{3}\s*$/, '');
  // Unescape common JSON escape sequences
  clean = clean.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  // Remove any remaining leading/trailing quotes
  clean = clean.replace(/^["']|["']$/g, '');
  return clean.trim().slice(0, 160);
}

// === Thumbnail / Featured Image Section (Content Preview tab, CMS-13) ===
// Sets article.featuredImage (via callables only) — consumed at publish time
// for Webflow's featured-image AND the OG/social image.
function ThumbnailSection({ article }: { article: PipelineArticle }) {
  const { role } = useAuth();
  const { updateArticle } = useArticleMutations();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  // Guards against duplicate callable invocations (UploadDialog can fire
  // onUploadComplete twice: once from the intake flow, once from close)
  const lastAppliedRef = useRef<string | null>(null);

  // addAssetToArticle (the single mutation both entry points converge on)
  // requires admin/editor — mirror that gate in the UI.
  const canEdit = role === Role.Admin || role === Role.Editor;
  const featuredImage = article.featuredImage || '';

  const applyAsset = async (asset: AssetDocument) => {
    if (lastAppliedRef.current === asset.id) return;
    lastAppliedRef.current = asset.id;
    setSaving(true);
    try {
      await assetService.addAssetToArticle({
        assetId: asset.id,
        articleId: article.id,
        context: 'featured',
      });
      toast.success(`Thumbnail set: ${asset.filename}`);
      // Non-blocking 9:16 check — falls back to loading the image when the
      // asset doc has no dimensions yet (device uploads store 0×0)
      const isPortrait = await checkReelPortrait(asset);
      if (isPortrait === false) {
        toast.warning('Thumbnail is not 9:16 portrait', {
          description: `Target format is ${REEL_PORTRAIT.width}×${REEL_PORTRAIT.height} (Instagram Reel portrait). The image will still be used.`,
        });
      }
    } catch (err) {
      lastAppliedRef.current = null;
      toast.error('Failed to set thumbnail', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // AI-generated / uploaded thumbnails arrive as an assetId — they are
  // regular library assets; fetch the doc, then converge on applyAsset.
  const applyAssetId = async (assetId: string) => {
    if (lastAppliedRef.current === assetId) return;
    try {
      const asset = await assetService.getAsset(assetId);
      if (!asset) throw new Error('Asset not found in the library.');
      await applyAsset(asset);
    } catch (err) {
      toast.error('Failed to set thumbnail', { description: (err as Error).message });
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await updateArticle(article.id, { featuredImage: '' });
      lastAppliedRef.current = null;
      toast.success('Thumbnail removed');
    } catch {
      // error toast handled in useArticleMutations
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
          Thumbnail / Featured Image
        </p>
        <span className="text-[9px] text-muted-foreground">
          Target: {REEL_PORTRAIT.width}×{REEL_PORTRAIT.height} (9:16 Reel portrait) · also used as OG/social image
        </span>
      </div>
      <div className="flex gap-3">
        {/* Preview / empty state */}
        <div className="w-24 shrink-0">
          <div className="aspect-[9/16] rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-center">
            {featuredImage ? (
              <img src={featuredImage} alt="Article thumbnail" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {featuredImage ? (
            <p className="text-[11px] text-card-foreground">
              Thumbnail set. It publishes to Webflow's featured image and the OG/social preview on publish/sync.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              No thumbnail selected. The article can still publish, but Webflow's featured image and the OG/social preview will be empty.
            </p>
          )}
          {/* CMS-113: persistent record of the last publish's thumbnail
              transfer failure — the toast is transient, this stays until a
              clean sync clears it. */}
          {article.featuredImageSyncWarning && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              ⚠ {article.featuredImageSyncWarning}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline" size="sm" className="h-7 text-[10px] gap-1"
              disabled={!canEdit || saving}
              onClick={() => setPickerOpen(true)}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Library className="w-3 h-3" />} Select from Library
            </Button>
            <Button
              variant="outline" size="sm" className="h-7 text-[10px] gap-1"
              disabled={!canEdit || saving}
              onClick={() => setGenerateOpen(true)}
            >
              <Sparkles className="w-3 h-3" /> Generate with AI
            </Button>
            <Button
              variant="outline" size="sm" className="h-7 text-[10px] gap-1"
              disabled={!canEdit || saving}
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="w-3 h-3" /> Upload
            </Button>
            {featuredImage && (
              <Button
                variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                disabled={!canEdit || removing || saving}
                onClick={handleRemove}
              >
                {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Remove
              </Button>
            )}
          </div>
          {!canEdit && (
            <p className="text-[9px] text-muted-foreground">Only editors and admins can change the thumbnail.</p>
          )}
        </div>
      </div>

      {/* Library picker (article→asset direction, from the assets module) */}
      <AssetPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Select Thumbnail from Asset Library"
        showReelPortraitHint
        onSelect={(asset) => applyAsset(asset)}
      />

      {/* AI generation — defaults to 9:16 portrait at 2K (~1080×1920);
          the saved image becomes a regular library asset */}
      <GenerateAIImageDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        defaultAspectRatio="9:16"
        defaultResolution="2K"
        onSaved={(assetId) => applyAssetId(assetId)}
      />

      {/* Direct upload — the uploaded file becomes a regular library asset */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={(assetId) => applyAssetId(assetId)}
      />
    </div>
  );
}

function ContentPreviewTab({ article, onRegisterBodyActions, onBodyDirtyChange }: {
  article: PipelineArticle;
  /** Registers the body's save/revert actions with the panel header (Save/Revert buttons). */
  onRegisterBodyActions?: (actions: { save: () => Promise<boolean>; revert: () => void } | null) => void;
  /** Reports whether the body has unsaved edits (drives header button state + close guard). */
  onBodyDirtyChange?: (dirty: boolean) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { generateDraft, updateArticle, publishToWebflow, loading: draftLoading } = useArticleMutations();
  const [editingField, setEditingField] = useState<'title' | 'desc' | 'slug' | null>(null);
  const [metaTitle, setMetaTitle] = useState(article.metaTitle || '');
  const [metaDesc, setMetaDesc] = useState(cleanMetaField(article.metaDescription || ''));
  const [slug, setSlug] = useState(article.slug || '');
  const [syncing, setSyncing] = useState(false);
  const [iframePickerOpen, setIframePickerOpen] = useState(false);
  const [activeIframe, setActiveIframe] = useState<{ id: string; top: number; left: number } | null>(null);
  const [editIframeId, setEditIframeId] = useState<string | null>(null);
  const [deleteIframeId, setDeleteIframeId] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [embedPickerOpen, setEmbedPickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [tpTablePickerOpen, setTpTablePickerOpen] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  const currentTemplate = getPageTemplate(article.pageTemplateId);

  // ── Body save/revert bridge (panel-header Save & Revert buttons) ──────────
  // CMS-152: saving the body is MANUAL — there is no auto-save-on-blur or
  // debounced save. Edits mark the body dirty; the header Save button (or the
  // "Save & close" action in the unsaved-changes warning) persists them.
  // Dirty resets when the stored content changes (save roundtrip, AI rewrite,
  // insert helpers, version restore).
  const [bodyDirty, setBodyDirty] = useState(false);
  useEffect(() => { onBodyDirtyChange?.(bodyDirty); }, [bodyDirty, onBodyDirtyChange]);
  useEffect(() => { setBodyDirty(false); }, [article.id, article.content]);

  const readEditorHtml = (): string | null => {
    const container = contentRef.current;
    if (!container) return null;
    const innerDiv = container.querySelector('[data-content-inner]') as HTMLElement | null;
    return innerDiv ? innerDiv.innerHTML : null;
  };

  /** Flushes the current editor HTML to Firestore. Resolves true when the
   *  save landed (the close-guard only closes the panel on true). */
  const saveBody = (): Promise<boolean> => {
    const html = readEditorHtml();
    if (!html || html.length <= 20) {
      toast.error('Nothing to save — the body looks empty.');
      return Promise.resolve(false);
    }
    return updateArticle(article.id, { content: html })
      .then(() => { setBodyDirty(false); toast.success('Content saved'); return true; })
      .catch(() => false); // error toast handled in useArticleMutations
  };

  /** Discards unsaved edits — restores the editor DOM to the last saved
   *  content. (Reverting to an older VERSION lives in the header History
   *  menu / Revert button and goes through restoreVersion.) */
  const revertBody = () => {
    const container = contentRef.current;
    const innerDiv = container?.querySelector('[data-content-inner]') as HTMLElement | null;
    if (!innerDiv) return;
    innerDiv.innerHTML = cleanContent(article.content || '');
    setBodyDirty(false);
    toast.success('Unsaved changes discarded', { description: 'The body is back to the last saved content.' });
  };

  // Register the actions while the Content Preview tab is mounted; the header
  // buttons disable themselves when there's nothing registered/dirty.
  useEffect(() => {
    if (article.content) {
      onRegisterBodyActions?.({ save: saveBody, revert: revertBody });
    } else {
      onRegisterBodyActions?.(null);
    }
    return () => {
      onRegisterBodyActions?.(null);
      onBodyDirtyChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, article.content, onRegisterBodyActions]);

  // Page-template selection (CMS-47): record the choice on the article and,
  // when the article body is still empty, pre-seed the template's section
  // structure (H2s + placeholders + element shortcodes). Existing content is
  // never overwritten.
  const handleTemplateSelect = async (template: PageTemplate) => {
    try {
      const hasContent = !!article.content && article.content.trim().length > 0;
      await updateArticle(article.id, {
        pageTemplateId: template.id,
        ...(hasContent ? {} : { content: buildTemplateSkeletonHtml(template) }),
      });
      toast.success(`Template applied: ${template.name}`, {
        description: hasContent
          ? 'Layout recorded on the article — existing content left untouched.'
          : 'Section structure pre-seeded into the article body.',
      });
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  // Shared with the Insert iFrame / Embed Social Post buttons — capture the
  // caret before the button click steals focus from the contentEditable
  const saveCaret = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = contentRef.current;
      if (container && container.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  // Insert an HTML block at the saved caret position (falls back to appending
  // at the end of the content) — shared by Embed Social Post and Add Video.
  const insertHtmlAtCaret = (html: string, successMsg: string) => {
    const container = contentRef.current;
    const range = savedRangeRef.current;
    if (container && range && container.contains(range.startContainer)) {
      const selection = window.getSelection();
      if (selection) {
        container.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        range.deleteContents();
        const fragment = range.createContextualFragment(html);
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        const innerDiv = container.querySelector('[data-content-inner]') as HTMLElement;
        const newHtml = innerDiv ? innerDiv.innerHTML : container.innerHTML;
        updateArticle(article.id, { content: newHtml }).catch(() => {});
        toast.success(successMsg);
        savedRangeRef.current = null;
        return;
      }
    }

    // Fallback: append at end of content
    const currentContent = article.content || '';
    updateArticle(article.id, { content: `${currentContent}\n${html}` }).catch(() => {});
    toast.success(`${successMsg} at end of content`);
    savedRangeRef.current = null;
  };

  // ── iFrame embeds (iFrame Manager) ─────────────────────────────────────────
  // Iframes inside the editor are pointer-events:none (class on the editable
  // below), so clicks on them reach this handler; the hit-test is done by
  // bounding rect. Only OUR embeds (src containing '/iframe/') are handled —
  // video iframes are left alone.
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = contentRef.current;
    if (!container) return;
    const hit = Array.from(container.querySelectorAll('iframe[src*="/iframe/"]')).find((f) => {
      const r = f.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (!hit) {
      setActiveIframe(null);
      return;
    }
    const id = extractInstanceIdFromSrc(hit.getAttribute('src') ?? '');
    if (!id) {
      setActiveIframe(null);
      return;
    }
    e.preventDefault();
    const rect = hit.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setActiveIframe({
      id,
      top: rect.bottom - containerRect.top + 6,
      left: Math.max(0, rect.left - containerRect.left),
    });
  };

  const persistContentNow = () => {
    const container = contentRef.current;
    if (!container) return Promise.resolve();
    const innerDiv = container.querySelector('[data-content-inner]') as HTMLElement;
    const newHtml = innerDiv ? innerDiv.innerHTML : container.innerHTML;
    return updateArticle(article.id, { content: newHtml });
  };

  // CMS-150 — WordPress-style block drag-and-drop over the body's top-level
  // blocks (headings, paragraphs, photo slots, tables, template placeholders):
  // drag handle on hover, insertion line while dragging, drop to reorder.
  // Drops persist immediately, matching the iframe insert/delete flows.
  const blockDnd = useBlockDragAndDrop({
    containerRef: contentRef,
    enabled: !!article.content,
    onReorder: (newHtml) => {
      updateArticle(article.id, { content: newHtml })
        .then(() => toast.success('Section moved'))
        .catch(() => {});
    },
  });

  const findEmbedNode = (id: string): Element | null => {
    const container = contentRef.current;
    if (!container) return null;
    const iframe = Array.from(container.querySelectorAll('iframe')).find((f) =>
      (f.getAttribute('src') ?? '').includes(`/iframe/${id}`)
    );
    return iframe ? (iframe.closest('figure') ?? iframe) : null;
  };

  // After an edit, swap the embed node for the fresh server-built HTML (height
  // may have changed with the card count) and persist.
  const handleIframeUpdated = (embedHtml: string) => {
    const id = editIframeId;
    setEditIframeId(null);
    setActiveIframe(null);
    if (!id) return;
    const node = findEmbedNode(id);
    if (!node) return;
    const template = document.createElement('template');
    template.innerHTML = embedHtml.trim();
    const replacement = template.content.firstElementChild;
    if (replacement) {
      node.replaceWith(replacement);
      persistContentNow().catch(() => {});
    }
  };

  const handleIframeDelete = async () => {
    const id = deleteIframeId;
    setDeleteIframeId(null);
    setActiveIframe(null);
    if (!id) return;
    const node = findEmbedNode(id);
    if (node) {
      node.remove();
      await persistContentNow().catch(() => {});
    }
    try {
      await iframeService.deleteInstance({ instanceId: id, stripFromHosts: true });
      toast.success('iFrame deleted');
    } catch {
      toast.error('Embed removed, but deleting the iFrame instance failed — remove it from the iFrame Manager.');
    }
  };
  // Derived from the article — Webflow state is owned by the publish flow, not
  // a local dropdown.
  const webflowStatus: 'Draft' | 'Published' = article.webflowItemId ? 'Published' : 'Draft';
  const canSync = article.status === 'Approved' || article.status === 'Published';

  const handleGenerateDraft = async () => {
    try {
      const brief = article.researchBrief;
      const selected = new Set(brief?.selectedFindings || []);
      const findings = (brief?.findings || []).filter(f => selected.size === 0 || selected.has(f.id));
      await generateDraft({
        articleId: article.id,
        researchFindings: findings,
        seoContext: {
          targetKeyword: article.targetKeyword,
          searchVolume: article.seoResearch?.metrics?.searchVolume || 0,
          competitorAnalysis: [],
        },
      });
      toast.success('Draft generation started', { description: 'The AI draft will appear here shortly.' });
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  const saveMetaField = async (field: 'title' | 'desc' | 'slug') => {
    setEditingField(null);
    const updates: { metaTitle?: string; metaDescription?: string; slug?: string } = {};
    if (field === 'title') updates.metaTitle = metaTitle;
    if (field === 'desc') updates.metaDescription = metaDesc;
    if (field === 'slug') updates.slug = slug;
    try {
      await updateArticle(article.id, updates);
      toast.success('Saved');
    } catch {
      toast.error('Failed to save — please try again.');
    }
  };

  const aiShortenDesc = () => {
    // Truncate to 155 chars at last word boundary
    if (metaDesc.length <= 160) return;
    const shortened = metaDesc.slice(0, 155).replace(/\s+\S*$/, '').trim();
    setMetaDesc(shortened);
    toast.success('Description shortened by AI');
  };

  // Real sync: re-runs the publish flow, which updates the existing Webflow
  // item (PATCH when webflowItemId exists) with the current content and meta.
  const handleSync = async () => {
    if (!canSync) {
      toast.error('Article must be Approved or Published to sync to Webflow.');
      return;
    }
    setSyncing(true);
    try {
      const result = await publishToWebflow(article.id);
      // CMS-113: surface a thumbnail transfer failure on re-sync too.
      if (result.featuredImageWarning) {
        toast.warning('Synced — but the thumbnail did not transfer', {
          description: result.featuredImageWarning,
          duration: 12000,
        });
      } else {
        toast.success('Synced to Webflow');
      }
    } catch (err) {
      toast.error('Webflow sync failed', { description: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const metaDescOver = metaDesc.length > 160;

  return (
    <div className="space-y-4">
      {/* Webflow toolbar — with status dropdown like Lovable */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] border-0 ${
            webflowStatus === 'Published' ? 'bg-success/15 text-success' :
            (webflowStatus as string) === 'Staged' ? 'bg-accent/15 text-accent' :
            'bg-muted text-muted-foreground'
          }`}>
            {webflowStatus === 'Published' ? '🌐' : '📝'} Webflow: {webflowStatus}
          </Badge>
        </div>
        <Button size="sm" className="h-8 text-[11px] gap-2" onClick={() => window.open('https://webflow.com/dashboard', '_blank')}>
          <Globe className="w-3.5 h-3.5" /> Edit in Webflow
        </Button>
      </div>

      {/* Sync status bar */}
      <div className="bg-muted/30 rounded-lg px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Last synced: {article.updatedAt ? <TimeAgo date={article.updatedAt} className="font-medium text-card-foreground" /> : 'Never'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleSync} disabled={syncing || !canSync} title={canSync ? undefined : 'Article must be Approved or Published to sync'}>
            <RotateCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Meta info — inline editable like Lovable */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-3">
        {/* Meta Title */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              Meta Title <span className={metaTitle.length > 60 ? 'text-destructive' : 'text-card-foreground'}>({metaTitle.length}/60 chars)</span>
            </p>
          </div>
          {editingField === 'title' ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="h-8 text-[12px] flex-1" autoFocus />
              <button onClick={() => saveMetaField('title')} className="w-7 h-7 rounded bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <p className="text-[12px] font-medium text-card-foreground mt-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors group flex items-center gap-1" onClick={() => setEditingField('title')}>
              <span>{metaTitle || 'Click to add meta title...'}</span>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </p>
          )}
        </div>

        {/* Meta Description */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              Meta Description <span className={metaDescOver ? 'text-destructive' : 'text-card-foreground'}>({metaDesc.length}/160 chars)</span>
            </p>
            {metaDescOver && editingField !== 'desc' && (
              <Button variant="ghost" size="sm" className="h-5 text-[9px] text-primary gap-0.5 px-1.5" onClick={aiShortenDesc}>
                <RotateCw className="w-2.5 h-2.5" /> AI Shorten
              </Button>
            )}
          </div>
          {editingField === 'desc' ? (
            <div className="mt-1 space-y-1.5">
              <Textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} className="text-[12px] min-h-[60px]" autoFocus />
              <div className="flex items-center gap-1.5">
                <button onClick={() => saveMetaField('desc')} className="w-7 h-7 rounded bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></button>
                {metaDescOver && (
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={aiShortenDesc}>
                    <RotateCw className="w-3 h-3" /> AI Shorten
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className={`text-[12px] mt-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors group flex items-start gap-1 ${metaDescOver ? 'text-destructive' : 'text-card-foreground'}`} onClick={() => setEditingField('desc')}>
              <span>{metaDesc || 'Click to add meta description...'}</span>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
            </p>
          )}
        </div>

        {/* Slug + Schema */}
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Slug</p>
            {editingField === 'slug' ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Input value={slug} onChange={e => setSlug(e.target.value)} className="h-7 text-[11px] flex-1" autoFocus />
                <button onClick={() => saveMetaField('slug')} className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></button>
              </div>
            ) : (
              <p className="text-[11px] text-primary mt-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors group flex items-center gap-1" onClick={() => setEditingField('slug')}>
                <span>/{slug || 'click-to-set-slug'}</span>
                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </p>
            )}
          </div>
          {article.schemaMarkup && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Schema</p>
              <p className="text-[11px] text-card-foreground mt-0.5">Article + FAQ</p>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail / Featured Image (CMS-13) */}
      <ThumbnailSection article={article} />

      {/* Images used by the researched source articles (CMS-53) */}
      <SourceImagesSection article={article} />

      {/* Article content — Page Template + Insert Element buttons + editable with AI rewrite toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {/* Page-template library (CMS-47) — sits before Insert Element and is
            also available while the article body is still empty */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
          onClick={() => setTemplatePickerOpen(true)}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          {currentTemplate ? 'Page Template' : 'Choose Page Template'}
        </Button>
        {currentTemplate && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5">
            {currentTemplate.name}
          </Badge>
        )}
      {article.content && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1.5"
            onMouseDown={saveCaret}
            onClick={() => setIframePickerOpen(true)}
          >
            <Frame className="w-3.5 h-3.5" />
            Insert iFrame
          </Button>
          {/* Transfer Partner Table embeds (stand-alone filtered cheat sheet) */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1.5"
            onMouseDown={saveCaret}
            onClick={() => setTpTablePickerOpen(true)}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Insert TP Table
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1.5"
            onMouseDown={saveCaret}
            onClick={() => setEmbedPickerOpen(true)}
          >
            <Share2 className="w-3.5 h-3.5" />
            Embed Social Post
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1.5"
            onMouseDown={saveCaret}
            onClick={() => setVideoPickerOpen(true)}
          >
            <Video className="w-3.5 h-3.5" />
            Add Video
          </Button>
          {/* CMS-96 — insert an image anywhere in the article body */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1.5"
            onMouseDown={saveCaret}
            onClick={() => setImagePickerOpen(true)}
          >
            <ImagePlus className="w-3.5 h-3.5" />
            Add Image
          </Button>
        </>
      )}
      </div>
      <div className="relative" ref={contentRef} {...blockDnd.containerProps}>
        <ContentEditToolbar
          containerRef={contentRef}
          articleId={article.id}
          onContentUpdated={(newContent) => {
            updateArticle(article.id, { content: newContent }).catch(() => {});
          }}
        />
        {/* CMS-176: the format bar sticks to the top of the scroll viewport
            so formatting stays reachable anywhere in a long article. */}
        {article.content && <ContentFormatBar containerRef={contentRef} sticky />}
        <div
          key={article.content ? article.content.length : 'empty'}
          className="bg-card rounded-xl border border-border/70 shadow-card p-6 prose prose-sm max-w-none text-card-foreground overflow-x-hidden break-words focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all [&_iframe]:pointer-events-none"
          contentEditable={!!article.content}
          suppressContentEditableWarning
          onClick={handleContentClick}
          // CMS-152: typing only marks the body dirty — saving is manual via
          // the header Save button; closing with unsaved edits prompts a
          // "changes haven't been saved" warning. No auto-save on blur.
          onInput={() => setBodyDirty(true)}
        >
          {article.content ? (
            <div data-content-inner dangerouslySetInnerHTML={{ __html: cleanContent(article.content) }} />
          ) : (
            <div className="text-center py-12 px-6 text-muted-foreground bg-gradient-to-r from-accent/10 to-transparent border border-accent/20 rounded-xl animate-fade-in" contentEditable={false}>
              <FileText className="w-10 h-10 mx-auto mb-2 text-accent/40" />
              <p className="text-[14px] font-semibold text-foreground">No content generated yet</p>
              <p className="text-xs mt-1">Content will appear here after the AI writing agent generates a draft</p>
              <Button
                className="mt-4"
                size="sm"
                onClick={handleGenerateDraft}
                disabled={draftLoading.generateDraft}
              >
                {draftLoading.generateDraft
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating…</>
                  : <><Sparkles className="w-3.5 h-3.5 mr-1" /> Generate Draft</>}
              </Button>
            </div>
          )}
        </div>
        {article.content && (
          <p className="text-[9px] text-muted-foreground mt-1.5 px-1">
            Click to edit directly · Select text to rewrite with AI · Hover a block and drag the handle to reorder sections · Click an iFrame to edit or delete it · Changes are only saved when you press Save (top right)
          </p>
        )}

        {/* CMS-150 block drag handle — floats over the hovered top-level body
            block; drag it to reorder blocks (drop indicator below). Rendered
            outside the contentEditable so it never lands in the saved HTML. */}
        {blockDnd.handle && (
          <button
            type="button"
            {...{ [BLOCK_DRAG_HANDLE_ATTR]: 'true' }}
            {...blockDnd.handleProps}
            className="absolute z-10 w-5 h-5 rounded border border-border bg-popover shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:border-accent/50"
            style={{ top: blockDnd.handle.top, left: blockDnd.handle.left }}
            title="Drag to reorder this section"
            aria-label="Drag to reorder this section"
          >
            <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
          </button>
        )}
        {blockDnd.indicator && (
          <div
            className="absolute z-10 h-0.5 rounded bg-accent pointer-events-none"
            style={{ top: blockDnd.indicator.top, left: 24, right: 24 }}
          />
        )}

        {/* iFrame embed actions — appears when an embedded iFrame is clicked */}
        {activeIframe && (
          <div
            data-rewrite-toolbar
            className="absolute z-20 flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-md"
            style={{ top: activeIframe.top, left: activeIframe.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="px-1.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <Frame className="w-3 h-3" />
              iFrame
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={() => {
                setEditIframeId(activeIframe.id);
                setActiveIframe(null);
              }}
            >
              <Pencil className="w-3 h-3" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 text-destructive hover:text-destructive"
              onClick={() => setDeleteIframeId(activeIframe.id)}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Page Template Library (CMS-47) */}
      <TemplateLibraryModal
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        currentTemplateId={article.pageTemplateId}
        onSelect={handleTemplateSelect}
      />

      {/* Insert iFrame — dynamic embeds rendered live from Card Data Manager data */}
      <IframeInsertModal
        open={iframePickerOpen}
        onOpenChange={setIframePickerOpen}
        host={{ collection: 'articles', docId: article.id, field: 'content' }}
        onInserted={(html) => insertHtmlAtCaret(html, 'Inserted iFrame')}
      />

      {/* Transfer Partner Table — filtered cheat-sheet embed rendered live from the matrix */}
      <TpTableInsertModal
        open={tpTablePickerOpen}
        onOpenChange={setTpTablePickerOpen}
        host={{ collection: 'articles', docId: article.id, field: 'content' }}
        onInserted={(html) => insertHtmlAtCaret(html, 'Inserted Transfer Partner Table')}
      />

      {/* Edit iFrame — opened from the embed's click popover */}
      <IframeInsertModal
        open={editIframeId !== null}
        onOpenChange={(open) => {
          if (!open) setEditIframeId(null);
        }}
        editInstanceId={editIframeId}
        onUpdated={handleIframeUpdated}
      />

      {/* Delete iFrame — removes the embed AND the instance (warns first) */}
      <AlertDialog open={deleteIframeId !== null} onOpenChange={(open) => { if (!open) setDeleteIframeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this iFrame?</AlertDialogTitle>
            <AlertDialogDescription>
              The embed is removed from this article and the iFrame instance is deleted — it
              disappears from the iFrame Manager audit screen and stops rendering anywhere else
              it appears. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleIframeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete iFrame
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Embed Social Post picker — inserts a script-less iframe / link card built from the item's permalink */}
      <EmbedSocialPostDialog
        open={embedPickerOpen}
        onOpenChange={setEmbedPickerOpen}
        onEmbed={(item) => {
          const embedHtml = buildSocialEmbedHtml(item);
          if (!embedHtml) return;
          const label = item.title || item.sourceUrl || 'social post';
          insertHtmlAtCaret(embedHtml, `Embedded ${label}`);
        }}
      />

      {/* Add Video picker — inserts a Webflow-safe script-less iframe block */}
      <AddVideoDialog
        open={videoPickerOpen}
        onOpenChange={setVideoPickerOpen}
        onInsert={(html, label) => insertHtmlAtCaret(html, `Added video: ${label}`)}
      />

      {/* Add Image (CMS-96) — inserts a <figure><img> block at the caret */}
      <AddImageDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        articleId={article.id}
        onInsert={(html, label) => insertHtmlAtCaret(html, `Added image: ${label}`)}
      />
    </div>
  );
}

// === SEO Checklist Tab ===
function SEOChecklistTab({ article }: { article: PipelineArticle }) {
  // SEO checklist is derived from article content analysis — show real status or empty state
  if (!article.content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">SEO checklist not yet available</p>
        <p className="text-xs text-muted-foreground mt-1">The checklist will be populated when an article draft is generated</p>
      </div>
    );
  }

  // Real content analysis
  const content = cleanContent(article.content);
  const plainText = content.replace(/<[^>]+>/g, '');
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const keyword = article.targetKeyword?.toLowerCase() || '';

  // Meta title checks
  const metaTitleLen = article.metaTitle?.length || 0;
  const metaTitleHasKeyword = keyword && article.metaTitle?.toLowerCase().includes(keyword);
  const metaTitleGoodLength = metaTitleLen >= 30 && metaTitleLen <= 60;

  // Meta description checks
  const metaDescLen = article.metaDescription?.length || 0;
  const metaDescHasKeyword = keyword && article.metaDescription?.toLowerCase().includes(keyword);
  const metaDescGoodLength = metaDescLen >= 100 && metaDescLen <= 160;

  // Content checks
  const h2Count = (content.match(/<h2/gi) || []).length;
  const h3Count = (content.match(/<h3/gi) || []).length;
  const hasLists = content.includes('<ul>') || content.includes('<ol>');
  const hasFAQ = content.toLowerCase().includes('faq') || content.includes('frequently asked');
  const hasSchema = !!article.schemaMarkup;
  const hasSlug = !!article.slug;

  // Keyword density
  const keywordCount = keyword ? (plainText.toLowerCase().match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length : 0;
  const keywordDensity = keyword && wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
  const goodDensity = keywordDensity >= 0.5 && keywordDensity <= 2.5;

  // Internal links
  const internalLinks = (content.match(/href=["'][^"']*elitetravelhackers|href=["']\//gi) || []).length;

  const items = [
    { label: `Meta title${metaTitleLen > 0 ? ` (${metaTitleLen}/60 chars)` : ' missing'}`, passed: metaTitleGoodLength, detail: !metaTitleGoodLength ? 'Should be 30-60 characters' : undefined },
    { label: `Meta title contains keyword`, passed: !!metaTitleHasKeyword, detail: !metaTitleHasKeyword ? `"${keyword}" not found in meta title` : undefined },
    { label: `Meta description${metaDescLen > 0 ? ` (${metaDescLen}/160 chars)` : ' missing'}`, passed: metaDescGoodLength, detail: !metaDescGoodLength ? 'Should be 100-160 characters' : undefined },
    { label: `Meta description contains keyword`, passed: !!metaDescHasKeyword, detail: !metaDescHasKeyword ? `"${keyword}" not found in meta description` : undefined },
    { label: 'URL slug generated', passed: hasSlug },
    { label: 'Schema markup generated', passed: hasSchema },
    { label: 'Target keyword set', passed: !!keyword },
    { label: `Keyword density${keyword ? ` (${keywordDensity.toFixed(1)}%)` : ''}`, passed: goodDensity, detail: !goodDensity ? 'Should be 0.5-2.5%' : undefined },
    { label: `H2 headings (${h2Count} found)`, passed: h2Count >= 3, detail: h2Count < 3 ? 'Recommended: 3+ H2 headings' : undefined },
    { label: `H3 sub-headings (${h3Count} found)`, passed: h3Count >= 2, detail: h3Count < 2 ? 'Recommended: 2+ H3 headings' : undefined },
    { label: `Word count (${wordCount.toLocaleString()})`, passed: wordCount >= 1500, detail: wordCount < 1500 ? 'Recommended: 1500+ words' : undefined },
    { label: 'Contains lists (ul/ol)', passed: hasLists, detail: !hasLists ? 'Add bullet or numbered lists for readability' : undefined },
    { label: 'FAQ section present', passed: hasFAQ, detail: !hasFAQ ? 'Add FAQ section for People Also Ask coverage' : undefined },
    { label: `Internal links (${internalLinks} found)`, passed: internalLinks >= 3, detail: internalLinks < 3 ? 'Recommended: 3+ internal links per article' : undefined },
  ];

  const passed = items.filter(i => i.passed).length;
  const score = Math.round((passed / items.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <QualityScoreRing score={score} size={48} />
        <div>
          <p className="text-[14px] font-display font-semibold tracking-tight text-card-foreground tabular-nums">SEO Score: {score}/100</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">{passed} of {items.length} checks passed</p>
        </div>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-muted/30 border-b border-border/40 last:border-0 transition-colors duration-150">
          {item.passed ? (
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          )}
          <div>
            <span className={`text-[12px] ${item.passed ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>{item.label}</span>
            {item.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// === Links Audit Tab ===
type AuditLink = { id: string; anchor: string; url: string; type: 'Affiliate' | 'Internal' | 'External'; action: 'keep' | 'modify' | 'remove' };

function LinksAuditTab({ article }: { article: PipelineArticle }) {
  const { articles: allArticles } = useArticles();
  const [manualLinks, setManualLinks] = useState<AuditLink[]>([]);
  const [actions, setActions] = useState<Record<string, 'keep' | 'modify' | 'remove'>>({});
  const [showSitemapBrowser, setShowSitemapBrowser] = useState(false);
  const [sitemapSearch, setSitemapSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState<{ title: string; slug: string } | null>(null);
  const [newAnchor, setNewAnchor] = useState('');
  const [newPlacement, setNewPlacement] = useState('');
  const [newLinkType, setNewLinkType] = useState<'Internal' | 'Affiliate'>('Internal');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Extract links from HTML content
  const extractedLinks: AuditLink[] = [];
  if (article.content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanContent(article.content), 'text/html');
    const anchorEls = doc.querySelectorAll('a[href]');
    anchorEls.forEach((a, i) => {
      const url = a.getAttribute('href') || '';
      const isInternal = url.startsWith('/') || url.includes('elitetravelhackers');
      const isAffiliate = url.includes('referyour') || url.includes('affiliate') || url.includes('partner');
      extractedLinks.push({
        id: `link-${i}`,
        anchor: a.textContent?.trim() || url,
        url,
        type: isAffiliate ? 'Affiliate' : isInternal ? 'Internal' : 'External',
        action: 'keep',
      });
    });
  }

  const links = [...extractedLinks, ...manualLinks].map(l => ({ ...l, action: actions[l.id] || l.action }));

  const internalCount = links.filter(l => l.type === 'Internal').length;
  const affiliateCount = links.filter(l => l.type === 'Affiliate').length;
  const externalCount = links.filter(l => l.type === 'External').length;
  const flaggedCount = links.filter(l => l.action === 'remove').length;

  // Sitemap built from real published articles, grouped by topic cluster
  const sitemapPages = (() => {
    const published = allArticles.filter(a => a.status === 'Published' && a.id !== article.id);
    const groups = new Map<string, Array<{ title: string; slug: string }>>();
    published.forEach(a => {
      const cat = a.topicCluster || 'Articles';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push({ title: a.title, slug: a.slug ? `/${a.slug}` : a.publishedUrl || `/${a.id}` });
    });
    return Array.from(groups.entries()).map(([category, pages]) => ({ category, pages }));
  })();

  const filteredSitemap = sitemapSearch
    ? sitemapPages.map(cat => ({
        ...cat,
        pages: cat.pages.filter(p => p.title.toLowerCase().includes(sitemapSearch.toLowerCase()) || p.slug.toLowerCase().includes(sitemapSearch.toLowerCase())),
      })).filter(cat => cat.pages.length > 0)
    : sitemapPages;

  const handleSelectPage = (page: { title: string; slug: string }) => {
    setSelectedPage(page);
    setNewAnchor(page.title);
    setNewPlacement('');
    setNewLinkType('Internal');
  };

  const handleAddManualLink = () => {
    if (!selectedPage || !newAnchor) return;
    setManualLinks(prev => [...prev, {
      id: `manual-${Date.now()}`,
      anchor: newAnchor,
      url: selectedPage.slug,
      type: newLinkType,
      action: 'keep',
    }]);
    setSelectedPage(null);
    setNewAnchor('');
    setShowSitemapBrowser(false);
    setSitemapSearch('');
    toast.success('Link added');
  };

  const typeStyles = { Affiliate: 'bg-success/15 text-success', Internal: 'bg-accent/15 text-accent', External: 'bg-muted text-muted-foreground' };

  return (
    <div className="space-y-5">
      {/* AI AUTO-GENERATED LINKS */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[14px] font-semibold tracking-tight text-card-foreground">AI Auto-Generated Links</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-medium text-accent">{internalCount} Internal</span>
            <span className="text-[11px] font-medium text-success">{affiliateCount} Affiliate</span>
            <span className="text-[11px] font-medium text-muted-foreground">{externalCount} External</span>
            {flaggedCount > 0 && <span className="text-[11px] font-medium text-destructive">{flaggedCount} Flagged</span>}
          </div>
        </div>

        {links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <LinkIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No links to audit yet</p>
            <p className="text-xs text-muted-foreground mt-1">Links will be extracted and audited when the article content is generated</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_1fr_70px_80px] items-center px-3 py-2 gap-2">
              {['Anchor Text', 'URL', 'Type', 'Action'].map(h => (
                <span key={h} className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{h}</span>
              ))}
            </div>
            {links.map(link => (
              <div key={link.id} className={`grid grid-cols-[1fr_1fr_70px_80px] items-center px-3 py-2.5 gap-2 rounded-lg hover:bg-muted/30 transition-colors ${link.action === 'remove' ? 'bg-destructive/5' : ''}`}>
                <span className="text-[12px] text-card-foreground font-medium truncate">{link.anchor}</span>
                <span className="text-[11px] text-primary truncate">{link.url}</span>
                <Badge className={`text-[9px] border-0 ${typeStyles[link.type]}`}>{link.type}</Badge>
                <select value={link.action} onChange={e => setActions(prev => ({ ...prev, [link.id]: e.target.value as 'keep' | 'modify' | 'remove' }))} className="h-7 rounded border border-input bg-background px-1.5 text-[11px]">
                  <option value="keep">Keep</option>
                  <option value="modify">Modify</option>
                  <option value="remove">Remove</option>
                </select>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ADD MANUAL LINK */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-semibold tracking-tight text-card-foreground">Add Manual Link</p>
          <Button
            variant={showSitemapBrowser ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-[11px] gap-1.5"
            onClick={() => { setShowSitemapBrowser(!showSitemapBrowser); setSelectedPage(null); }}
          >
            <Plus className="w-3.5 h-3.5" /> {showSitemapBrowser ? 'Close Sitemap' : 'Add Link'}
          </Button>
        </div>

        {showSitemapBrowser && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-border">
              <Input
                value={sitemapSearch}
                onChange={e => setSitemapSearch(e.target.value)}
                className="h-8 text-[12px]"
                placeholder="Search your site pages..."
              />
            </div>

            {/* Sitemap tree from published articles */}
            <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
              {filteredSitemap.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-6">No published pages found to link to</p>
              )}
              {filteredSitemap.map(cat => (
                <div key={cat.category}>
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-card-foreground hover:bg-muted/30 transition-colors"
                  >
                    <span>{cat.category} ({cat.pages.length})</span>
                    {expandedCategory === cat.category ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {(expandedCategory === cat.category || sitemapSearch) && cat.pages.map(page => (
                    <button
                      key={page.slug}
                      onClick={() => handleSelectPage(page)}
                      className={`w-full flex items-center gap-3 px-4 pl-6 py-2 text-left hover:bg-muted/30 transition-colors ${selectedPage?.slug === page.slug ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-card-foreground truncate">{page.title}</p>
                        <p className="text-[10px] text-primary truncate">{page.slug}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Selected page config */}
            {selectedPage && (
              <div className="p-3 border-t border-border space-y-2.5 bg-muted/20">
                <p className="text-[11px] font-semibold text-card-foreground">Linking to: <span className="text-primary">{selectedPage.title}</span></p>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Anchor Text</label>
                  <Input value={newAnchor} onChange={e => setNewAnchor(e.target.value)} className="h-7 text-[11px]" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Placement</label>
                  <select value={newPlacement} onChange={e => setNewPlacement(e.target.value)} className="h-7 w-full rounded border border-input bg-background px-2 text-[11px]">
                    <option value="">Select placement...</option>
                    <option value="p1">Insert after paragraph 1</option>
                    <option value="p2">Insert after paragraph 2</option>
                    <option value="p3">Insert after paragraph 3</option>
                    <option value="p4">Insert after paragraph 4</option>
                    <option value="p5">Insert after paragraph 5</option>
                    <option value="replace">Replace highlighted text in article</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block mb-1">Link Type</label>
                    <select value={newLinkType} onChange={e => setNewLinkType(e.target.value as 'Internal' | 'Affiliate')} className="h-7 rounded border border-input bg-background px-2 text-[11px]">
                      <option value="Internal">Internal</option>
                      <option value="Affiliate">Affiliate</option>
                    </select>
                  </div>
                  <div className="flex-1" />
                  <Button size="sm" className="h-8 text-[11px] gap-1 bg-primary text-primary-foreground mt-4" onClick={handleAddManualLink}>
                    <Plus className="w-3 h-3" /> Add Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI LINK SUGGESTIONS */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[14px] font-semibold tracking-tight text-card-foreground">AI Link Suggestions</p>
        </div>
        <p className="text-[11px] text-muted-foreground italic text-center py-2">AI link suggestions will appear here once the article content has been analyzed</p>
      </div>
    </div>
  );
}

// === Compliance Tab ===
function ComplianceTab({ article }: { article: PipelineArticle }) {
  const [rerunning, setRerunning] = useState(false);
  const [localResults, setLocalResults] = useState<{ ftc: boolean; terms: boolean; disclaimer: boolean } | null>(null);
  const { updateArticle } = useArticleMutations();

  // Run compliance check against article content
  const runComplianceCheck = () => {
    const content = article.content ? cleanContent(article.content).toLowerCase() : '';

    // FTC Disclosure: check for common disclosure patterns
    const ftcPatterns = ['affiliate', 'compensation', 'commission', 'editorial disclosure', 'we may earn', 'we earn a commission', 'paid partnership'];
    const hasFtc = ftcPatterns.some(p => content.includes(p));

    // Disclaimer: check for standard financial disclaimers
    const disclaimerPatterns = ['not financial advice', 'consult a financial', 'your own research', 'terms and conditions apply', 'rates and fees', 'information is accurate'];
    const hasDisclaimer = disclaimerPatterns.some(p => content.includes(p));

    // Card terms: check if card names mentioned can be verified (simplified — checks if card data exists)
    const cardMentions = ['chase sapphire', 'amex platinum', 'capital one venture', 'citi premier'];
    const mentionsCards = cardMentions.some(c => content.includes(c));
    // If no card mentions, terms are "verified" (nothing to verify)
    const termsVerified = !mentionsCards || (article.compliance?.cardTermsVerified ?? false);

    return { ftc: hasFtc, terms: termsVerified, disclaimer: hasDisclaimer };
  };

  const results = localResults || (() => {
    // Use stored compliance data if available, otherwise run check
    if (article.compliance) {
      return { ftc: article.compliance.ftcDisclosure, terms: article.compliance.cardTermsVerified, disclaimer: article.compliance.disclaimerPresent };
    }
    if (article.content) {
      return runComplianceCheck();
    }
    return { ftc: false, terms: false, disclaimer: false };
  })();

  const items = [
    { label: 'FTC Disclosure Present', description: 'Affiliate disclosure is visible at the top of the article', passed: results.ftc },
    { label: 'Card Terms Verified', description: 'All card terms, fees, and bonus offers match issuer data', passed: results.terms },
    { label: 'Disclaimer Present', description: 'Standard financial disclaimer is included', passed: results.disclaimer },
  ];

  const allPassed = items.every(i => i.passed);
  const failedCount = items.filter(i => !i.passed).length;

  const handleRerun = async () => {
    setRerunning(true);
    // Re-analyze content
    const newResults = runComplianceCheck();
    setLocalResults(newResults);

    // Persist to Firestore
    try {
      await updateArticle(article.id, {
        compliance: {
          ftcDisclosure: newResults.ftc,
          cardTermsVerified: newResults.terms,
          disclaimerPresent: newResults.disclaimer,
          lastCheckedAt: new Date().toISOString(),
        },
      });
      toast.success('Compliance check completed', {
        description: newResults.ftc && newResults.terms && newResults.disclaimer
          ? 'All checks passed'
          : `${[!newResults.ftc && 'FTC disclosure', !newResults.terms && 'Card terms', !newResults.disclaimer && 'Disclaimer'].filter(Boolean).join(', ')} need attention`,
      });
    } catch {
      toast.error('Failed to save compliance results');
    }
    setRerunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg flex-1 mr-3 ${allPassed ? 'bg-success/10 border border-success/20' : 'bg-destructive/5 border border-destructive/20'}`}>
          {allPassed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <AlertTriangle className="w-5 h-5 text-destructive" />}
          <span className={`text-[13px] font-semibold ${allPassed ? 'text-success' : 'text-destructive'}`}>
            {allPassed ? 'All Compliance Checks Passed' : `Issues Found — ${failedCount} Item${failedCount !== 1 ? 's' : ''} Need${failedCount === 1 ? 's' : ''} Attention`}
          </span>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 shrink-0" onClick={handleRerun} disabled={rerunning}>
          <RotateCw className={`w-3 h-3 ${rerunning ? 'animate-spin' : ''}`} />
          {rerunning ? 'Checking...' : 'Re-run Compliance Check'}
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={`p-3 rounded-lg border ${item.passed ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
            <div className="flex items-center gap-2">
              {item.passed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-destructive" />}
              <span className={`text-[12px] font-semibold ${item.passed ? 'text-success' : 'text-destructive'}`}>{item.label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 ml-6">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Card terms verification */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60"><p className="text-[13px] font-semibold text-card-foreground">Card Terms Verification</p></div>
        <p className="text-[11px] text-muted-foreground italic text-center py-4 px-4">Card terms comparisons will appear here once the article content has been verified against card data</p>
      </div>
    </div>
  );
}

// === Post-Publish Tab ===
function PostPublishTab({ article }: { article: PipelineArticle }) {
  if (article.status !== 'Published') {
    return <p className="text-sm text-muted-foreground py-8 text-center">Post-publish verification will appear after the article is published</p>;
  }

  // Real checks based on article publish state
  const hasPublishedUrl = !!article.publishedUrl;
  const hasWebflowId = !!article.webflowItemId;
  const hasSchema = !!article.schemaMarkup;

  const checks = [
    { label: 'Published to Webflow', passed: hasWebflowId },
    { label: 'Live URL accessible', passed: hasPublishedUrl },
    { label: 'Schema markup included', passed: hasSchema },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-success" />
        <span className="text-sm font-semibold text-success">Published</span>
        {article.publishedUrl && (
          <a href={article.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
            View Live <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div>
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/30 border-b border-border/40 last:border-0 transition-colors duration-150">
            {check.passed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
            <span className="text-[12px] text-card-foreground">{check.label}</span>
          </div>
        ))}
      </div>

      {/* Reader Engagement */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60"><p className="text-[13px] font-semibold text-card-foreground">Reader Engagement</p></div>
        <p className="text-[11px] text-muted-foreground italic text-center py-5 px-4">Engagement metrics (page views, scroll depth, time on page) will appear once analytics data is connected</p>
      </div>

      {/* Traffic Sources */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60"><p className="text-[13px] font-semibold text-card-foreground">Traffic Sources</p></div>
        <p className="text-[11px] text-muted-foreground italic text-center py-5 px-4">Traffic source breakdown will appear once analytics data is connected</p>
      </div>
    </div>
  );
}

// === Version History Tab ===
function VersionHistoryTab({ versions, loading: versionsLoading, articleId }: { versions: ArticleVersion[]; loading: boolean; articleId: string }) {
  const { restoreVersion, loading: mutationLoading } = useArticleMutations();
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (versionsLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading versions...</div>;

  const confirmVersion = versions.find(v => v.id === confirmRestoreId) || null;
  const restoring = !!mutationLoading.restoreVersion;

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersion(articleId, versionId);
      toast.success('Version restored', { description: 'A new version entry was recorded for this restore.' });
      setConfirmRestoreId(null);
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  return (
    <div className="space-y-3">
      {/* Confirm restore dialog */}
      {confirmVersion && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" onClick={() => !restoring && setConfirmRestoreId(null)}>
          <div className="bg-card border border-border rounded-xl shadow-overlay w-[400px] p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-card-foreground mb-2">Restore this version?</h3>
            <p className="text-[12px] text-muted-foreground mb-1">
              The article content will be returned to the state from <span className="font-medium text-card-foreground">{confirmVersion.timestamp.toLocaleString()}</span> ({confirmVersion.action}).
            </p>
            <p className="text-[11px] text-muted-foreground mb-4">
              Nothing is overwritten — the restore is recorded as a new version entry, so the current state stays restorable too.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={restoring} onClick={() => setConfirmRestoreId(null)}>Cancel</Button>
              <Button size="sm" className="h-7 text-[11px] gap-1" disabled={restoring} onClick={() => handleRestore(confirmVersion.id)}>
                {restoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                {restoring ? 'Restoring…' : 'Restore Version'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-3 py-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <p className="text-[10px] text-muted-foreground">Edits in Webflow are captured when content is pulled from Webflow in the Content Preview tab.</p>
      </div>
      {versions.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No version history yet</p>}
      {versions.map((v, i) => {
        const isCurrent = i === 0;
        const canRestore = !!v.contentSnapshot;
        return (
          <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-medium shrink-0">
              {v.author.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold text-card-foreground">{v.author}</p>
                {isCurrent && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Current</Badge>}
                {v.restoredFromVersionId && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-accent/40 text-accent">Restore</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground">{v.action}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                <TimeAgo date={v.timestamp} />
                <span>{v.wordCount.toLocaleString()} words</span>
              </div>
            </div>
            {!isCurrent && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1 shrink-0"
                disabled={!canRestore || restoring}
                title={canRestore ? 'Return the article to this version' : 'No content snapshot stored for this version (recorded before restore support)'}
                onClick={() => setConfirmRestoreId(v.id)}
              >
                <RotateCw className="w-3 h-3" /> Restore this version
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}


// === Main Article Detail Panel ===
interface ArticleDetailPanelProps {
  article: PipelineArticle | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: ArticleStatus) => void;
  tasks: ArticleTask[];
  tasksLoading: boolean;
  versions: ArticleVersion[];
  versionsLoading: boolean;
  isRefreshContext?: boolean;
  initialTab?: string;
}

export function ArticleDetailPanel({
  article, isOpen, onClose, onStatusChange, tasks, tasksLoading, versions, versionsLoading, isRefreshContext, initialTab,
}: ArticleDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('Overview');

  // CMS-153: the panel shows only the tabs relevant to the stage being
  // viewed ("in 'Article' you should only see how to write the article").
  // viewingStage tracks which stage's screen is shown — the stepper tiles
  // switch it without moving the article. The "All tabs" toggle restores the
  // full tab set so nothing is ever unreachable; the choice persists.
  const [viewingStageOverride, setViewingStage] = useState<ArticleStage | null>(null);
  const [showAllTabs, setShowAllTabs] = useState<boolean>(() => {
    try { return window.localStorage.getItem('articleDetailPanel.showAllTabs') === 'true'; } catch { return false; }
  });
  const toggleShowAllTabs = () => setShowAllTabs(prev => {
    const next = !prev;
    try { window.localStorage.setItem('articleDetailPanel.showAllTabs', String(next)); } catch { /* private mode */ }
    return next;
  });

  // CMS-148: the Content Preview/editor was squeezed to a sliver — the stage
  // guide (e.g. the Humanise card) ate ~55vh and the panel was locked at
  // 780px. Both are now user-expandable: the stage guide collapses to a
  // strip, and the panel expands to the full screen. Choices persist.
  const [fullScreen, setFullScreen] = useState<boolean>(() => {
    try { return window.localStorage.getItem('articleDetailPanel.fullScreen') === 'true'; } catch { return false; }
  });
  const [stageGuideOpen, setStageGuideOpen] = useState<boolean>(() => {
    try { return window.localStorage.getItem('articleDetailPanel.stageGuideOpen') !== 'false'; } catch { return true; }
  });
  const toggleFullScreen = () => setFullScreen(prev => {
    const next = !prev;
    try { window.localStorage.setItem('articleDetailPanel.fullScreen', String(next)); } catch { /* private mode */ }
    return next;
  });
  const toggleStageGuide = () => setStageGuideOpen(prev => {
    const next = !prev;
    try { window.localStorage.setItem('articleDetailPanel.stageGuideOpen', String(next)); } catch { /* private mode */ }
    return next;
  });

  useEffect(() => {
    if (!isOpen || !article) return;
    // Every (re)open resets the view to the article's current stage…
    setViewingStage(article.stage);
    if (initialTab && (PANEL_TABS as readonly string[]).includes(initialTab)) {
      // …unless the opener asked for a specific tab (e.g. "Research Brief"
      // from the RSS monitor, "Tasks" from a kanban card chip).
      setActiveTab(initialTab as PanelTab);
    } else {
      // CMS-153: no explicit tab — land on the stage's working surface.
      setActiveTab(getStageDefaultTab(article.stage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTab, article?.id]);

  // Follow live stage transitions (stage-guide actions, header arrows): when
  // the article actually moves to another stage, jump the view to the new
  // stage's screen so the tabs always match the step at hand.
  const stageFollowRef = useRef<{ id?: string; stage?: ArticleStage }>({});
  useEffect(() => {
    if (!article) return;
    const prev = stageFollowRef.current;
    stageFollowRef.current = { id: article.id, stage: article.stage };
    if (prev.id === article.id && prev.stage && prev.stage !== article.stage) {
      setViewingStage(article.stage);
      setActiveTab(getStageDefaultTab(article.stage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, article?.stage]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [refreshBarBusy, setRefreshBarBusy] = useState<'refresh' | 'research' | null>(null);
  const { updateArticle, addToRefreshQueue, restoreVersion, loading: mutationLoading } = useArticleMutations();

  // Body Save/Revert bridge — the Content Preview tab registers its actions
  // while mounted and reports dirty state; the header buttons act on them.
  // CMS-152: the Content Preview tab is force-mounted, so the registration
  // (and the dirty flag) survives tab switches and the header buttons work
  // from every tab.
  const bodyActionsRef = useRef<{ save: () => Promise<boolean>; revert: () => void } | null>(null);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [bodySaving, setBodySaving] = useState(false);
  const registerBodyActions = useCallback((actions: { save: () => Promise<boolean>; revert: () => void } | null) => {
    bodyActionsRef.current = actions;
  }, []);
  const handleBodyDirtyChange = useCallback((dirty: boolean) => setBodyDirty(dirty), []);
  useEffect(() => { setBodyDirty(false); }, [article?.id]);

  // ── CMS-152: manual save + unsaved-changes close guard ────────────────────
  const [unsavedCloseOpen, setUnsavedCloseOpen] = useState(false);
  const [unsavedCloseSaving, setUnsavedCloseSaving] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);

  const handleHeaderSave = async () => {
    const actions = bodyActionsRef.current;
    if (!actions) return;
    setBodySaving(true);
    try { await actions.save(); } finally { setBodySaving(false); }
  };

  /** Every close path (X, backdrop, Escape) funnels through here: with
   *  unsaved body edits the panel stays open and the warning dialog shows. */
  const requestClose = () => {
    if (bodyDirty) setUnsavedCloseOpen(true);
    else onClose();
  };

  const handleDiscardAndClose = () => {
    setUnsavedCloseOpen(false);
    onClose();
  };

  const handleSaveAndClose = async () => {
    const actions = bodyActionsRef.current;
    if (!actions) { setUnsavedCloseOpen(false); onClose(); return; }
    setUnsavedCloseSaving(true);
    try {
      const saved = await actions.save();
      if (saved) { setUnsavedCloseOpen(false); onClose(); }
      // save failed → stay open (the error toast already fired)
    } finally {
      setUnsavedCloseSaving(false);
    }
  };

  // Browser-level navigation (refresh / tab close) with unsaved body edits
  useEffect(() => {
    if (!bodyDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [bodyDirty]);

  // Header Revert target — the newest restorable version before the current
  // state (the History menu restores any chosen version via the same path).
  const previousVersion = findPreviousRestorableVersion(versions);
  const revertingVersion = !!mutationLoading.restoreVersion;
  const handleRevertToPrevious = async () => {
    if (!previousVersion || !article) return;
    try {
      await restoreVersion(article.id, previousVersion.id);
      toast.success('Version restored', { description: 'A new version entry was recorded for this restore.' });
      setRevertConfirmOpen(false);
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  if (!article) return null;

  // The stage whose screen is being viewed — the stepper tiles switch this
  // without moving the article (defaults to the article's actual stage).
  const viewingStage = viewingStageOverride ?? article.stage;
  // The scoped tab set for the viewed stage (or everything with "All tabs").
  // An explicitly opened tab outside the scope (e.g. "Tasks" from a kanban
  // card chip) stays reachable while it's the active one.
  const scopedTabs = showAllTabs ? [...PANEL_TABS] : getStageTabs(viewingStage);
  const visibleTabs: PanelTab[] = !showAllTabs && !scopedTabs.includes(activeTab)
    ? [...scopedTabs, activeTab]
    : scopedTabs;

  const handleTitleEdit = () => {
    setTitleValue(article.title);
    setEditingTitle(true);
  };

  const handleTitleSave = () => {
    setEditingTitle(false);
    const next = titleValue.trim();
    if (next && next !== article.title) {
      updateArticle(article.id, { title: next })
        .then(() => toast.success('Title updated'))
        .catch(() => {});
    }
  };

  const currentStatusIndex = ALL_STATUSES.indexOf(article.status);
  const nextStatus = currentStatusIndex < ALL_STATUSES.length - 1 ? ALL_STATUSES[currentStatusIndex + 1] : null;
  const prevStatus = currentStatusIndex > 0 ? ALL_STATUSES[currentStatusIndex - 1] : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) requestClose(); }}>
      <SheetContent
        className={cn(
          'p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden',
          fullScreen ? 'w-[100vw] sm:max-w-[100vw]' : 'w-[780px] sm:max-w-[780px]'
        )}
        side="right"
        onInteractOutside={(e) => {
          // CMS-152: backdrop click with unsaved body edits → warn, don't close
          if (bodyDirty) { e.preventDefault(); setUnsavedCloseOpen(true); }
        }}
        onEscapeKeyDown={(e) => {
          // CMS-152: Escape with unsaved body edits → warn, don't close
          if (bodyDirty) { e.preventDefault(); setUnsavedCloseOpen(true); }
        }}
      >
        {/* Header — matches Lovable layout */}
        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input value={titleValue} onChange={e => setTitleValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTitleSave()} autoFocus className="text-[15px] font-semibold tracking-tight h-auto py-1 border-0 border-b-2 border-primary rounded-none px-0 focus-visible:ring-0" />
                  <Button size="sm" onClick={handleTitleSave}><Check className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <h2 className="text-[15px] font-display font-semibold tracking-tight text-foreground leading-snug cursor-pointer hover:text-primary transition-colors duration-150" onClick={handleTitleEdit}>
                  {article.title}
                </h2>
              )}
              {/* Row 2: source + status dropdown + experience badge + action buttons */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Source label */}
                <span className="text-[11px] text-muted-foreground">
                  {article.entryPoint === 'RSS' ? `From: RSS Feed` :
                   article.entryPoint === 'Keyword' ? `From: Keyword → ${article.targetKeyword || ''}` :
                   article.entryPoint === 'URL Drop' ? 'From: URL Drop' :
                   'From: Original Idea'}
                </span>
                {/* Stage navigation — elegant step indicator */}
                {(() => {
                  const stages = STAGE_ORDER;
                  const currentIdx = stages.indexOf(article.stage);
                  const stageNum = currentIdx + 1;
                  const totalStages = stages.length;
                  const prevStage = currentIdx > 0 ? stages[currentIdx - 1] : null;
                  const nextStage = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null;
                  const canGoBack = currentIdx > 0 && article.stage !== 'Published';
                  // Human-gate stages (Select Keywords, Review & Edit, Final
                  // Approval) must be completed through the stage action panel
                  // — the arrow would silently bypass the gate.
                  const isGateStage = HUMAN_GATE_STAGES.includes(article.stage);
                  const canGoForward = currentIdx >= 0 && currentIdx < stages.length - 1 && article.stage !== 'Published' && !isGateStage;

                  const moveToStage = (stage: string) => {
                    // production: httpsCallable(functions, 'updateArticleStage')
                    callUpdateArticleStage(article.id, stage as ArticleStage).then(() => {
                      toast.success(`Moved to ${stage}`);
                    }).catch((err: unknown) => {
                      toast.error('Move failed', { description: (err as Error).message });
                    });
                  };

                  return (
                    <div className="flex items-center gap-1.5">
                      {/* Back arrow */}
                      <button
                        onClick={() => prevStage && moveToStage(prevStage)}
                        disabled={!canGoBack}
                        className="w-7 h-7 rounded-full flex items-center justify-center border border-border/70 bg-card text-muted-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] hover:text-accent hover:border-accent/40 hover:ring-2 hover:ring-accent/15 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
                        title={prevStage ? `Move the article back to ${prevStage}` : undefined}
                      >
                        <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                      </button>

                      {/* Stage pill */}
                      <div className="flex items-center gap-2 h-7 px-3 rounded-full bg-accent/10 text-accent border border-accent/20">
                        <span className="w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-semibold tabular-nums flex items-center justify-center">{stageNum}</span>
                        <span className="text-[11px] font-semibold tracking-tight text-accent">{article.stage || article.status}</span>
                        <span className="text-[9px] font-medium text-accent/60 tabular-nums">of {totalStages}</span>
                      </div>

                      {/* Forward arrow */}
                      <button
                        onClick={() => nextStage && moveToStage(nextStage)}
                        disabled={!canGoForward}
                        className="w-7 h-7 rounded-full flex items-center justify-center border border-border/70 bg-card text-muted-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] hover:text-accent hover:border-accent/40 hover:ring-2 hover:ring-accent/15 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
                        title={isGateStage
                          ? 'Complete this approval gate via the action panel above'
                          : nextStage ? `Move the article to ${nextStage}` : undefined}
                      >
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                      </button>
                    </div>
                  );
                })()}
                {/* E-E-A-T badge */}
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  article.hasExperience ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                }`}>
                  {article.hasExperience ? <><Check className="w-3 h-3" /> Experience sourced</> : <><Minus className="w-3 h-3" /> No experience</>}
                </span>
                {/* Refresh Article button — only meaningful for live articles */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[11px] border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 gap-2"
                  disabled={article.status !== 'Published'}
                  title={article.status !== 'Published' ? 'Only published articles can be refreshed' : undefined}
                  onClick={() => setRefreshModalOpen(true)}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Article
                </Button>
                {/* View Live button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[11px] gap-2"
                  onClick={() => article.publishedUrl && window.open(article.publishedUrl, '_blank', 'noopener,noreferrer')}
                  disabled={!article.publishedUrl}
                  title={!article.publishedUrl ? 'Not yet published' : undefined}
                >
                  <Eye className="w-3.5 h-3.5" /> View Live
                </Button>
              </div>
            </div>
            {/* CMS-152: constant top-right spot — Save / Revert-to-previous-
                version / History, always visible from every tab — then the
                expand + close circles */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant={bodyDirty ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-[11px] gap-1.5"
                disabled={!bodyDirty || bodySaving}
                title={bodyDirty ? 'Changes haven\'t been saved — save the article body' : 'No unsaved changes'}
                onClick={() => void handleHeaderSave()}
              >
                {bodySaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
                {bodyDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" aria-label="unsaved changes" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[11px] gap-1.5"
                disabled={!previousVersion || revertingVersion}
                title={previousVersion
                  ? `Revert to the previous version — ${previousVersion.timestamp.toLocaleString()} (${previousVersion.action})`
                  : 'No previous version to revert to'}
                onClick={() => setRevertConfirmOpen(true)}
              >
                {revertingVersion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                Revert
              </Button>
              <VersionHistoryMenu
                articleId={article.id}
                versions={versions}
                loading={versionsLoading}
                bodyDirty={bodyDirty}
                onDiscardUnsaved={() => bodyActionsRef.current?.revert()}
              />
              <div className="w-px h-5 bg-border/70 mx-1" aria-hidden />
              <button
                onClick={toggleFullScreen}
                title={fullScreen ? 'Back to side panel' : 'Expand over the whole screen — more room to review and edit'}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={requestClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stage stepper — every pipeline stage as a clickable anchor
            (CMS-153). Labels are the kanban stage names verbatim (both come
            from STAGE_ORDER). Clicking a tile shows that stage's screen —
            its scoped tabs + working surface — WITHOUT moving the article;
            the header arrows remain the way to actually move it. */}
        {STAGE_ORDER.includes(article.stage) && (() => {
          const currentIdx = STAGE_ORDER.indexOf(article.stage);
          return (
            <div className="px-5 pt-2.5 pb-0 border-b border-border shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2.5">
                {STAGE_ORDER.map((stage, i) => {
                  const isCurrent = stage === article.stage;
                  const isViewed = stage === viewingStage;
                  const isDone = i < currentIdx;
                  return (
                    <button
                      key={stage}
                      onClick={() => {
                        setViewingStage(stage);
                        setActiveTab(getStageDefaultTab(stage));
                      }}
                      title={isCurrent ? `Current stage — ${stage}` : `View the ${stage} screen`}
                      className={cn(
                        'flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full border text-[10px] font-medium whitespace-nowrap shrink-0 transition-all duration-150',
                        isCurrent
                          ? 'bg-accent/10 text-accent border-accent/30'
                          : isDone
                            ? 'bg-success/5 text-success border-success/20 hover:border-success/50 hover:ring-2 hover:ring-success/10'
                            : 'bg-muted/40 text-muted-foreground border-border hover:border-accent/40 hover:text-foreground hover:ring-2 hover:ring-accent/10',
                        isViewed && !isCurrent && 'ring-2 ring-accent/30 border-accent/40 text-foreground'
                      )}
                    >
                      <span className={cn(
                        'w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-semibold tabular-nums shrink-0',
                        isCurrent ? 'bg-accent text-accent-foreground' : isDone ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                      )}>
                        {isDone ? <Check className="w-2.5 h-2.5" /> : i + 1}
                      </span>
                      {stage}
                    </button>
                  );
                })}
                {viewingStage !== article.stage && (
                  <button
                    onClick={() => {
                      setViewingStage(article.stage);
                      setActiveTab(getStageDefaultTab(article.stage));
                    }}
                    title={`Return to the article's current stage (${article.stage})`}
                    className="flex items-center gap-1 h-7 px-2.5 rounded-full border border-dashed border-accent/40 text-[10px] font-medium text-accent whitespace-nowrap shrink-0 hover:bg-accent/5 transition-colors"
                  >
                    ← Back to current: {article.stage}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Refresh Action Bar — only in refresh context */}
        {isRefreshContext && (
          <div className="px-5 py-2.5 border-b border-border bg-accent/5 shrink-0 flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-[11px] gap-2"
              disabled={refreshBarBusy !== null}
              onClick={async () => {
                setRefreshBarBusy('refresh');
                try {
                  // production: httpsCallable(functions, 'refreshArticleSections')
                  await callRefreshArticleSections(article.id);
                  toast.success('Article refresh generated', { description: 'Review the changes in the refresh diff view.' });
                } catch (err) {
                  toast.error('Refresh failed', { description: (err as Error).message });
                } finally {
                  setRefreshBarBusy(null);
                }
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshBarBusy === 'refresh' ? 'animate-spin' : ''}`} />
              {refreshBarBusy === 'refresh' ? 'Refreshing…' : 'Refresh Article'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 border-accent text-accent hover:bg-accent/10"
              disabled={refreshBarBusy !== null}
              onClick={async () => {
                setRefreshBarBusy('research');
                try {
                  // production: httpsCallable(functions, 'generateTopicResearch')
                  await callGenerateTopicResearch({ articleId: article.id, targetKeyword: article.primaryKeyword || article.targetKeyword || article.title });
                  toast.success('Research updated', { description: 'Fresh findings are in the Research Brief tab.' });
                } catch (err) {
                  toast.error('Research failed', { description: (err as Error).message });
                } finally {
                  setRefreshBarBusy(null);
                }
              }}
            >
              <Sparkles className={`w-3.5 h-3.5 ${refreshBarBusy === 'research' ? 'animate-pulse' : ''}`} />
              {refreshBarBusy === 'research' ? 'Researching…' : 'Deep Research'}
            </Button>
          </div>
        )}

        {/* Refresh diff review — surfaces the AI-refreshed content that was
            previously written to Firestore but never shown anywhere */}
        {article.stage === 'Refreshing' && article.refreshedContent && (
          <div className="px-6 pt-4 shrink-0">
            <RefreshDiffView
              articleId={article.id}
              articleTitle={article.title}
              originalContent={article.content ?? ''}
              refreshedContent={article.refreshedContent}
              changePercent={article.refreshChangePercent ?? 0}
              onApproved={() => {}}
              onRejected={() => {}}
            />
          </div>
        )}

        {/* Stage-specific action panel — CMS-148: collapsible "stage guide"
            strip. The Humanise-stage card ate ~55vh and squeezed the Content
            Preview/editor to a little slider at the bottom; collapsing hands
            the space back (the choice persists). Stage navigation stays
            available via the header arrows, and gates still enforce
            server-side. Capped so tall panels (e.g. the Select Keywords
            table) scroll internally. */}
        {STAGE_ORDER.includes(article.stage) && (
          <div className="px-6 pt-4 shrink-0">
            <button
              onClick={toggleStageGuide}
              title={stageGuideOpen ? 'Hide the stage guide for more editing room' : 'Show the stage guide'}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              {stageGuideOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Stage guide — {article.stage}
            </button>
            {stageGuideOpen && (
              <div className="max-h-[55vh] overflow-y-auto">
                <StageActionPanel article={article} />
              </div>
            )}
          </div>
        )}

        {/* Tabs — scoped to the viewed stage by default (CMS-153); the
            "All tabs" toggle restores the full set so nothing is unreachable */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as PanelTab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="px-6 pt-2 pb-0 justify-start gap-0 bg-transparent border-b border-border rounded-none h-auto flex-wrap">
            {visibleTabs.map(tab => (
              <TabsTrigger key={tab} value={tab} className="text-[12px] font-medium px-3 py-1.5 rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors duration-150 data-[state=active]:border-accent data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {tab}
              </TabsTrigger>
            ))}
            <button
              onClick={toggleShowAllTabs}
              title={showAllTabs ? 'Show only the tabs relevant to this stage' : 'Show every tab, including the ones for other stages'}
              className={cn(
                'ml-auto mb-px flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors shrink-0',
                showAllTabs ? 'bg-accent/10 text-accent hover:bg-accent/15' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              {showAllTabs ? 'Stage tabs' : 'All tabs'}
            </button>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="Overview" className="mt-0 animate-fade-in">
                <OverviewTab article={article} onStatusChange={onStatusChange} isRefreshContext={isRefreshContext} />
              </TabsContent>
              <TabsContent value="Tasks" className="mt-0 animate-fade-in">
                <TasksTab tasks={tasks} loading={tasksLoading} articleId={article.id} />
              </TabsContent>
              <TabsContent value="Research Brief" className="mt-0 animate-fade-in">
                <ResearchBriefTab article={article} onStatusChange={onStatusChange} />
              </TabsContent>
              {/* CMS-152: force-mounted so the body editor keeps its unsaved
                  edits (and the header Save/Revert bridge stays registered)
                  while the user works on other tabs.
                  CMS-175: Radix never sets `hidden` on a force-mounted
                  TabsContent, so the editor stayed visible and every tab
                  after it (incl. Version History) rendered invisibly below
                  it — "the tab doesn't change the view at all". Hide it
                  visually while inactive; mounting (and editor state) is
                  untouched. */}
              <TabsContent value="Content Preview" forceMount className="mt-0 animate-fade-in data-[state=inactive]:hidden">
                <ContentPreviewTab
                  article={article}
                  onRegisterBodyActions={registerBodyActions}
                  onBodyDirtyChange={handleBodyDirtyChange}
                />
              </TabsContent>
              <TabsContent value="SEO Checklist" className="mt-0 animate-fade-in">
                <SEOChecklistTab article={article} />
              </TabsContent>
              <TabsContent value="Links Audit" className="mt-0 animate-fade-in">
                <LinksAuditTab article={article} />
              </TabsContent>
              <TabsContent value="Compliance" className="mt-0 animate-fade-in">
                <ComplianceTab article={article} />
              </TabsContent>
              <TabsContent value="Post-Publish" className="mt-0 animate-fade-in">
                <PostPublishTab article={article} />
              </TabsContent>
              <TabsContent value="Version History" className="mt-0 animate-fade-in">
                <VersionHistoryTab versions={versions} loading={versionsLoading} articleId={article.id} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* CMS-152: "changes haven't been saved" warning — replaces silent
            auto-save. Shown by every panel close path while the body is dirty. */}
        <AlertDialog open={unsavedCloseOpen} onOpenChange={(o) => { if (!o && !unsavedCloseSaving) setUnsavedCloseOpen(false); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Changes haven&apos;t been saved</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes to the article body. Save them before closing, or discard them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel disabled={unsavedCloseSaving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={unsavedCloseSaving}
                onClick={handleDiscardAndClose}
              >
                Discard changes
              </AlertDialogAction>
              <AlertDialogAction
                disabled={unsavedCloseSaving}
                onClick={(e) => {
                  // Keep the dialog open while the save runs; it closes only on success.
                  e.preventDefault();
                  void handleSaveAndClose();
                }}
              >
                {unsavedCloseSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {unsavedCloseSaving ? 'Saving…' : 'Save & close'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CMS-152: header Revert — restore the previous version of the body */}
        <AlertDialog open={revertConfirmOpen} onOpenChange={(o) => { if (!o && !revertingVersion) setRevertConfirmOpen(false); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revert to the previous version?</AlertDialogTitle>
              <AlertDialogDescription>
                The article content will be returned to the state from{' '}
                <span className="font-medium text-card-foreground">{previousVersion?.timestamp.toLocaleString()}</span>{' '}
                ({previousVersion?.action}). Nothing is overwritten — the restore is recorded as a new version entry,
                so the current state stays restorable too.
                {bodyDirty && ' Your unsaved changes will be discarded.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revertingVersion}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={revertingVersion}
                onClick={(e) => {
                  e.preventDefault();
                  void handleRevertToPrevious();
                }}
              >
                {revertingVersion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {revertingVersion ? 'Reverting…' : 'Revert to this version'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Refresh Article modal — adds the published article to the refresh queue */}
        <RefreshArticleModal
          open={refreshModalOpen}
          onClose={() => setRefreshModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await addToRefreshQueue({
                articleId: article.id,
                title: data.title,
                refreshReason: data.refreshReason,
                priority: data.priority,
                assignedTo: data.assignedTo,
                keyword: data.keyword,
                refreshScope: data.refreshScope,
                sourceUrls: data.sourceUrls,
                editorialDirection: data.editorialDirection,
                targetPosition: data.targetPosition,
              });
              toast.success('Added to refresh queue', { description: `"${data.title}" is now in the refresh queue.` });
            } catch {
              // error toast handled in useArticleMutations
            }
            setRefreshModalOpen(false);
          }}
          article={{
            title: article.title,
            keyword: article.targetKeyword,
            url: article.publishedUrl,
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
