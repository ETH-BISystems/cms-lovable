import { Link } from '@/lib/router-compat';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { useCardUsage } from '../../hooks/useCardUsage';
import type { CardDocument } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardArticlesTabProps {
  card: CardDocument;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date | null | undefined): string {
  if (!date) return '—';
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/** 'ready_to_publish' → 'Ready to publish' */
function stageLabel(stage?: string): string {
  if (!stage) return '—';
  const pretty = stage.replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Articles that tag this card (articles.cardTags — suggested by AI at the
 * Publish step, confirmed by an editor). Live view of the `articles`
 * collection; titles deep-link into the Pipeline article panel.
 */
export function CardArticlesTab({ card }: CardArticlesTabProps) {
  const { articles, loading, error } = useCardUsage(card.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Articles referencing <strong className="text-foreground">{card.name}</strong>
          {!loading && articles.length > 0 && (
            <> — <strong className="text-foreground">{articles.length}</strong> found</>
          )}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2 py-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-8 bg-muted animate-pulse rounded" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-red-500/30 rounded-lg bg-red-500/5">
          <p className="text-sm text-red-600">Failed to load articles: {error.message}</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-border rounded-lg bg-muted/10">
          <p className="text-sm text-muted-foreground">No articles reference this card.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Articles tag the cards they cover at the Publish step — confirmed tags appear here.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-blue-50/50 dark:bg-muted/30">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Article Title</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Pipeline Stage</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Published</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article, i) => (
                <tr
                  key={article.id}
                  className={`border-b border-border hover:bg-blue-50/30 dark:hover:bg-muted/30 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/pipeline?article=${article.id}`}
                      className="text-teal-600 hover:underline font-medium text-left text-xs"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    {article.stage ? (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {stageLabel(article.stage)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {article.publishedUrl ? (
                      <a
                        href={article.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-600 hover:underline text-xs"
                      >
                        Live <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not published</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">{timeAgo(article.updatedAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
