import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { toast } from 'sonner';
import { callUpdateArticleStage } from '../services/articleService';
import {
  Link2, ChevronRight, ChevronDown, BarChart3, KanbanSquare, List, Sparkles, Search,
  Plus, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineContext } from '../context/PipelineContext';
import { useArticleDetailContext } from '../context/ArticleDetailContext';
import { useNewArticleModal } from '../hooks/useNewArticleModal';
import { NewArticleModal } from './NewArticleModal';
import { useArticleMutations } from '../hooks/useArticleMutations';
import { useLinkSuggestions } from '../hooks/useLinkSuggestions';
import { KanbanBoard } from './KanbanBoard';
import { ListView } from './shared/ListView';
import { FilterBar } from './shared/FilterBar';
import { BulkActionBar } from './shared/BulkActionBar';
import { LinkSuggestions } from './LinkSuggestions';
import { AiProcessingQueueBanner } from '@/modules/ai-final-processing';
import { QualityScoreRing, TimeAgo } from './shared/KanbanCard';
import type { PipelineArticle, ArticleStatus, ArticleStage } from '../types';

// === URL Drop Zone ===
function UrlDropZone({ onCreateArticle }: { onCreateArticle: (prefill: { title: string; sourceUrls?: Array<{ url: string; type: string }> }) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && pasted.startsWith('http')) {
      e.preventDefault();
      const fakeTitle = pasted.replace(/https?:\/\/(www\.)?/, '').split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Untitled';
      onCreateArticle({ title: fakeTitle, sourceUrls: [{ url: pasted, type: 'Competitor Article' }] });
      setUrl('');
      setCollapsed(true);
    }
  };

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} className="w-full flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-border bg-card shadow-card hover:border-solid hover:bg-muted/30 transition-all duration-150 text-[12px] text-muted-foreground">
        <Link2 className="w-3.5 h-3.5" /> Paste a URL to research <ChevronRight className="w-3 h-3 ml-auto" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-dashed border-border bg-card shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.04)] transition-all duration-150 hover:border-solid focus-within:border-solid focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
      <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        value={url}
        onChange={e => setUrl(e.target.value)}
        onPaste={handlePaste}
        placeholder="Paste a URL to start researching..."
        className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-[13px] placeholder:text-muted-foreground outline-none"
      />
    </div>
  );
}

// === Top 10 Recommendations ===
function Top10Recommendations() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Recommendations are populated from keyword gap analysis / AI recommendations.
  // No data source exists yet, so the panel shows an empty state — never mock data.
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="bg-card rounded-lg border border-border p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <div className="text-left">
              <h3 className="text-[13px] font-semibold text-card-foreground">This Week's Top 10 Recommendations</h3>
              <p className="text-[11px] text-muted-foreground">AI-suggested articles based on keyword opportunities, competitor gaps, and seasonal timing</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-card rounded-b-lg border border-t-0 border-border">
          <div className="flex flex-col items-center py-6 text-center">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-[12px] text-muted-foreground">AI recommendations will appear here based on your keyword research and competitor gaps</p>
            <p className="text-[11px] text-muted-foreground mt-1">Run keyword gap analysis in the Keywords module to generate suggestions</p>
          </div>
          <div className="px-4 py-3 border-t border-border">
            <button onClick={() => navigate('/keywords')} className="text-[11px] font-medium text-accent hover:text-accent/80 transition-colors">View all opportunities →</button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// === Recently Updated ===
function RecentlyUpdated({ articles, onCardClick, onViewAll }: { articles: PipelineArticle[]; onCardClick: (a: PipelineArticle) => void; onViewAll: () => void }) {
  const recent = useMemo(() => [...articles].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 6), [articles]);

  if (recent.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-semibold text-foreground">Recently Updated</h3>
        <button onClick={onViewAll} className="text-[11px] text-primary hover:text-primary/80 transition-colors">View All</button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-1">
        {recent.map(a => (
          <div key={a.id} onClick={() => onCardClick(a)} className="flex-shrink-0 w-[220px] bg-card rounded-lg border border-border/70 p-3 shadow-card card-interactive cursor-pointer">
            <p className="text-[12px] font-semibold text-card-foreground line-clamp-1">{a.title}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge
                status={a.stage}
                variant={
                  a.stage === 'Published' ? 'success' :
                  ['Select Keywords', 'Review & Edit', 'Final Approval'].includes(a.stage) ? 'warning' :
                  ['Keyword Discovery', 'Deep Research', 'Write Article', 'Humanise', 'Watermark Removal', 'Fact Check'].includes(a.stage) ? 'info' :
                  'neutral'
                }
                className="px-1.5 py-0 text-[10px]"
              />
              {!['New Article', 'Keyword Discovery', 'Select Keywords', 'Deep Research'].includes(a.stage) && a.qualityScore > 0 && <QualityScoreRing score={a.qualityScore} size={28} />}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-primary text-white flex items-center justify-center text-[9px] font-medium">{a.assignee.avatar}</div>
              <TimeAgo date={a.updatedAt} className="text-[12px] text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Pipeline Stats Popover ===
function PipelineStats({ articles }: { articles: PipelineArticle[] }) {
  const inPipeline = articles.filter(a => a.status !== 'Published' && a.status !== 'Archived').length;
  const publishedThisWeek = articles.filter(a => a.status === 'Published' && a.stageEnteredAt.getTime() > Date.now() - 7 * 86400000).length;
  const withExperience = articles.filter(a => a.hasExperience).length;
  const pct = articles.length ? Math.round((withExperience / articles.length) * 100) : 0;
  const blockedArticles = articles.filter(a => a.taskProgress.hasBlocked).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Pipeline Stats
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-2" align="end">
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Pipeline Stats</p>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between"><span className="text-muted-foreground">In Pipeline</span><span className="font-semibold text-card-foreground">{inPipeline}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Avg Days to Publish</span><span className="font-semibold text-card-foreground">8.3</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Published This Week</span><span className="font-semibold text-card-foreground">{publishedThisWeek}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">With Experience</span><span className="font-semibold text-card-foreground">{pct}%</span></div>
          {blockedArticles > 0 && (
            <>
              <div className="border-t border-border my-1" />
              <div className="flex justify-between"><span className="text-destructive">Blocked Tasks</span><span className="font-semibold text-destructive">{blockedArticles}</span></div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


// === New Article FAB (Floating Action Button) ===
function NewArticleFab({ onCreateArticle, recentArticles, onArticleClick }: {
  onCreateArticle: (prefill?: { title?: string; sourceUrls?: Array<{ url: string; type: string }> }) => void;
  recentArticles: PipelineArticle[];
  onArticleClick: (article: PipelineArticle) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState('');
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setExpanded(false);
    };
    if (expanded) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  const handleGo = () => {
    const trimmed = url.trim();
    setExpanded(false);
    setUrl('');
    if (trimmed) {
      const urlObj = (() => { try { return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`); } catch { return null; } })();
      const pathParts = urlObj?.pathname.split('/').filter(Boolean) || [];
      const slugTitle = pathParts[pathParts.length - 1]?.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || '';
      onCreateArticle({
        title: slugTitle,
        sourceUrls: [{ url: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`, type: 'Competitor Article' }],
      });
    } else {
      onCreateArticle();
    }
  };

  const recent = useMemo(
    () => [...recentArticles].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 4),
    [recentArticles]
  );

  return (
    <div ref={fabRef} className="fixed bottom-6 right-6 z-40">
      {expanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-card border border-border rounded-xl shadow-raised p-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleGo(); }}
                placeholder="Paste URL or press Go to start..."
                className="h-9 w-full text-[12px] pl-8 pr-2 rounded-md border border-input bg-background outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
            <Button size="sm" onClick={handleGo} className="h-9 px-3 bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          {recent.length > 0 && (
            <div>
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Recently Updated</p>
              <div className="space-y-0.5 max-h-[140px] overflow-y-auto">
                {recent.map(article => (
                  <button key={article.id} onClick={() => { setExpanded(false); onArticleClick(article); }}
                    className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors w-full text-left">
                    <span className="text-card-foreground truncate max-w-[200px]">{article.title}</span>
                    <TimeAgo date={article.updatedAt} className="text-muted-foreground text-[10px] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => expanded ? handleGo() : setExpanded(true)}
        className="w-14 h-14 rounded-full bg-amber-700 text-white shadow-raised hover:bg-amber-800 hover:shadow-overlay flex items-center justify-center transition-all hover:scale-105"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}


// === Main Pipeline Page ===
export function PipelinePage() {
  const { articles, pipelineArticles, loading, error, refetch, filters, setFilter, clearFilters, applyFilters } = usePipelineContext();
  const { openPanel } = useArticleDetailContext();
  const { openModal, isOpen: isNewArticleOpen, closeModal, prefillData } = useNewArticleModal();
  const { updateStatus, updateArticle } = useArticleMutations();
  const linkSuggestions = useLinkSuggestions();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const boardRef = useRef<HTMLDivElement>(null);

  const filteredArticles = useMemo(() => applyFilters(pipelineArticles), [pipelineArticles, applyFilters]);

  const handleCardClick = (article: PipelineArticle) => {
    if (article.id) {
      // No explicit tab — the panel lands on the stage's working surface
      // (Deep Research → Research Brief, Write Article → Content Preview, …)
      // with the tab set scoped to that stage (CMS-153).
      openPanel(article.id, false);
    }
  };

  const handleOpenTab = (article: PipelineArticle, tab: string) => {
    openPanel(article.id, false, tab);
  };

  const handleStatusChange = (id: string, status: ArticleStatus) => {
    updateStatus(id, status).catch(() => {
      // error toast handled in useArticleMutations
    });
  };

  const handleStageChange = (id: string, stage: string) => {
    // production: httpsCallable(functions, 'updateArticleStage')
    callUpdateArticleStage(id, stage as ArticleStage).then(() => {
      toast.success(`Moved to ${stage}`);
    }).catch((err) => {
      toast.error('Stage change failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    });
  };

  // Bulk mutation runner: awaits every call, reports partial failures honestly
  // instead of toasting success while some writes are still failing.
  const runBulk = async (
    mutate: (id: string) => Promise<unknown>,
    successMessage: (n: number) => { title: string; description: string }
  ) => {
    const ids = [...selected];
    setSelected(new Set());
    const results = await Promise.allSettled(ids.map(id => mutate(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === 0) {
      const msg = successMessage(ids.length);
      toast.success(msg.title, { description: msg.description });
    } else if (failed < ids.length) {
      toast.warning('Partially completed', { description: `${ids.length - failed} succeeded, ${failed} failed.` });
    } else {
      toast.error('Bulk action failed', { description: `All ${ids.length} updates failed.` });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredArticles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredArticles.map(a => a.id)));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-[280px] shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-sm text-destructive">Failed to load pipeline articles</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-foreground">Pipeline</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage articles from discovery to publication</p>
        </div>
        <div className="flex items-center gap-2">
          <PipelineStats articles={pipelineArticles} />
          <Button onClick={() => openModal()} className="bg-accent text-accent-foreground hover:bg-accent/90">
            + New Article
          </Button>
        </div>
      </div>

      {/* URL Drop Zone */}
      <UrlDropZone onCreateArticle={(prefill) => openModal(prefill as any)} />

      {/* Recently Updated */}
      <RecentlyUpdated
        articles={pipelineArticles}
        onCardClick={handleCardClick}
        onViewAll={() => {
          setViewMode('list');
          setTimeout(() => boardRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }}
      />

      {/* AI Final Processing queue — wake Gemma 4 for the backlog */}
      <AiProcessingQueueBanner />

      {/* Filters + View Toggle */}
      <div ref={boardRef} className="flex items-end justify-between gap-4">
        <FilterBar filters={filters} onFilterChange={setFilter} onClear={clearFilters} />
        <div className="flex bg-muted rounded-md p-0.5 shrink-0">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${viewMode === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <KanbanSquare className="w-3.5 h-3.5" /> Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      {/* Kanban or List View */}
      {filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-card rounded-xl border border-border/70 shadow-card animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Search className="w-5 h-5 text-accent" />
          </div>
          <p className="text-sm text-muted-foreground">No articles in the pipeline yet</p>
          <Button onClick={() => openModal()} className="bg-accent text-accent-foreground hover:bg-accent/90">Create Article</Button>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          articles={filteredArticles}
          onCardClick={handleCardClick}
          onOpenTab={handleOpenTab}
          onStatusChange={handleStatusChange}
          onStageChange={handleStageChange}
        />
      ) : (
        <ListView
          articles={filteredArticles}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          onRowClick={handleCardClick}
          onBlockedClick={(a) => openPanel(a.id)}
        />
      )}

      {/* Bulk Action Bar (List view only) */}
      {viewMode === 'list' && (
        <BulkActionBar
          selectedCount={selected.size}
          onChangeStatus={(status) => void runBulk(
            (id) => updateStatus(id, status),
            (n) => ({ title: 'Status updated', description: `${n} articles moved to ${status}.` })
          )}
          onChangePriority={(priority) => void runBulk(
            (id) => updateArticle(id, { priority }),
            (n) => ({ title: 'Priority updated', description: `${n} articles set to ${priority}.` })
          )}
          onReassign={(name) => {
            const avatar = name.split(' ').map(w => w[0]).join('');
            void runBulk(
              (id) => updateArticle(id, { assignee: { name, avatar } }),
              (n) => ({ title: 'Reassigned', description: `${n} articles reassigned to ${name}.` })
            );
          }}
          onDelete={() => void runBulk(
            (id) => updateStatus(id, 'Archived'),
            (n) => ({ title: 'Articles removed', description: `${n} articles archived.` })
          )}
          onClose={() => setSelected(new Set())}
        />
      )}

      {/* Top 10 Articles to Write This Week — visible in both views */}
      <Top10Recommendations />

      {/* Link Suggestions */}
      <LinkSuggestions
        suggestions={linkSuggestions.suggestions}
        onApprove={linkSuggestions.approve}
        onReject={linkSuggestions.reject}
        onUndo={linkSuggestions.undo}
        onBulkApprove={linkSuggestions.bulkApprove}
        onBulkReject={linkSuggestions.bulkReject}
        onEditAnchor={linkSuggestions.updateAnchor}
        onOpenArticle={(title) => {
          const match = pipelineArticles.find(a => a.title === title);
          if (match) openPanel(match.id);
        }}
        counts={linkSuggestions.counts}
        subtitle="Internal links from older articles to new pillar content"
      />

      {/* New Article Modal */}
      <NewArticleModal
        open={isNewArticleOpen}
        onClose={closeModal}
        onSubmit={async (data) => {
          try {
            const { callCreateArticle } = await import('../services/articleService');
            const { toast } = await import('sonner');
            await callCreateArticle(data);
            toast.success('Article created');
            closeModal();
          } catch (err) {
            console.error('[Pipeline] Create article failed:', err);
            const { toast } = await import('sonner');
            toast.error('Failed to create article', {
              description: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }}
        onSaveDraft={async (data) => {
          // CMS-149: same create path, draft flag relaxes the keyword
          // requirement — the card waits in the New Article column.
          try {
            const { callCreateArticle } = await import('../services/articleService');
            const { toast } = await import('sonner');
            await callCreateArticle(data);
            toast.success('Draft saved', {
              description: `"${data.title}" is in the New Article column — open it any time to finish the brief.`,
            });
            closeModal();
          } catch (err) {
            console.error('[Pipeline] Save draft failed:', err);
            const { toast } = await import('sonner');
            toast.error('Failed to save draft', {
              description: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }}
        prefillData={prefillData}
        loading={false}
      />

      {/* Article Detail Panel is rendered once at the route level by ArticleDetailPanelHost */}

      {/* Floating Action Button (URL Drop + New Article) */}
      <NewArticleFab
        onCreateArticle={(prefill) => openModal(prefill as any)}
        recentArticles={pipelineArticles}
        onArticleClick={handleCardClick}
      />
    </div>
  );
}
