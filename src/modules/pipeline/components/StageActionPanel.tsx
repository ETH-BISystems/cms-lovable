import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Sparkles, FileText, Pencil, Camera, Shield, ShieldCheck, Rocket, Images } from 'lucide-react';
import { toast } from 'sonner';
import {
  callUpdateArticleStage,
  callDiscoverKeywords,
  callUpdateArticle,
  callGenerateTopicResearch,
  callGenerateArticleDraft,
  callRunSEOVerification,
  callPublishToWebflow,
} from '../services/articleService';
import { KeywordMagicTool, type KeywordMagicResult } from '@/modules/keywords';
import { FinalProcessingStatusBlock, HumaniseStatusBlock } from '@/modules/ai-final-processing';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { SEOCheckPanel } from './SEOCheckPanel';
import { ApprovalChecklist } from './ApprovalChecklist';
import { CardTagSuggestions } from './CardTagSuggestions';
import { ExperienceQuestionsPanel } from './ExperienceQuestionsPanel';
import { ComplianceCheckPanel } from './ComplianceCheckPanel';
import { FactCheckPanel } from './FactCheckPanel';
import { ConfirmPublishDialog, type CompliancePublishConcern } from './ConfirmPublishDialog';
import { SourceImagesDialog } from './SourceImagesDialog';
import { useComplianceCheck } from '../hooks/useComplianceCheck';
import { useFactCheck } from '../hooks/useFactCheck';
import type { PipelineArticle } from '../types';

interface StageActionPanelProps {
  article: PipelineArticle;
}

/**
 * Stage-aware action panel that shows the primary action/content
 * relevant to the article's current pipeline stage.
 * Renders above the detail panel tabs.
 */
export function StageActionPanel({ article }: StageActionPanelProps) {
  const stage = article.stage;

  switch (stage) {
    case 'New Article':
      return <NewArticleStagePanel article={article} />;
    case 'Keyword Discovery':
      return <KeywordDiscoveryStagePanel article={article} />;
    case 'Select Keywords':
      return <SelectKeywordsStagePanel article={article} />;
    case 'Deep Research':
      return <DeepResearchStagePanel article={article} />;
    case 'Write Article':
      return <WriteArticleStagePanel article={article} />;
    case 'Humanise':
      return <HumaniseStagePanel article={article} />;
    case 'Review & Edit':
      return <ReviewEditStagePanel article={article} />;
    case 'Add Photos + SEO Check':
      return <PhotosSEOStagePanel article={article} />;
    case 'Final Approval':
      return <FinalApprovalStagePanel article={article} />;
    case 'Watermark Removal':
      return <WatermarkRemovalStagePanel article={article} />;
    case 'Fact Check':
      return <FactCheckStagePanel article={article} />;
    case 'Publish':
      return <PublishStagePanel article={article} />;
    default:
      return null;
  }
}

// ─── Stage 1: New Article ─────────────────────────────────────────────────────
function NewArticleStagePanel({ article }: { article: PipelineArticle }) {
  const [loading, setLoading] = useState(false);

  const handleAdvance = async () => {
    setLoading(true);
    try {
      // production: 'updateArticleStage' then 'discoverKeywords' (300s DataForSEO budget)
      await callUpdateArticleStage(article.id, 'Keyword Discovery');
      await callDiscoverKeywords(article.id);
      toast.success('Keyword discovery started');
    } catch (err) {
      toast.error('Failed to start keyword discovery', { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent/20 bg-gradient-to-r from-accent/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Article Brief Complete</p>
          <p className="text-[11px] text-muted-foreground">Ready for keyword research via DataForSEO</p>
        </div>
      </div>
      <Button onClick={handleAdvance} disabled={loading} className="mt-2" size="sm">
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Discovering...</> : <><Search className="h-4 w-4 mr-2" /> Discover Keywords</>}
      </Button>
    </div>
  );
}

// ─── Stage 2: Keyword Discovery ───────────────────────────────────────────────
function KeywordDiscoveryStagePanel({ article }: { article: PipelineArticle }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keywords = article.keywordDiscovery?.keywords || [];
  const hasResults = keywords.length > 0;
  const hasFailed = !!article.failedInfo && article.failedInfo.stage === 'Keyword Discovery';

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      // production: 'discoverKeywords' (300s max-pull budget)
      await callDiscoverKeywords(article.id);
      toast.success('Keyword discovery started');
    } catch (err) {
      const msg = (err as Error).message || 'Unknown error';
      setError(msg);
      toast.error('Keyword discovery failed', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!hasResults) {
    const showError = hasFailed || error;
    return (
      <div className={`rounded-xl border ${showError ? 'border-destructive/25 bg-gradient-to-r from-destructive/10 to-transparent' : 'border-info/25 bg-gradient-to-r from-info/10 to-transparent'} p-5`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg ${showError ? 'bg-destructive/10' : 'bg-info/10'} flex items-center justify-center`}>
            <Search className={`h-4 w-4 ${showError ? 'text-destructive' : 'text-info'}`} />
          </div>
          <div>
            <p className="text-[14px] font-semibold tracking-tight text-foreground">
              {showError ? 'Keyword Discovery Failed' : 'Analyzing Keywords'}
            </p>
            <p className={`text-[11px] ${showError ? 'text-destructive' : 'text-info'}`}>
              {showError ? 'DataForSEO API returned an error' : 'Powered by DataForSEO'}
            </p>
          </div>
        </div>
        {showError ? (
          <div className="pl-12 space-y-2">
            <p className="text-[11px] text-destructive">
              {error || article.failedInfo?.error || 'The keyword discovery service is temporarily unavailable. Please try again.'}
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={loading} className="text-[11px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/5">
              {loading ? <><Loader2 className="h-3 w-3 animate-spin" /> Retrying...</> : <><Search className="h-3 w-3" /> Retry Discovery</>}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 pl-12">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-info" />
              ) : (
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-info animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-info animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-info animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              <span className="text-[11px] text-muted-foreground">Finding keyword opportunities for "{article.targetKeyword || article.title}"</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRetry} disabled={loading} className="mt-3 ml-12 text-[11px] text-info">Retry</Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-success/25 bg-gradient-to-r from-success/10 to-transparent p-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
          <Search className="h-4 w-4 text-success" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground tabular-nums">✓ {keywords.length.toLocaleString()} Keywords Found</p>
          <p className="text-[11px] text-muted-foreground">Advance to "Select Keywords" to choose your targets</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stage 3: Select Keywords (Human Gate) ────────────────────────────────────
function SelectKeywordsStagePanel({ article }: { article: PipelineArticle }) {
  const seed = article.primaryKeyword || article.targetKeyword || article.title || '';

  // Reuse the keywords the discovery stage already fetched and stored — no
  // second DataForSEO call just to render the selection table. A manual
  // search inside the tool still works for exploring other seeds.
  const discoveredResult = useMemo<KeywordMagicResult | null>(() => {
    const discovered = article.keywordDiscovery?.keywords;
    if (!discovered || discovered.length === 0) return null;
    return {
      seed,
      totalCount: discovered.length,
      groups: [],
      keywords: discovered.map((k) => ({
        keyword: k.keyword,
        volume: k.volume,
        kd: k.kd,
        cpc: k.cpc,
        competition: k.kd / 100,
        intent: k.intent,
        serpFeatures: k.serpFeatures ?? [],
        trend: k.trend ?? [],
        source: 'suggestions' as const,
        updatedAt: k.updatedAt ?? '',
      })),
    };
  }, [article.keywordDiscovery?.keywords, seed]);

  const handleConfirm = async (primary: string, secondary: string[]) => {
    try {
      // production: 'updateArticle' → 'updateArticleStage' → 'generateTopicResearch'
      await callUpdateArticle(article.id, { primaryKeyword: primary, secondaryKeywords: secondary, targetKeyword: primary });
      await callUpdateArticleStage(article.id, 'Deep Research');
      toast.success(`Keywords confirmed. Starting deep research...`);
      callGenerateTopicResearch({ articleId: article.id, targetKeyword: primary }).catch(() => {});
    } catch (err) {
      toast.error('Failed to confirm keywords', { description: (err as Error).message });
      throw err;
    }
  };

  return (
    <div className="rounded-xl border border-warning/30 bg-gradient-to-r from-warning/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Select Target Keywords</p>
          <p className="text-[11px] text-amber-700 font-medium">⚡ Your approval required — pick a primary (1°) and secondary (2°) keywords</p>
        </div>
      </div>
      <KeywordMagicTool
        key={article.id}
        mode="embedded"
        initialSeed={seed}
        autoSearch
        initialResult={discoveredResult}
        selectionMode="primary-secondary"
        onConfirmSelection={handleConfirm}
        confirmLabel="Confirm Selection"
      />
    </div>
  );
}

// ─── Stage 4: Deep Research ───────────────────────────────────────────────────
function DeepResearchStagePanel({ article }: { article: PipelineArticle }) {
  const [loading, setLoading] = useState(false);
  const hasResearch = !!article.researchBrief && article.researchBrief.findings.length > 0;
  const findingsCount = article.researchBrief?.findings?.length || 0;

  // Detect if keywords changed since research was generated
  const researchKeyword = article.researchBrief?.keyword || '';
  const currentKeyword = article.primaryKeyword || article.targetKeyword || '';
  const keywordsChanged = hasResearch && researchKeyword && currentKeyword &&
    researchKeyword.toLowerCase() !== currentKeyword.toLowerCase();

  const handleRunResearch = async () => {
    setLoading(true);
    try {
      // production: 'generateTopicResearch'
      await callGenerateTopicResearch({ articleId: article.id, targetKeyword: currentKeyword });
      toast.success('Research complete — findings updated');
    } catch (err) {
      toast.error('Research failed', { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-info/25 bg-gradient-to-r from-info/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
          <Search className="h-4 w-4 text-info" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Deep Research</p>
          <p className="text-[11px] text-info">Powered by Perplexity AI</p>
        </div>
      </div>

      {/* Keywords changed warning */}
      {keywordsChanged && (
        <div className="ml-12 mb-2 px-3 py-2 bg-warning/10 border border-warning/25 rounded-lg">
          <p className="text-[11px] text-amber-700 font-medium">⚠️ Keywords have changed since this research was generated</p>
          <p className="text-[10px] text-amber-700/80 mt-0.5">
            Research was for "{researchKeyword}" — current keyword is "{currentKeyword}". Re-run recommended.
          </p>
        </div>
      )}

      {hasResearch ? (
        <div className="ml-12 space-y-2">
          <p className="text-[12px] text-success font-medium tabular-nums">
            ✓ {findingsCount} findings ready — review in Research Brief tab
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={handleRunResearch}
              disabled={loading}
            >
              {loading ? <><Loader2 className="h-3 w-3 animate-spin" /> Re-running...</> : <><Search className="h-3 w-3" /> Re-run Research</>}
            </Button>
            <span className="text-[10px] text-muted-foreground">Approve findings in Research Brief tab to start writing →</span>
          </div>
        </div>
      ) : (
        <Button onClick={handleRunResearch} disabled={loading} size="sm" className="mt-2 ml-12">
          {loading ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Researching...</> : <><Search className="h-3.5 w-3.5 mr-2" /> Start Research</>}
        </Button>
      )}
      {/* Experience Q&A step (CMS-52) — answer while research runs so the
          answers are ready as writing context */}
      <div className="ml-12 mt-3">
        <ExperienceQuestionsPanel article={article} />
      </div>
    </div>
  );
}

// ─── Stage 5: Write Article ───────────────────────────────────────────────────
function WriteArticleStagePanel({ article }: { article: PipelineArticle }) {
  const [loading, setLoading] = useState(false);

  // Count words in content (strip HTML tags)
  const contentText = (article.content || '').replace(/<[^>]+>/g, ' ').trim();
  const wordCount = contentText ? contentText.split(/\s+/).length : 0;

  // A real article should be at least 300 words. Anything less is likely
  // an RSS snippet, brief, or failed generation — not a publishable draft.
  const MIN_ARTICLE_WORDS = 300;
  const hasFullArticle = wordCount >= MIN_ARTICLE_WORDS;
  const hasSnippet = wordCount > 0 && wordCount < MIN_ARTICLE_WORDS;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Gather selected research findings for the writing context
      const brief = article.researchBrief;
      const selected = new Set(brief?.selectedFindings || []);
      const findings = (brief?.findings || [])
        .filter(f => selected.size === 0 || selected.has(f.id));

      // production: 'generateArticleDraft'
      await callGenerateArticleDraft({
        articleId: article.id,
        researchFindings: findings,
        seoContext: {
          targetKeyword: article.primaryKeyword || article.targetKeyword,
          searchVolume: article.seoResearch?.metrics?.searchVolume || 0,
          competitorAnalysis: [],
        },
      });
      toast.success('Draft generated — see Content Preview tab');
    } catch (err) {
      toast.error('Writing failed', { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent/20 bg-gradient-to-r from-accent/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Pencil className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Write Article</p>
          <p className="text-[11px] text-accent">Powered by Claude AI</p>
        </div>
      </div>
      {hasFullArticle ? (
        <p className="text-[12px] text-success font-medium tabular-nums pl-12">✓ {wordCount.toLocaleString()} words written — see Content Preview</p>
      ) : (
        <div className="pl-12 space-y-2">
          {hasSnippet && (
            <p className="text-[11px] text-amber-700">
              ⚠ Only {wordCount} words found (RSS snippet or brief). A full article needs {MIN_ARTICLE_WORDS}+ words.
            </p>
          )}
          <Button onClick={handleGenerate} disabled={loading} size="sm">
            {loading ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Writing...</> : <><Pencil className="h-3.5 w-3.5 mr-2" /> Generate Full Draft</>}
          </Button>
        </div>
      )}
      {/* Experience Q&A step (CMS-52) — answered questions are woven into
          the generated draft as first-person experience */}
      <div className="pl-12 mt-3">
        <ExperienceQuestionsPanel article={article} />
      </div>
    </div>
  );
}

// ─── Stage 7: Review & Edit (Human Gate) ──────────────────────────────────────
function ReviewEditStagePanel({ article }: { article: PipelineArticle }) {
  const { factCheck, isChecking, run } = useFactCheck(article);

  const handleApprove = async () => {
    try {
      await callUpdateArticleStage(article.id, 'Add Photos + SEO Check');
      toast.success('Content approved');
    } catch (err) {
      toast.error('Approval failed', { description: (err as Error).message });
    }
  };

  return (
    <div className="rounded-xl border border-warning/30 bg-gradient-to-r from-warning/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
          <Pencil className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Review & Edit</p>
          <p className="text-[11px] text-amber-700 font-medium">⚡ Your approval required</p>
        </div>
      </div>
      {/* CMS-161: a failed fact check sends the article back here — the
          flagged claims are the editor's fix list. */}
      {article.factCheck?.verdict === 'fail' && (
        <div className="pl-12 mb-3 max-w-2xl">
          <FactCheckPanel
            factCheck={factCheck}
            isChecking={isChecking}
            onRun={() => void run()}
            note="The fact check flagged issues in this article and returned it for editing. Fix the claims below, then approve again — the check re-runs automatically in the Fact Check stage."
          />
        </div>
      )}
      <div className="flex items-center gap-2 pl-12">
        <p className="text-[11px] text-muted-foreground flex-1">Select text in Content Preview to rewrite with AI, or edit directly.</p>
        <Button onClick={handleApprove} size="sm">
          ✓ Approve
        </Button>
      </div>
    </div>
  );
}

// ─── Stage 8: Add Photos + SEO Check ─────────────────────────────────────────
function PhotosSEOStagePanel({ article }: { article: PipelineArticle }) {
  const [seoLoading, setSeoLoading] = useState(false);
  const [sourceImagesOpen, setSourceImagesOpen] = useState(false);
  const seoResult = article.seoCheckResult || null;
  const selectedImageCount = article.selectedSourceImages?.length ?? 0;

  const handleRunSEO = async () => {
    setSeoLoading(true);
    try {
      // production: 'runSEOVerification'
      await callRunSEOVerification(article.id);
      toast.success('SEO check complete');
    } catch (err) {
      toast.error('SEO check failed', { description: (err as Error).message });
    } finally {
      setSeoLoading(false);
    }
  };

  const handleProceed = async () => {
    try {
      await callUpdateArticleStage(article.id, 'Watermark Removal');
      toast.success('Advanced to Watermark Removal');
    } catch (err) {
      toast.error('Advance failed', { description: (err as Error).message });
    }
  };

  return (
    <div className="rounded-xl border border-success/25 bg-gradient-to-r from-success/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
          <Camera className="h-4 w-4 text-success" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Photos + SEO Verification</p>
          <p className="text-[11px] text-success">Add images, then verify SEO</p>
        </div>
      </div>
      <div className="pl-12 mb-3 flex items-center gap-2 flex-wrap">
        {/* CMS-155: pull the images the source articles use, save picks to the
            Asset Library, amend with AI, insert into the article. */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] gap-1.5"
          onClick={() => setSourceImagesOpen(true)}
        >
          <Images className="h-3.5 w-3.5" />
          Source Images
          {selectedImageCount > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary">
              {selectedImageCount}
            </span>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Pull images from the source articles → save picks to the Library → amend with AI → insert into the article.
        </p>
      </div>
      <div className="pl-12">
        <SEOCheckPanel result={seoResult} loading={seoLoading} onRunCheck={handleRunSEO} onProceed={handleProceed} />
      </div>
      <SourceImagesDialog open={sourceImagesOpen} onOpenChange={setSourceImagesOpen} article={article} />
    </div>
  );
}

// ─── Stage 11: Final Approval (Human Gate) ────────────────────────────────────
function FinalApprovalStagePanel({ article }: { article: PipelineArticle }) {
  const [approving, setApproving] = useState(false);

  const handleApprove = async (checklist: Record<string, boolean>) => {
    setApproving(true);
    try {
      // Persist the checklist (server records approvedBy/approvedAt) before
      // advancing — the sign-off must be auditable, not just a stage change.
      // production: 'updateArticle' then 'updateArticleStage'
      await callUpdateArticle(article.id, { finalApprovalChecklist: checklist });
      await callUpdateArticleStage(article.id, 'Publish');
      toast.success('Approved — ready to publish!');
    } catch (err) {
      toast.error('Approval failed', { description: (err as Error).message });
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="rounded-xl border border-warning/30 bg-gradient-to-r from-warning/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
          <Shield className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Final Approval</p>
          <p className="text-[11px] text-amber-700 font-medium">⚡ Senior editor sign-off</p>
        </div>
      </div>
      <div className="pl-12 space-y-3">
        {/* AI card-tag scan (CMS-50) — suggests tags at approval time; the
            editor accepts/rejects suggestions or adds manual tags. Also shown
            at the Publish step. */}
        <CardTagSuggestions article={article} />
        <ApprovalChecklist article={article} onApprove={handleApprove} approving={approving} />
      </div>
    </div>
  );
}

// ─── Stage 6: Humanise (CMS-131) ─────────────────────────────────────────────
function HumaniseStagePanel({ article }: { article: PipelineArticle }) {
  const [advancing, setAdvancing] = useState(false);
  const { role } = useAuth();
  const canRun = role === Role.Admin || role === Role.Editor;
  const hStatus = article.humanise?.status;

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      // Server enforces the Humanise gate when the feature is enabled — only
      // humanised content passes to Review & Edit; a rejection surfaces here
      // as the honest reason.
      await callUpdateArticleStage(article.id, 'Review & Edit');
      toast.success('Moved to Review & Edit — editor reviews the humanised text');
    } catch (err) {
      toast.error('Cannot enter Review & Edit yet', { description: (err as Error).message });
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Humanise</p>
          <p className="text-[11px] text-accent font-medium">ZeroGPT scan → Gemma humanise pass → rescan</p>
        </div>
      </div>
      <div className="pl-12 space-y-3">
        <p className="text-[11px] text-muted-foreground max-w-md">
          The Claude-written draft is scanned by ZeroGPT, humanised by the Gemma pass, and scanned again —
          watch the AI score drop below. Only humanised content moves on to Review &amp; Edit, so the editor
          always reviews the final text. The pass runs automatically on the processing schedule; admins and
          editors can also start it immediately.
        </p>
        <div className="max-w-md">
          <HumaniseStatusBlock humanise={article.humanise} articleId={article.id} canRun={canRun} />
        </div>
        <Button
          onClick={handleAdvance}
          disabled={advancing || hStatus === 'zerogpt_processing' || hStatus === 'gemma_processing' || hStatus === 'validating'}
          size="sm"
          variant={hStatus === 'passed' ? 'default' : 'outline'}
        >
          {advancing ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Moving…</> : 'Move to Review & Edit'}
        </Button>
      </div>
    </div>
  );
}

// ─── Stage 9: Watermark Removal ───────────────────────────────────────────────
function WatermarkRemovalStagePanel({ article }: { article: PipelineArticle }) {
  const [advancing, setAdvancing] = useState(false);
  const { role } = useAuth();
  const canRetryProcessing = role === Role.Admin || role === Role.Editor;
  const fpStatus = article.finalProcessing?.status;

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      // Server enforces the AI Final Processing gate when the feature is
      // enabled — a rejection surfaces here as the honest reason.
      await callUpdateArticleStage(article.id, 'Fact Check');
      toast.success('Moved to Fact Check — Perplexity is verifying the facts');
    } catch (err) {
      toast.error('Cannot enter Fact Check yet', { description: (err as Error).message });
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Watermark Removal</p>
          <p className="text-[11px] text-accent font-medium">AI detection pass (ZeroGPT → Gemma 4 normalisation)</p>
        </div>
      </div>
      <div className="pl-12 space-y-3">
        <p className="text-[11px] text-muted-foreground max-w-md">
          Articles park here while the Gemma 4 pass runs — on the daily schedule, or immediately via
          the column's <span className="font-medium text-foreground">Wake &amp; Process Now</span> button
          (out-of-schedule GPU wake). The job switches off automatically when the queue drains. Fact
          Check and Final Approval happen after this step, so sign-off is always on the final text.
        </p>
        <div className="max-w-md">
          <FinalProcessingStatusBlock
            finalProcessing={article.finalProcessing}
            articleId={article.id}
            canRetry={canRetryProcessing}
          />
        </div>
        <Button
          onClick={handleAdvance}
          disabled={advancing || fpStatus === 'zerogpt_processing' || fpStatus === 'gemma_processing' || fpStatus === 'validating'}
          size="sm"
          variant={fpStatus === 'ready_to_publish' ? 'default' : 'outline'}
        >
          {advancing ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Moving…</> : 'Move to Fact Check'}
        </Button>
      </div>
    </div>
  );
}

// ─── Stage 10: Fact Check (CMS-161) ───────────────────────────────────────────
function FactCheckStagePanel({ article }: { article: PipelineArticle }) {
  const [advancing, setAdvancing] = useState(false);
  const { role } = useAuth();
  const canRun = role === Role.Admin || role === Role.Editor;
  const { factCheck, isChecking, run } = useFactCheck(article);

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      // Server enforces the fact-check gate — a fresh PASS recorded during
      // this stage visit is required; a rejection surfaces the honest reason.
      await callUpdateArticleStage(article.id, 'Final Approval');
      toast.success('Moved to Final Approval — ready for sign-off');
    } catch (err) {
      toast.error('Cannot enter Final Approval yet', { description: (err as Error).message });
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Fact Check</p>
          <p className="text-[11px] text-accent font-medium">Perplexity verifies every factual claim — runs automatically on entry</p>
        </div>
      </div>
      <div className="pl-12 space-y-3">
        <p className="text-[11px] text-muted-foreground max-w-md">
          The moment an article lands here, Perplexity audits its facts (numbers, dates, offer terms, program
          rules) against current sources. A <span className="font-medium text-foreground">PASS</span> unlocks Final
          Approval; a <span className="font-medium text-foreground">FAIL</span> sends the article back to Review
          &amp; Edit with the flagged claims as the fix list.
        </p>
        <div className="max-w-2xl">
          <FactCheckPanel factCheck={factCheck} isChecking={isChecking} onRun={() => void run()} canRun={canRun} />
        </div>
        <Button
          onClick={handleAdvance}
          disabled={advancing || isChecking}
          size="sm"
          variant={factCheck?.verdict === 'pass' ? 'default' : 'outline'}
        >
          {advancing ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Moving…</> : 'Move to Final Approval'}
        </Button>
      </div>
    </div>
  );
}

// ─── Stage 12: Publish ────────────────────────────────────────────────────────
function PublishStagePanel({ article }: { article: PipelineArticle }) {
  const [publishing, setPublishing] = useState(false);
  const [confirmConcern, setConfirmConcern] = useState<CompliancePublishConcern | null>(null);
  const { check, isStale, running, run } = useComplianceCheck(article);
  const { role } = useAuth();
  const canRetryProcessing = role === Role.Admin || role === Role.Editor;

  const executePublish = async () => {
    setPublishing(true);
    try {
      // publishToWebflow sets status AND stage to 'Published' server-side —
      // no follow-up stage call needed (it used to leave the article stuck at
      // stage 'Publish' if the second round-trip failed).
      // production: 'publishToWebflow'
      await callPublishToWebflow(article.id);
      toast.success('🎉 Published! Now being monitored.');
    } catch (err) {
      toast.error('Publish failed', { description: (err as Error).message });
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = () => {
    // Soft compliance gate: missing / stale / failed check asks for explicit
    // confirmation instead of hard-blocking the publish.
    if (!check) {
      setConfirmConcern('missing');
      return;
    }
    if (check.verdict === 'fail') {
      setConfirmConcern('fail');
      return;
    }
    if (isStale) {
      setConfirmConcern('stale');
      return;
    }
    void executePublish();
  };

  return (
    <div className="rounded-xl border border-success/30 bg-gradient-to-r from-success/10 to-transparent p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
          <Rocket className="h-4 w-4 text-success" />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">Ready to Publish</p>
          <p className="text-[11px] text-success">Deploy to Webflow + start monitoring</p>
        </div>
      </div>
      {/* AI card-tag scan — runs when the article arrives approved for publishing */}
      <div className="ml-12 mb-3">
        <CardTagSuggestions article={article} />
      </div>
      {/* Final pipeline step: audit against the compliance rules document */}
      <div className="ml-12 mb-3">
        <ComplianceCheckPanel check={check} isStale={isStale} running={running} onRun={run} />
      </div>
      {/* AI Final Processing — ZeroGPT + Gemma normalisation status (gate
          enforced server-side by publishToWebflow when enabled) */}
      <div className="ml-12 mb-3 max-w-md">
        <FinalProcessingStatusBlock
          finalProcessing={article.finalProcessing}
          articleId={article.id}
          canRetry={canRetryProcessing}
        />
      </div>
      <Button onClick={handlePublish} disabled={publishing || running} size="sm" className="ml-12">
        {publishing ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Publishing...</> : <><Rocket className="h-3.5 w-3.5 mr-2" /> Publish to Webflow</>}
      </Button>
      {confirmConcern && (
        <ConfirmPublishDialog
          open
          onOpenChange={(open) => { if (!open) setConfirmConcern(null); }}
          onConfirm={() => { setConfirmConcern(null); void executePublish(); }}
          concern={confirmConcern}
          check={check}
        />
      )}
    </div>
  );
}
