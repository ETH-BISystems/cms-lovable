import { useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  audioStoragePath?: string;
  duration?: number;
  isPlaying?: boolean;
  activeItemId?: string;
  itemId: string;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioWaveform({
  duration = 0,
  isPlaying = false,
  activeItemId,
  itemId,
  onPlay,
  onPause,
  className,
}: AudioWaveformProps) {
  const isActive = activeItemId === itemId && isPlaying;

  // Generate consistent pseudo-random bars based on item ID
  const bars = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
      hash = ((hash << 5) - hash) + itemId.charCodeAt(i);
      hash |= 0;
    }
    return Array.from({ length: 40 }, (_, i) => {
      const seed = Math.abs(hash * (i + 1)) % 100;
      return 4 + (seed / 100) * 16;
    });
  }, [itemId]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={isActive ? onPause : onPlay}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground hover:bg-accent/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      <div className="flex-1 flex items-center gap-[2px] h-6">
        {bars.map((h, i) => (
          <div
            key={i}
            className={cn(
              'w-[3px] rounded-full transition-colors',
              isActive ? 'bg-accent' : 'bg-muted-foreground/30'
            )}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
        {formatDuration(duration)}
      </span>
    </div>
  );
}
