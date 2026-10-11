import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CpcTrend } from '../../types';

interface CpcTrendIndicatorProps {
  cpc: number;
  trend: CpcTrend;
  className?: string;
}

const TREND_CONFIG: Record<CpcTrend, { icon: typeof TrendingUp; color: string }> = {
  rising: { icon: TrendingUp, color: 'text-green-600' },
  falling: { icon: TrendingDown, color: 'text-red-600' },
  stable: { icon: Minus, color: 'text-gray-500' },
};

export function CpcTrendIndicator({ cpc, trend, className }: CpcTrendIndicatorProps) {
  const { icon: Icon, color } = TREND_CONFIG[trend];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-sm tabular-nums">${cpc.toFixed(2)}</span>
      <Icon className={cn('h-3.5 w-3.5', color)} />
    </div>
  );
}
