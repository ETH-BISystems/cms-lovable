import { useEffect, useState } from 'react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardArticle as Article, DashboardRefreshItem as RefreshItem, DashboardKeyword as Keyword, DashboardTask as Task } from '../services/dashboardService';
import { useAuth } from '@/modules/auth';
import { HumanizerStatusWidget } from '@/modules/ai-final-processing';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/router-compat';
import {
  Activity, Eye, TrendingUp, Users, Mail, RefreshCw, CreditCard, GitPullRequest,
  PenLine, Sparkles, AlertTriangle, ArrowRight,
} from 'lucide-react';

const PIPELINE_STATUSES = [
  { key: 'Researching', label: 'Researching', color: 'bg-accent' },
  { key: 'Writing', label: 'Writing', color: 'bg-success' },
  { key: 'In Review', label: 'In Review', color: 'bg-warning' },
  { key: 'Published', label: 'Published', color: 'bg-info' },
  { key: 'Needs Refresh', label: 'Needs Refresh', color: 'bg-destructive' },
];

const TASK_STATUS_STYLES: Record<string, string> = {
  'Pending': 'bg-warning/10 text-warning',
  'In Progress': 'bg-info/10 text-info',
  'Blocked': 'bg-destructive/10 text-destructive',
  'Complete': 'bg-success/10 text-success',
};

function getRelativeDue(d: Date | null): { text: string; overdue: boolean } {
  if (!d) return { text: '', overdue: false };
  const diff = Math.round((d.getTime() - Date.now()) / 86400000);
  if (diff < -1) return { text: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === -1) return { text: '1d overdue', overdue: true };
  if (diff === 0) return { text: 'Today', overdue: false };
  if (diff === 1) return { text: 'Tomorrow', overdue: false };
  return { text: `${diff}d`, overdue: false };
}

function getDiffColor(kd: number) {
  if (kd <= 30) return 'bg-success';
  if (kd <= 60) return 'bg-warning';
  return 'bg-destructive';
}

export function DashboardPage() {
  const { user, userProfile } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [refreshQueue, setRefreshQueue] = useState<RefreshItem[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to articles
  useEffect(() => {
    const unsub = dashboardService.subscribeToArticles((next) => {
      setArticles(next);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Subscribe to refresh-queue
  useEffect(() => {
    const unsub = dashboardService.subscribeToRefreshQueue(setRefreshQueue);
    return unsub;
  }, []);

  // Subscribe to keywords
  useEffect(() => {
    const unsub = dashboardService.subscribeToTopKeywords(setKeywords);
    return unsub;
  }, []);

  // Subscribe to tasks for current user
  useEffect(() => {
    const name = userProfile?.displayName || user?.displayName || '';
    if (!name) return;
    const unsub = dashboardService.subscribeToTasksFor(name, setTasks);
    return unsub;
  }, [userProfile?.displayName, user?.displayName]);

  // Compute pipeline counts
  const counts: Record<string, number> = {};
  articles.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
  const totalArticles = articles.length;
  const publishedCount = counts['Published'] || 0;
  const needsRefreshCount = counts['Needs Refresh'] || 0;
  const inReviewCount = counts['In Review'] || 0;

  const displayName = userProfile?.displayName || user?.displayName || 'there';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Welcome back, {displayName}. Here's your content engine overview.</p>
      </div>

      {/* KPI Stat Cards — Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-5 bg-card border border-border/70 shadow-card card-interactive">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[12px] font-medium text-muted-foreground pt-1">Publishing Velocity</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[26px] font-display font-semibold text-card-foreground leading-tight">{publishedCount}</div>
          <span className="text-[12px] text-muted-foreground">Published articles</span>
        </div>

        <div className="rounded-xl p-5 bg-card border border-border/70 shadow-card card-interactive">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[12px] font-medium text-muted-foreground pt-1">Total Articles</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[26px] font-display font-semibold text-card-foreground leading-tight">{totalArticles}</div>
          <span className="text-[12px] text-muted-foreground">Across all stages</span>
        </div>

        <div className="rounded-xl p-5 bg-card border border-border/70 shadow-card card-interactive">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[12px] font-medium text-muted-foreground pt-1">Keywords on Page 1</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[26px] font-display font-semibold text-card-foreground leading-tight">{keywords.length > 0 ? keywords.filter(k => k.opportunityScore > 70).length : 0}</div>
          <span className="text-[12px] text-muted-foreground">High-opportunity keywords</span>
        </div>

        <div className="rounded-xl p-5 bg-card border border-border/70 shadow-card card-interactive">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[12px] font-medium text-muted-foreground pt-1">Pipeline Bottleneck</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <GitPullRequest className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[26px] font-display font-semibold text-card-foreground leading-tight">{inReviewCount} In Review</div>
          <span className="text-[12px] text-muted-foreground">{needsRefreshCount > 0 && <span className="text-destructive">⚠ {needsRefreshCount} need refresh</span>}</span>
        </div>
      </div>

      {/* Row 2 — Alert cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl p-5 bg-card border border-border/70 shadow-card card-interactive">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[12px] font-medium text-accent pt-1">Articles Needing Refresh</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[26px] font-display font-semibold text-card-foreground leading-tight">{needsRefreshCount + refreshQueue.length}</div>
          <span className="text-[12px] text-muted-foreground">In queue + flagged</span>
        </div>

        <div className="relative overflow-hidden rounded-xl p-5 bg-card border border-border/70 shadow-card card-interactive">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-warning" />
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[12px] font-medium text-warning pt-1">Tasks Assigned</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[26px] font-display font-semibold text-card-foreground leading-tight">{tasks.length}</div>
          <span className="text-[12px] text-muted-foreground">Your active tasks</span>
        </div>

        <div className="relative overflow-hidden rounded-xl p-5 bg-card border border-border/70 shadow-card card-interactive">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-success" />
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[12px] font-medium text-success pt-1">Refresh Queue</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[26px] font-display font-semibold text-card-foreground leading-tight">{refreshQueue.length}</div>
          <span className="text-[12px] text-muted-foreground">Articles queued</span>
        </div>

        <div className="relative overflow-hidden rounded-xl p-5 bg-card border border-border/70 shadow-card card-interactive">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-info" />
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[12px] font-medium text-info pt-1">Newsletter</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[26px] font-display font-semibold text-card-foreground leading-tight">—</div>
          <span className="text-[12px] text-muted-foreground">Connect Beehiiv for data</span>
        </div>
      </div>

      {/* AI Humanizer — global runner status, schedule across timezones, out-of-schedule wake */}
      <HumanizerStatusWidget />

      {/* Pipeline Status */}
      <section>
        <h2 className="text-[16px] font-semibold text-foreground mb-3">Pipeline Status</h2>
        <div className="bg-card rounded-xl border border-border/70 shadow-card p-5">
          {totalArticles === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center animate-fade-in">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <GitPullRequest className="h-4 w-4" />
              </div>
              <p className="text-[14px] font-medium text-foreground">No articles in the pipeline yet.</p>
              <p className="text-[12px] text-muted-foreground mt-1">Create your first article from the Pipeline page.</p>
            </div>
          ) : (
            <>
              {/* Stacked bar */}
              <div className="flex h-7 w-full gap-1 rounded-full bg-muted/60 p-1 mb-3">
                {PIPELINE_STATUSES.map(({ key, color }) => {
                  const count = counts[key] || 0;
                  if (count === 0) return null;
                  const pct = (count / totalArticles) * 100;
                  return (
                    <div key={key} className={cn('flex items-center justify-center rounded-full text-[11px] font-semibold text-white transition-all duration-200', color)} style={{ width: `${pct}%` }}>
                      {pct > 8 && count}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5">
                {PIPELINE_STATUSES.map(({ key, label, color }) => (
                  <div key={key} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <div className={cn('w-2 h-2 rounded-full', color)} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              {/* Refresh Queue */}
              <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-[12px] font-semibold text-foreground">
                    Refresh Queue — {refreshQueue.length} article{refreshQueue.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {refreshQueue.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No articles in the refresh queue.</p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {refreshQueue.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-[12px]">
                          <span className="text-foreground">{item.title}</span>
                          <span className="text-destructive font-medium">{item.refreshReason}</span>
                        </div>
                      ))}
                    </div>
                    <Link to="/pipeline/refresh" className="group mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline underline-offset-4">
                      View Full Refresh Queue <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Two columns: Keywords + My Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left 60%: Top Keyword Opportunities */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[16px] font-semibold text-foreground">Top Keyword Opportunities</h2>
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            </div>
            <Link to="/keywords" className="group inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline underline-offset-4">
              View All <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="bg-card rounded-xl border border-border/70 shadow-card divide-y divide-border/70 overflow-hidden">
            {keywords.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center animate-fade-in">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-[14px] font-medium text-foreground">No keyword data yet.</p>
                <p className="text-[12px] text-muted-foreground mt-1">Import keywords from the Keywords page.</p>
              </div>
            ) : (
              keywords.map((kw, i) => (
                <div key={kw.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[11px] font-semibold flex items-center justify-center shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-card-foreground truncate">{kw.keyword}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">Vol <span className="font-medium text-card-foreground">{kw.searchVolume.toLocaleString()}</span></span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        KD
                        <span className="inline-block w-8 h-1.5 bg-muted rounded-full overflow-hidden"><span className={cn('block h-full rounded-full', getDiffColor(kw.keywordDifficulty))} style={{ width: `${kw.keywordDifficulty}%` }} /></span>
                        <span className="font-medium text-card-foreground">{kw.keywordDifficulty}</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{kw.serpFeatures}</span>
                      <span className="text-[11px] text-muted-foreground">Score <span className="font-semibold text-accent">{kw.opportunityScore}</span></span>
                    </div>
                  </div>
                  <Link to={`/keywords?keyword=${encodeURIComponent(kw.keyword)}`} className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-accent bg-accent/10 hover:bg-accent/20 px-2.5 py-1.5 rounded-md transition-colors">
                    <PenLine className="h-3 w-3" /> Research
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 40%: My Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold text-foreground">My Tasks</h2>
            <Link to="/my-tasks" className="group inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline underline-offset-4">
              View All Tasks <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="bg-card rounded-xl border border-border/70 shadow-card divide-y divide-border/70 overflow-hidden">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center animate-fade-in">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Users className="h-4 w-4" />
                </div>
                <p className="text-[14px] font-medium text-foreground">No tasks assigned to you yet.</p>
              </div>
            ) : (
              tasks.map(task => {
                const { text: dueText, overdue } = getRelativeDue(task.dueDate);
                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-card-foreground truncate">{task.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{task.taskType}</span>
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', TASK_STATUS_STYLES[task.status] || 'bg-muted text-muted-foreground')}>{task.status}</span>
                      </div>
                    </div>
                    {dueText && (
                      <span className={cn('text-[11px] whitespace-nowrap shrink-0', overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>{dueText}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
