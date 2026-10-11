/**
 * ArticlePicker Component
 *
 * Popover content for assigning assets to articles.
 * Features:
 * - Search bar for filtering articles
 * - Two tabs: "New Articles" (pipeline) and "Refresh Queue"
 * - Full mode: sub-options "Set as Featured Image" or "Add as Inline Image"
 * - Inline-only mode: directly adds as inline image (used in bulk actions)
 * - Draft-asset guard: shows error toast if user tries to assign a draft asset
 *
 * Matches Lovable prototype's ArticlePickerContent.
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { addAssetToArticle, listPickerArticles } from '../services/assetService';
import type { UsageContext, AssetStatus } from '../types';

interface PipelineArticle {
  id: string;
  title: string;
  status: string;
  keyword: string;
  assignee: string;
  pipeline: 'new' | 'refresh';
}

export interface ArticlePickerProps {
  /** 'full' shows featured/inline sub-options; 'inline-only' adds directly as inline */
  mode?: 'full' | 'inline-only';
  /** Asset IDs to assign */
  assetIds: string[];
  /** Status of the asset(s) — used for draft guard */
  assetStatus?: AssetStatus;
  /** Called after successful assignment */
  onComplete: () => void;
}

export function ArticlePicker({
  mode = 'full',
  assetIds,
  assetStatus,
  onComplete,
}: ArticlePickerProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'new' | 'refresh'>('new');
  const [selectedArticle, setSelectedArticle] = useState<PipelineArticle | null>(null);
  const [articles, setArticles] = useState<PipelineArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch articles (production: Firestore `articles` collection query)
  useEffect(() => {
    let cancelled = false;

    async function fetchArticles() {
      try {
        const fetched = await listPickerArticles();
        if (!cancelled) {
          setArticles(fetched);
        }
      } catch (err) {
        console.warn('Failed to fetch articles for picker:', err);
        // Fall back to empty — the picker will show "No articles found"
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchArticles();
    return () => { cancelled = true; };
  }, []);

  // Draft guard
  const handleAssign = async (
    article: PipelineArticle,
    context: UsageContext
  ) => {
    // Check if any asset is draft
    if (assetStatus === 'draft') {
      toast.error(
        'Cannot assign draft asset to article. Complete AI intake first.'
      );
      return;
    }

    try {
      for (const assetId of assetIds) {
        await addAssetToArticle({
          assetId,
          articleId: article.id,
          context,
        });
      }

      const label = context === 'featured' ? 'featured image' : 'inline image';
      if (assetIds.length === 1) {
        toast.success(`Image added to "${article.title}" as ${label}`);
      } else {
        toast.success(
          `${assetIds.length} images added to "${article.title}" as ${label}`
        );
      }
      onComplete();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to assign asset';
      toast.error(message);
    }
  };

  // Sub-options view (full mode only)
  if (selectedArticle && mode === 'full') {
    return (
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-foreground truncate">
          {selectedArticle.title}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-7 justify-start gap-2"
          onClick={() => {
            handleAssign(selectedArticle, 'featured');
            setSelectedArticle(null);
          }}
        >
          Set as Featured Image
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-7 justify-start gap-2"
          onClick={() => {
            handleAssign(selectedArticle, 'inline');
            setSelectedArticle(null);
          }}
        >
          Add as Inline Image
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs h-6"
          onClick={() => setSelectedArticle(null)}
        >
          ← Back
        </Button>
      </div>
    );
  }

  // Filter articles by tab and search
  const filteredArticles = articles.filter((a) => {
    const matchesTab = tab === 'new' ? a.pipeline === 'new' : a.pipeline === 'refresh';
    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.keyword.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-0">
      {/* Search */}
      <div className="p-2 border-b">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="h-7 text-xs"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab('new')}
          className={`flex-1 text-xs py-1.5 font-medium border-b-2 transition-colors ${
            tab === 'new'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          New Articles
        </button>
        <button
          onClick={() => setTab('refresh')}
          className={`flex-1 text-xs py-1.5 font-medium border-b-2 transition-colors ${
            tab === 'refresh'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          Refresh Queue
        </button>
      </div>

      {/* Article list */}
      <div className="max-h-[200px] overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Loading articles...
          </p>
        ) : filteredArticles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No articles found
          </p>
        ) : (
          filteredArticles.map((article) => (
            <button
              key={article.id}
              className="w-full text-left px-3 py-2 hover:bg-accent/5 border-b border-border/50 last:border-0 transition-colors"
              onClick={() => {
                if (mode === 'inline-only') {
                  handleAssign(article, 'inline');
                } else {
                  setSelectedArticle(article);
                }
              }}
            >
              <p className="text-xs font-medium text-foreground truncate">
                {article.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="secondary"
                  className="text-[9px] h-4 px-1.5 border-0"
                >
                  {article.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground truncate">
                  {article.keyword}
                </span>
                <span className="text-[10px] ml-auto bg-muted rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {article.assignee.charAt(0).toUpperCase()}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
