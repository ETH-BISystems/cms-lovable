import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Pencil, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { callUpdateArticle, callPublishToWebflow, callUpdateArticleStage } from '../services/articleService';

interface RefreshDiffViewProps {
  articleId: string;
  articleTitle: string;
  originalContent: string;
  refreshedContent: string;
  changePercent: number;
  onApproved: () => void;
  onRejected: () => void;
}

/**
 * Side-by-side diff view for article refresh.
 * Shows original vs. refreshed content with approve/reject actions.
 */
export function RefreshDiffView({
  articleId,
  articleTitle,
  originalContent,
  refreshedContent,
  changePercent,
  onApproved,
  onRejected,
}: RefreshDiffViewProps) {
  const [publishing, setPublishing] = useState(false);

  const originalWordCount = originalContent.replace(/<[^>]+>/g, ' ').split(/\s+/).length;
  const refreshedWordCount = refreshedContent.replace(/<[^>]+>/g, ' ').split(/\s+/).length;

  const handleApproveAndPublish = async () => {
    setPublishing(true);
    try {
      // production: 'updateArticle' → 'publishToWebflow' → 'updateArticleStage'
      // Save refreshed content to article
      await callUpdateArticle(articleId, { content: refreshedContent });
      // Re-publish to Webflow
      await callPublishToWebflow(articleId);
      // Return to Published stage
      await callUpdateArticleStage(articleId, 'Published');
      toast.success('Refresh approved and re-published');
      onApproved();
    } catch (err) {
      toast.error('Re-publish failed', { description: (err as Error).message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Refresh Review: {articleTitle}</h3>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary" className="text-[9px]">{changePercent}% changed</Badge>
            <span className="text-[10px] text-muted-foreground">{originalWordCount} → {refreshedWordCount} words</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={onRejected}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
          <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={handleApproveAndPublish} disabled={publishing}>
            {publishing ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Publishing...</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Re-publish</>}
          </Button>
        </div>
      </div>

      {/* Diff display */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase">Original</p>
          <div className="border border-border rounded-lg p-3 max-h-[400px] overflow-y-auto prose prose-sm text-[11px] bg-red-50/30">
            <div dangerouslySetInnerHTML={{ __html: originalContent.slice(0, 3000) }} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase">Refreshed</p>
          <div className="border border-accent/30 rounded-lg p-3 max-h-[400px] overflow-y-auto prose prose-sm text-[11px] bg-green-50/30">
            <div dangerouslySetInnerHTML={{ __html: refreshedContent.slice(0, 3000) }} />
          </div>
        </div>
      </div>

      {changePercent > 30 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <p className="text-[11px] text-amber-700 font-medium">⚠ Word count changed by {changePercent}% — exceeds the 30% minor refresh threshold. Review carefully.</p>
        </div>
      )}
    </div>
  );
}
