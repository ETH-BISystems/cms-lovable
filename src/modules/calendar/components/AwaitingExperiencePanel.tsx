import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { AwaitingExperienceItem } from '../hooks/useAwaitingExperience';

interface AwaitingExperiencePanelProps {
  articles: AwaitingExperienceItem[];
  onRecordNow?: (article: AwaitingExperienceItem) => void;
}

export function AwaitingExperiencePanel({
  articles,
  onRecordNow,
}: AwaitingExperiencePanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <AlertCircle className="h-3.5 w-3.5 text-warning" />
        Awaiting Experience
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center animate-fade-in">
          <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
          <p className="text-[12px] text-muted-foreground">
            No articles awaiting experience input
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center gap-2 rounded-lg p-1.5 text-xs hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={article.assignee.avatar} alt={article.assignee.name} />
                <AvatarFallback className="text-[8px]">
                  {article.assignee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{article.title}</p>
                <p className="text-[11px] text-muted-foreground">{article.daysWaiting}d waiting</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-6 px-2 shrink-0"
                onClick={() => onRecordNow?.(article)}
              >
                Record Now
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
