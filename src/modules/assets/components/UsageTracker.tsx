/**
 * UsageTracker Component
 *
 * Displays where an asset is used (articles, cards, etc.)
 * Fetches usage from asset's 'usage' subcollection.
 */

import React, { useEffect, useState } from 'react';
import { listAssetUsage } from '../services/assetService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

export interface UsageEntry {
  id: string;
  articleId: string;
  articleTitle: string;
  context: string;
  status: string;
  addedAt: Date;
}

export interface UsageTrackerProps {
  assetId: string;
}

export function UsageTracker({ assetId }: UsageTrackerProps) {
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        setLoading(true);
        const entries = await listAssetUsage(assetId);
        setUsage(
          entries.map((entry) => ({
            id: entry.id,
            articleId: entry.articleId,
            articleTitle: entry.articleTitle,
            context: entry.context,
            status: entry.status,
            addedAt: entry.addedAt?.toDate() || new Date(),
          }))
        );
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [assetId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading usage...</p>
        </CardContent>
      </Card>
    );
  }

  if (usage.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This asset is not currently used in any articles
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage ({usage.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {usage.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={`/articles/${entry.articleId}`}
                    className="font-medium hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {entry.articleTitle}
                  </a>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {entry.context}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {entry.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Added {entry.addedAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
