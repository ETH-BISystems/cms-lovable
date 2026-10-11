import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { KanbanCard } from './KanbanCard';
import type { PipelineArticle, ArticleStatus } from '../../types';

const MAX_VISIBLE_CARDS = 5;

interface KanbanColumnProps {
  status: ArticleStatus;
  label: string;
  color: string;
  articles: PipelineArticle[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: ArticleStatus) => void;
  onCardClick: (article: PipelineArticle) => void;
  onOpenTab: (article: PipelineArticle, tab: string) => void;
  onStatusChange: (id: string, status: ArticleStatus) => void;
  expandAll: boolean;
  /** Optional slot rendered under the header (e.g. the Watermark Removal
   * column's wake button) — stays visible regardless of card count. */
  headerExtra?: React.ReactNode;
}

export function KanbanColumn({
  status, label, color, articles, onDragStart, onDrop, onCardClick, onOpenTab, onStatusChange, expandAll, headerExtra,
}: KanbanColumnProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = expandAll || localExpanded;
  const hiddenCount = articles.length - MAX_VISIBLE_CARDS;
  const visibleArticles = isExpanded ? articles : articles.slice(0, MAX_VISIBLE_CARDS);

  return (
    <div
      className="flex-shrink-0 w-[280px] flex flex-col bg-muted/40 rounded-xl"
      onDragOver={e => e.preventDefault()}
      onDrop={e => onDrop(e, status)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[13px] font-semibold text-foreground truncate">{label}</span>
        </span>
        <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums shrink-0">{articles.length}</span>
      </div>
      {headerExtra}
      {/* Cards */}
      <div className={`space-y-2 px-2 pb-2 rounded-b-xl ${isExpanded ? 'overflow-y-auto max-h-[calc(100vh-350px)] scrollbar-thin' : ''}`}>
        {visibleArticles.map(a => (
          <KanbanCard
            key={a.id}
            article={a}
            onDragStart={onDragStart}
            onClick={() => onCardClick(a)}
            onOpenTab={(tab) => onOpenTab(a, tab)}
            onStatusChange={onStatusChange}
          />
        ))}
        {articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <Inbox className="w-5 h-5 text-muted-foreground/40 mb-1.5" />
            <p className="text-[12px] text-muted-foreground">No articles</p>
          </div>
        )}
        {hiddenCount > 0 && (
          <button
            onClick={() => setLocalExpanded(prev => !prev)}
            className="w-full text-center py-2 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors rounded-md hover:bg-accent/5"
          >
            {isExpanded ? 'Show less' : `+ ${hiddenCount} more article${hiddenCount > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}
