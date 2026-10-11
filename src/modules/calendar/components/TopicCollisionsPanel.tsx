import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TopicCollision } from '../types';

interface TopicCollisionsPanelProps {
  collisions: TopicCollision[];
  onDismiss?: (id: string) => void;
  onDismissAll?: () => void;
  onReschedule?: (articleId: string) => void;
}

export function TopicCollisionsPanel({
  collisions,
  onDismiss,
  onDismissAll,
  onReschedule,
}: TopicCollisionsPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <TriangleAlert className="h-3.5 w-3.5 text-destructive" />
        Topic Collisions
        {collisions.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground"
            onClick={onDismissAll}
          >
            Dismiss All
          </Button>
        )}
      </div>

      {collisions.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center animate-fade-in">
          <TriangleAlert className="h-4 w-4 text-muted-foreground/50" />
          <p className="text-[12px] text-muted-foreground">
            No topic collisions detected
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {collisions.map((collision) => (
            <div
              key={collision.id}
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs space-y-1.5"
            >
              <p className="text-destructive">{collision.message}</p>

              <div className="flex flex-wrap gap-1.5">
                {collision.type === 'topic_overlap' ? (
                  <>
                    {collision.articles.map((article) => (
                      <Button
                        key={article.id}
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-6 px-2"
                        onClick={() => onReschedule?.(article.id)}
                      >
                        Reschedule "{article.title.slice(0, 20)}…"
                      </Button>
                    ))}
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">
                      Ride the Wave
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">
                      Avoid Competition
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => onDismiss?.(collision.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
