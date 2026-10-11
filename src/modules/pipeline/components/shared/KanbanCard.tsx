import { useState } from 'react';
import {
  AlertTriangle, Check, Minus, DollarSign, ExternalLink,
  Clock, Rocket, Camera, Mic, RotateCw, ShieldCheck, ShieldX
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { PipelineArticle, ArticleStatus } from '../../types';

// === Small sub-components ===

function SourceBadge({ source, onClick }: { source: { type: string; label: string }; onClick?: (e: React.MouseEvent) => void }) {
  const styles: Record<string, string> = {
    RSS: 'bg-accent/15 text-accent',
    Keyword: 'bg-[hsl(258,90%,66%)]/15 text-[hsl(258,90%,66%)]',
    'URL Drop': 'bg-muted text-muted-foreground',
    'Original Idea': 'bg-muted text-muted-foreground',
  };
  const label = source.type === 'RSS' ? `RSS → ${source.label}`
    : source.type === 'Keyword' ? `Keyword → ${source.label}`
    : source.type;
  const hasUrl = source.type === 'RSS' && source.label;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[source.type] || 'bg-muted text-muted-foreground'} ${hasUrl ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={hasUrl ? onClick : undefined}
    >
      {label}
      {hasUrl && <ExternalLink className="w-2.5 h-2.5 ml-0.5" />}
    </span>
  );
}

function SubProgressDots({ steps }: { steps: Array<{ label: string; status: 'done' | 'active' | 'pending' }> }) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${
            (s.label === 'Images' || s.label === 'Social Embeds') && s.status === 'active' ? 'bg-warning animate-pulse' :
            s.label === 'Awaiting Experience' && s.status === 'active' ? 'bg-warning animate-pulse' :
            s.status === 'done' ? 'bg-success' : s.status === 'active' ? 'bg-accent animate-pulse' : 'bg-muted-foreground/30'
          }`} title={`${s.label}: ${s.status}`} />
          {i < steps.length - 1 && <div className="w-2 h-px bg-border" />}
        </div>
      ))}
    </div>
  );
}

function TaskProgressBar({ progress }: { progress: PipelineArticle['taskProgress'] }) {
  const color = progress.hasBlocked ? 'text-destructive' : progress.completed === progress.total ? 'text-success' : 'text-warning-foreground';
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      {progress.completed}/{progress.total} tasks
      {progress.hasBlocked && ' ⚠'}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const s = priority === 'High' ? 'bg-destructive/15 text-destructive' : priority === 'Medium' ? 'bg-warning/15 text-warning-foreground' : 'bg-success/15 text-success';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s}`}>{priority}</span>;
}

function QualityScoreRing({ score, size = 28 }: { score: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-muted" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={color} />
      </svg>
      <span className="absolute text-[8px] font-bold tabular-nums">{score}</span>
    </div>
  );
}

function ComplianceBadge({ ftcDisclosure, cardTermsVerified, disclaimerPresent }: { ftcDisclosure: boolean; cardTermsVerified: boolean; disclaimerPresent: boolean }) {
  const all = ftcDisclosure && cardTermsVerified && disclaimerPresent;
  const count = [ftcDisclosure, cardTermsVerified, disclaimerPresent].filter(Boolean).length;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${all ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning-foreground'}`}>
      {all ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {count}/3
    </span>
  );
}

function TimeAgo({ date, className }: { date: Date; className?: string }) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  let text = '';
  if (mins < 1) text = 'just now';
  else if (mins < 60) text = `${mins}m ago`;
  else if (hours < 24) text = `${hours}h ago`;
  else text = `${days}d ago`;
  return <span className={className}>{text}</span>;
}

// === Main KanbanCard ===

interface KanbanCardProps {
  article: PipelineArticle;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onClick?: () => void;
  onOpenTab?: (tab: string) => void;
  onStatusChange?: (id: string, status: ArticleStatus) => void;
}

export function KanbanCard({ article, onDragStart, onClick, onOpenTab, onStatusChange }: KanbanCardProps) {
  const showQuality = ['Write Article', 'Humanise', 'Review & Edit', 'Add Photos + SEO Check', 'Final Approval', 'Watermark Removal', 'Fact Check', 'Publish', 'Published', 'Needs Refresh', 'Refreshing'].includes(article.stage) && article.qualityScore > 0;
  const showCompliance = article.compliance && ['Review & Edit', 'Final Approval', 'Published'].includes(article.stage);
  const isAutoStage = ['Keyword Discovery', 'Deep Research', 'Write Article', 'Humanise', 'Watermark Removal', 'Fact Check'].includes(article.stage);
  // CMS-161: red flag when the Perplexity fact-check failed — most visible
  // in Review & Edit, where the auto-fail path sends the article for fixes.
  const factCheckFailed = article.factCheck?.verdict === 'fail';

  // CMS-130: ZeroGPT AI score next to the quality ring — the Humanise-stage
  // pair (Claude draft → humanised) wins while it exists; the pre-publish
  // AI Final Processing pair shows once the article is that far along.
  const zgSource =
    article.humanise && (article.humanise.initialAiScore != null || article.humanise.finalAiScore != null)
      ? article.humanise
      : article.finalProcessing && (article.finalProcessing.initialAiScore != null || article.finalProcessing.finalAiScore != null)
        ? article.finalProcessing
        : null;

  // Real schedule set from the Editorial Calendar; no schedule → no date shown.
  const scheduledDate = article.scheduledPublishDate ?? null;
  const scheduledTime = article.publishTime ?? '9:00 AM';
  const isOverdue = scheduledDate && article.status !== 'Published' ? scheduledDate < new Date() : false;

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, article.id) : undefined}
      onClick={onClick}
      className={`bg-card rounded-lg border border-border/70 p-3 shadow-card card-interactive cursor-grab active:cursor-grabbing active:shadow-raised group relative ${
        article.failedInfo ? 'border-destructive/40' : isOverdue ? 'border-destructive/40' : ''
      }`}
    >
      {/* Processing indicator for auto-stages */}
      {isAutoStage && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 w-fit mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[9px] font-medium">Processing</span>
        </div>
      )}
      {/* Failed fact-check flag (CMS-161) */}
      {factCheckFailed && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive w-fit mb-1.5">
          <ShieldX className="w-3 h-3" />
          <span className="text-[9px] font-medium">Fact check failed</span>
        </div>
      )}
      {/* Overdue badge for Approved */}
      {isOverdue && article.status === 'Approved' && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/15 text-destructive">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              onStatusChange?.(article.id, 'Published');
            }}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Rocket className="w-3 h-3" /> Publish Now
          </button>
        </div>
      )}

      {/* Title + blocked icon */}
      <div className="relative">
        <p className="text-[12px] font-semibold text-card-foreground line-clamp-2 leading-snug">{article.title}</p>
        {article.taskProgress?.hasBlocked && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="absolute -top-1 -right-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-[11px]">Blocked task(s)</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Refresh reason badge */}
      {article.refreshInfo && (
        <div className="mt-1">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
            article.refreshInfo.reason === 'AI Overview' ? 'bg-accent/15 text-accent' :
            article.refreshInfo.reason === 'Traffic Decay' ? 'bg-warning/15 text-warning-foreground' :
            article.refreshInfo.reason === 'SEO Audit' ? 'bg-[hsl(213,59%,45%)]/15 text-[hsl(213,59%,45%)]' :
            article.refreshInfo.reason === 'Low-Hanging Fruit' ? 'bg-success/15 text-success' :
            'bg-muted text-muted-foreground'
          }`}>
            {article.refreshInfo.reason}
          </span>
        </div>
      )}

      {/* Source badge */}
      <div className="mt-1.5">
        <SourceBadge source={article.source} onClick={e => { e.stopPropagation(); }} />
      </div>

      {/* Scheduled date for Approved */}
      {scheduledDate && !isOverdue && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Scheduled: {scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {scheduledTime}</span>
        </div>
      )}

      {/* Priority + Revenue + E-E-A-T */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <PriorityPill priority={article.priority} />
        {article.revenuePotential === 'high' && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/15 text-success">
            <DollarSign className="w-2.5 h-2.5" /> High
          </span>
        )}
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${article.hasExperience ? 'text-success' : 'text-muted-foreground'}`}>
          {article.hasExperience ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          E-E-A-T
        </span>
      </div>

      {/* Quality + Compliance + ZeroGPT (CMS-130) */}
      {(showQuality || showCompliance || zgSource) && (
        <div className="flex items-center gap-2 mt-2">
          {showQuality && <QualityScoreRing score={article.qualityScore} size={28} />}
          {zgSource && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                    zgSource.finalAiScore != null && zgSource.finalAiScore <= 40
                      ? 'bg-success/15 text-success'
                      : 'bg-warning/15 text-warning-foreground'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  ZG{' '}
                  {zgSource.initialAiScore != null && zgSource.finalAiScore != null
                    ? `${Math.round(zgSource.initialAiScore)}→${Math.round(zgSource.finalAiScore)}%`
                    : `${Math.round((zgSource.finalAiScore ?? zgSource.initialAiScore) as number)}%`}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-[11px]">
                  ZeroGPT AI score
                  {zgSource.initialAiScore != null && zgSource.finalAiScore != null
                    ? ` — ${Math.round(zgSource.initialAiScore)}% before humanising, ${Math.round(zgSource.finalAiScore)}% after`
                    : ' — detection complete'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {showCompliance && article.compliance && (
            <ComplianceBadge ftcDisclosure={article.compliance.ftcDisclosure} cardTermsVerified={article.compliance.cardTermsVerified} disclaimerPresent={article.compliance.disclaimerPresent} />
          )}
        </div>
      )}

      {/* Sub-progress */}
      {article.subProgress && <SubProgressDots steps={article.subProgress} />}

      {/* Images + Social Embeds needed badge */}
      {(article.imagesNeeded || article.socialEmbedsNeeded) && (
        <div
          className="flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded bg-warning/15 text-warning-foreground w-fit cursor-pointer hover:bg-warning/25 transition-colors"
          onClick={e => { e.stopPropagation(); onOpenTab?.('Tasks'); }}
        >
          <Camera className="w-3 h-3" />
          <span className="text-[10px] font-medium">
            {article.imagesNeeded && article.socialEmbedsNeeded ? '📷 Images + 📱 Embeds needed' :
             article.imagesNeeded ? '📷 Images needed' : '📱 Embeds needed'}
          </span>
        </div>
      )}

      {/* Awaiting Experience banner */}
      {article.awaitingExperience && (
        <div
          className="mt-1.5 flex items-center gap-1.5 px-2 py-1.5 rounded bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/15 transition-colors"
          onClick={e => { e.stopPropagation(); onOpenTab?.('Research Brief'); }}
        >
          <Mic className="w-3 h-3 text-warning-foreground shrink-0" />
          <span className="text-[10px] font-medium text-warning-foreground">Ready for your experience</span>
        </div>
      )}

      {/* Refresh info */}
      {article.refreshInfo && article.refreshInfo.detail && (
        <div className={`mt-2 rounded px-2 py-1.5 text-[10px] ${article.refreshInfo.severity === 'high' ? 'bg-destructive/5 border border-destructive/20' : 'bg-warning/5 border border-warning/20'}`}>
          <span className={`font-semibold ${article.refreshInfo.severity === 'high' ? 'text-destructive' : 'text-warning-foreground'}`}>{article.refreshInfo.reason}</span>
          <p className="text-muted-foreground mt-0.5 leading-snug">{article.refreshInfo.detail}</p>
          <button
            className="mt-1 text-[10px] font-medium text-accent hover:text-accent/80 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onStatusChange?.(article.id, 'Researching');
            }}
          >
            Start Refresh →
          </button>
        </div>
      )}

      {/* Failed info */}
      {article.failedInfo && (
        <div className="mt-2 flex items-start gap-1.5 bg-destructive/5 border border-destructive/20 rounded px-2 py-1.5">
          <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
          <div className="text-[10px]">
            <span className="font-semibold text-destructive">Failed: {article.failedInfo.stage}</span>
            <p className="text-muted-foreground">{article.failedInfo.error}</p>
            <button
              className="mt-1 text-[10px] font-medium text-accent flex items-center gap-0.5"
              onClick={e => { e.stopPropagation(); onClick?.(); }}
              title="Open the article to retry the failed stage"
            >
              <RotateCw className="w-2.5 h-2.5" /> Retry from Checkpoint
            </button>
          </div>
        </div>
      )}

      {/* Footer: assignee + keyword + time + tasks */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-primary text-white flex items-center justify-center text-[8px] font-medium shrink-0">{article.assignee.avatar}</div>
          <span className="text-[10px] text-muted-foreground truncate">{article.targetKeyword}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TaskProgressBar progress={article.taskProgress} />
          <TimeAgo date={article.stageEnteredAt} className="text-[10px] text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export { SourceBadge, PriorityPill, TaskProgressBar, QualityScoreRing, ComplianceBadge, TimeAgo, SubProgressDots };
