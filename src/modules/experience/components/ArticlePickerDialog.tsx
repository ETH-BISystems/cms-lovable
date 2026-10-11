import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { callAttachToArticle, callDetachFromArticle, subscribeToArticles } from '../services/experienceService';
import type { ArticlePickerDialogProps } from '../types';

interface ArticleItem {
  id: string;
  title: string;
  status: string;
}

/**
 * ArticlePickerDialog — modal dialog for searching and selecting articles to attach.
 */
export function ArticlePickerDialog({
  open,
  onClose,
  onSelect,
  currentAttachments,
  transcriptId,
}: ArticlePickerDialogProps) {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [attaching, setAttaching] = useState<string | null>(null);

  // Subscribe to articles collection
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    // production: onSnapshot(query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(50)))
    const unsubscribe = subscribeToArticles(
      (docs) => {
        const items: ArticleItem[] = docs.map((data) => ({
          id: data.id,
          title: data.title || 'Untitled',
          status: data.status || 'draft',
        }));
        setArticles(items);
        setLoading(false);
      },
      { limit: 50 }
    );

    return () => unsubscribe();
  }, [open]);

  // Client-side search
  const filteredArticles = searchQuery.trim()
    ? articles.filter((a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : articles;

  const handleAttach = async (articleId: string, articleTitle: string) => {
    if (!transcriptId) return;
    setAttaching(articleId);
    try {
      await callAttachToArticle(transcriptId, articleId);
      toast.success(`Attached to "${articleTitle}"`);
      onSelect(articleId, articleTitle);
    } catch (err) {
      console.error('[ArticlePickerDialog] Attach error:', err);
      toast.error('Failed to attach experience', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setAttaching(null);
    }
  };

  const handleDetach = async (articleId: string) => {
    if (!transcriptId) return;
    setAttaching(articleId);
    try {
      await callDetachFromArticle(transcriptId, articleId);
      toast.success('Experience detached');
    } catch (err) {
      console.error('[ArticlePickerDialog] Detach error:', err);
      toast.error('Failed to detach experience', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setAttaching(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach to Article</DialogTitle>
        </DialogHeader>

        {/* min-w-0: DialogContent is a grid — without it, long nowrap titles
            force the list wider than the dialog and rows overflow. */}
        <div className="space-y-4 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : filteredArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? 'No articles match your search.' : 'No articles found.'}
              </p>
            ) : (
              filteredArticles.map((article) => {
                const isAttached = currentAttachments.includes(article.id);
                return (
                  <div
                    key={article.id}
                    className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate" title={article.title}>{article.title}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {article.status}
                      </Badge>
                    </div>
                    {isAttached ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 shrink-0"
                        onClick={() => handleDetach(article.id)}
                        disabled={attaching === article.id}
                      >
                        <Unlink className="h-3 w-3 mr-1" /> Detach
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        onClick={() => handleAttach(article.id, article.title)}
                        disabled={attaching === article.id}
                      >
                        <Link2 className="h-3 w-3 mr-1" /> Attach
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
