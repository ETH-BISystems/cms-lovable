import { Bot, User } from 'lucide-react';
import type { Timestamp } from '@/services/timestamp';

interface DataProvenanceBarProps {
  source: 'scraped' | 'manual';
  timestamp: Timestamp | null | undefined;
  identity: string;
}

function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts?.toMillis) return 'Unknown';
  return new Date(ts.toMillis()).toLocaleString();
}

export function DataProvenanceBar({ source, timestamp, identity }: DataProvenanceBarProps) {
  if (source === 'manual') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-1.5 text-[13px]">
        <User className="h-3.5 w-3.5 text-amber-600" />
        <span className="font-medium text-amber-700">Manual Override</span>
        <span className="text-muted-foreground">by {identity}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{formatTimestamp(timestamp)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-[12px] text-muted-foreground">
      <Bot className="h-3.5 w-3.5" />
      <span>Auto-scraped</span>
      <span>·</span>
      <span>{identity}</span>
      <span>·</span>
      <span>{formatTimestamp(timestamp)}</span>
    </div>
  );
}
