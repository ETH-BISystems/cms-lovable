import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw,
  Search, Flag, Link2, Plus, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { callAddToRefreshQueue, callUpdateArticle, type UpdateArticleUpdates } from '../services/articleService';
import type { PipelineArticle } from '../types';

interface MonitoringViewProps {
  articles: PipelineArticle[];
}

const HEALTH_STYLES = {
  healthy: { dot: 'bg-success', tone: 'success', label: 'Healthy' },
  monitor: { dot: 'bg-warning', tone: 'warning', label: 'Monitor' },
  attention: { dot: 'bg-destructive', tone: 'danger', label: 'Attention' },
} as const;

export function MonitoringView({ articles }: MonitoringViewProps) {
  const [search, setSearch] = useState('');
  const [flaggingId, setFlaggingId] = useState<string | null>(null);

  const publishedArticles = articles.filter(a => a.stage === 'Published');

  const filtered = search
    ? publishedArticles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
    : publishedArticles;

  const handleFlagForRefresh = async (articleId: string, title: string) => {
    setFlaggingId(articleId);
    try {
      // production: httpsCallable(functions, 'addToRefreshQueue')
      await callAddToRefreshQueue({
        articleId,
        title,
        refreshReason: 'Manual',
        priority: 'Medium',
      });
      toast.success('Flagged for refresh', { description: `"${title}" added to refresh queue.` });
    } catch (err) {
      toast.error('Failed to flag for refresh');
    } finally {
      setFlaggingId(null);
    }
  };

  if (publishedArticles.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
          <RefreshCw className="h-5 w-5 text-accent" />
        </div>
        <p className="text-sm text-muted-foreground">No published articles to monitor yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Articles enter monitoring after publishing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Published Articles — Health Monitoring</h2>
          <p className="text-xs text-muted-foreground">{publishedArticles.length} articles tracked. Weekly health checks via DataForSEO.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 w-48 text-xs" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(article => {
          const mon = article.monitoringData;
          const health = mon?.healthStatus || 'healthy';
          const style = HEALTH_STYLES[health];
          const triggers = mon?.refreshTriggers?.filter(t => !t.resolved) || [];
          const hasTriggers = triggers.length > 0;

          return (
            <div key={article.id} className={cn('bg-card rounded-lg border border-border/70 p-3 shadow-card', hasTriggers && 'border-l-4 border-l-destructive')}>
              <div className="flex items-center gap-3">
                {/* Health indicator */}
                <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', style.dot)} title={style.label} />

                {/* Article info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{article.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{article.primaryKeyword || article.targetKeyword}</span>
                    {article.publishedUrl && (
                      <a href={article.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-0.5">
                        <ExternalLink className="h-2.5 w-2.5" /> Live
                      </a>
                    )}
                  </div>
                </div>

                {/* Position */}
                <div className="text-center shrink-0 w-16">
                  <p className="text-[10px] text-muted-foreground">Position</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs font-semibold tabular-nums">{mon?.currentPosition ? `#${mon.currentPosition}` : '—'}</span>
                    {mon?.positionTrend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
                    {mon?.positionTrend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
                    {mon?.positionTrend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </div>

                {/* Traffic */}
                <div className="text-center shrink-0 w-16">
                  <p className="text-[10px] text-muted-foreground">Traffic</p>
                  <span className="text-xs font-semibold tabular-nums">{mon?.weeklyTraffic?.toLocaleString() || '—'}</span>
                </div>

                {/* Health badge */}
                <StatusBadge status={style.label} variant={style.tone} className="text-[10px] shrink-0" />

                {/* Alert */}
                {hasTriggers && (
                  <Badge variant="destructive" className="text-[9px] shrink-0 gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" /> {triggers.length}
                  </Badge>
                )}

                {/* Actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-accent shrink-0"
                  onClick={() => {
                    const url = prompt('Enter backlink URL:');
                    if (url?.trim()) {
                      // production: httpsCallable(functions, 'updateArticle') — top-level
                      // backlinks field (not wrapped in `updates`) preserved as-is
                      callUpdateArticle(article.id, { backlinks: [...(article as unknown as Record<string, unknown>).backlinks as string[] || [], url.trim()] } as unknown as UpdateArticleUpdates)
                        .then(() => toast.success('Backlink added'))
                        .catch(() => toast.error('Failed to add backlink'));
                    }
                  }}
                >
                  <Link2 className="h-3 w-3 mr-1" /> + Link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-muted-foreground shrink-0"
                  onClick={() => handleFlagForRefresh(article.id, article.title)}
                  disabled={flaggingId === article.id}
                >
                  <Flag className="h-3 w-3 mr-1" /> Refresh
                </Button>
              </div>

              {/* Trigger details */}
              {hasTriggers && (
                <div className="mt-2 pl-6 space-y-1">
                  {triggers.map(t => (
                    <div key={t.id} className="text-[10px] text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                      <span>{t.details}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
