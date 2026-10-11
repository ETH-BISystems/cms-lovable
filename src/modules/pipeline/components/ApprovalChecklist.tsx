import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Rocket, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineArticle } from '../types';

interface ApprovalChecklistProps {
  article: PipelineArticle;
  /** Receives the full checklist state so approval can persist it for audit. */
  onApprove: (checklist: Record<string, boolean>) => void;
  approving?: boolean;
}

interface CheckItem {
  id: string;
  label: string;
  autoDetected: boolean;
  detected: boolean;
}

export function ApprovalChecklist({ article, onApprove, approving }: ApprovalChecklistProps) {
  const [manualChecks, setManualChecks] = useState<Set<string>>(new Set());

  const items: CheckItem[] = [
    {
      id: 'content',
      label: 'Content reviewed and approved',
      autoDetected: true,
      detected: !!article.content && article.content.length > 100,
    },
    {
      id: 'images',
      label: 'Images added with alt text',
      autoDetected: true,
      detected: !!article.content && (article.content.match(/<img/gi) || []).length > 0,
    },
    {
      id: 'seo',
      label: 'SEO verification completed',
      autoDetected: true,
      detected: !!article.seoCheckResult?.checkedAt,
    },
    {
      id: 'metadata',
      label: 'Meta title and description complete',
      autoDetected: true,
      detected: !!article.metaTitle && !!article.metaDescription,
    },
    {
      id: 'schema',
      label: 'Schema markup present',
      autoDetected: true,
      detected: !!article.schemaMarkup && article.schemaMarkup.length > 10,
    },
  ];

  const isChecked = (item: CheckItem) => item.detected || manualChecks.has(item.id);
  const allChecked = items.every(item => isChecked(item));

  const toggleCheck = (id: string) => {
    setManualChecks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Final Approval Checklist</h3>
        <p className="text-xs text-muted-foreground">All items must be checked before publishing. Auto-detected items are pre-checked.</p>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const checked = isChecked(item);
          return (
            <button
              key={item.id}
              onClick={() => !item.detected && toggleCheck(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left',
                checked ? 'border-accent/30 bg-accent/5' : 'border-border hover:bg-muted/50'
              )}
            >
              {checked ? (
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={cn('text-xs', checked ? 'text-foreground' : 'text-muted-foreground')}>{item.label}</span>
              {item.autoDetected && item.detected && (
                <span className="ml-auto text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">Auto-detected</span>
              )}
            </button>
          );
        })}
      </div>

      <Button
        onClick={() => onApprove(Object.fromEntries(items.map(item => [item.id, isChecked(item)])))}
        disabled={!allChecked || approving}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {approving ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
        ) : (
          <><Rocket className="h-4 w-4 mr-2" /> Approve & Publish</>
        )}
      </Button>

      {!allChecked && (
        <p className="text-[10px] text-muted-foreground text-center">
          {items.filter(i => !isChecked(i)).length} item(s) remaining
        </p>
      )}
    </div>
  );
}
