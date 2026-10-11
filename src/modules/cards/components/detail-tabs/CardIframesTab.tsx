import { Link } from '@/lib/router-compat';
import { Badge } from '@/components/ui/badge';
import { getIframeTypeInfo } from '@/modules/iframes';
import { useCardUsage } from '../../hooks/useCardUsage';
import type { CardDocument, CardUsageIframe } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardIframesTabProps {
  card: CardDocument;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date | null | undefined): string {
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
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
  return `${Math.floor(months / 12)}y ago`;
}

function typeLabel(type: string): string {
  return getIframeTypeInfo(type)?.label ?? type;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Iframe instances embedding this card (iframe_instances.cards[]) and where
 * each instance is placed (hosts[] — article content fields or other cards'
 * HTML fields). Live view of the `iframe_instances` collection; instances
 * themselves are managed in the iFrame Manager (/iframes).
 */
export function CardIframesTab({ card }: CardIframesTabProps) {
  const { iframes, loading, error } = useCardUsage(card.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Iframe embeds using <strong className="text-foreground">{card.name}</strong>
          {!loading && iframes.length > 0 && (
            <> — <strong className="text-foreground">{iframes.length}</strong> found</>
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
          <p className="text-sm text-red-600">Failed to load iframe embeds: {error.message}</p>
        </div>
      ) : iframes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-border rounded-lg bg-muted/10">
          <p className="text-sm text-muted-foreground">Not embedded anywhere.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Iframe instances including this card (complementary-cards, offer-history, …) appear here.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-blue-50/50 dark:bg-muted/30">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Embed Type</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Instance</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Embedded In</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {iframes.map((instance, i) => (
                <InstanceRow key={instance.id} instance={instance} selfCardId={card.id} even={i % 2 === 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Instance Row ─────────────────────────────────────────────────────────────

function InstanceRow({ instance, selfCardId, even }: { instance: CardUsageIframe; selfCardId: string; even: boolean }) {
  return (
    <tr className={`border-b border-border hover:bg-blue-50/30 dark:hover:bg-muted/30 ${even ? 'bg-muted/20' : ''}`}>
      <td className="px-3 py-2.5">
        <Badge variant="outline" className="text-[10px] font-normal">{typeLabel(instance.type)}</Badge>
      </td>
      <td className="px-3 py-2.5">
        <span className="font-mono text-[11px] text-muted-foreground" title={instance.id}>
          {instance.id.slice(0, 8)}…
        </span>
      </td>
      <td className="px-3 py-2.5">
        {instance.hosts.length === 0 ? (
          <span className="text-xs text-muted-foreground/70 italic">Not placed anywhere</span>
        ) : (
          <div className="flex flex-col gap-1">
            {instance.hosts.map((host, j) => (
              <span key={j} className="text-xs inline-flex items-center gap-1.5 flex-wrap">
                {host.collection === 'articles' ? (
                  <Link to={`/pipeline?article=${host.docId}`} className="text-teal-600 hover:underline font-medium">
                    {host.title || host.docId}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">
                    {host.docId === selfCardId ? `${host.title || 'This card'} (this card)` : host.title || host.docId}
                  </span>
                )}
                {host.field && (
                  <span className="text-muted-foreground/70 font-mono text-[10px]">· {host.field}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground">{timeAgo(instance.updatedAt)}</span>
      </td>
    </tr>
  );
}
