import { useState } from 'react';
import { toast } from 'sonner';
import { Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from './shared/KanbanColumn';
import { WatermarkRemovalWakeButton } from '@/modules/ai-final-processing';
import { FactCheckRunButton } from './FactCheckRunButton';
import type { PipelineArticle, ArticleStatus, ArticleStage } from '../types';
import { HUMAN_GATE_STAGES, AUTO_STAGES, ACTION_STAGES, STAGE_ORDER, isValidStageTransition, KANBAN_COLUMNS } from '../types';

// 12-stage pipeline columns (CMS-131 added Humanise after Write Article;
// CMS-161 added Fact Check after Watermark Removal).
// CMS-153: config lives in types as KANBAN_COLUMNS so the column labels are
// guaranteed to match the stage names the in-article stepper renders.
const COLUMNS = KANBAN_COLUMNS;

interface KanbanBoardProps {
  articles: PipelineArticle[];
  onCardClick: (article: PipelineArticle) => void;
  onOpenTab: (article: PipelineArticle, tab: string) => void;
  onStatusChange: (id: string, status: ArticleStatus) => void;
  onStageChange?: (id: string, stage: ArticleStage) => void;
}

export function KanbanBoard({ articles, onCardClick, onOpenTab, onStatusChange, onStageChange }: KanbanBoardProps) {
  const [expandAll, setExpandAll] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: React.DragEvent, targetStage: ArticleStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (!id) return;

    const article = articles.find(a => a.id === id);
    if (!article) return;

    const currentStage = article.stage;
    if (currentStage === targetStage) { setDraggedId(null); return; }

    // Validate transition
    if (!isValidStageTransition(currentStage, targetStage)) {
      toast.error('Invalid stage transition', {
        description: `Cannot move from "${currentStage}" to "${targetStage}".`,
      });
      setDraggedId(null);
      return;
    }

    // Use new stage change handler if available, fallback to legacy
    if (onStageChange) {
      onStageChange(id, targetStage);
    } else {
      // Legacy fallback
      const STAGE_TO_STATUS: Record<string, ArticleStatus> = {
        'New Article': 'Discovered', 'Keyword Discovery': 'Discovered', 'Select Keywords': 'Discovered',
        'Deep Research': 'Researching', 'Write Article': 'Writing', 'Humanise': 'Writing', 'Review & Edit': 'In Review',
        'Add Photos + SEO Check': 'In Review', 'Final Approval': 'Approved', 'Watermark Removal': 'Approved', 'Fact Check': 'Approved', 'Publish': 'Approved',
        'Published': 'Published',
      };
      const mappedStatus = STAGE_TO_STATUS[targetStage];
      if (mappedStatus) onStatusChange(id, mappedStatus);
    }
    setDraggedId(null);
  };

  // Filter articles for pipeline board (exclude refresh/published lifecycle)
  const pipelineArticles = articles.filter(
    a => STAGE_ORDER.includes(a.stage)
  );

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-1"
          onClick={() => setExpandAll(prev => !prev)}
        >
          {expandAll ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          {expandAll ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
        {COLUMNS.map(col => {
          const columnArticles = pipelineArticles.filter(a => a.stage === col.stage);
          return (
            <KanbanColumn
              key={col.stage}
              status={col.stage as unknown as ArticleStatus}
              label={col.label}
              color={col.color}
              articles={columnArticles}
              onDragStart={handleDragStart}
              onDrop={(e) => handleDrop(e, col.stage)}
              onCardClick={onCardClick}
              onOpenTab={onOpenTab}
              onStatusChange={onStatusChange}
              expandAll={expandAll}
              headerExtra={
                col.stage === 'Watermark Removal' ? <WatermarkRemovalWakeButton /> :
                col.stage === 'Fact Check' ? <FactCheckRunButton articles={columnArticles} /> :
                undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
