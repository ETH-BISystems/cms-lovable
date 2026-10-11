import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  loading?: boolean;
}

/** Large-number stat card used at the top of every analytics page. */
export function MetricCard({ label, value, sub, icon: Icon, loading }: MetricCardProps) {
  return (
    <Card className="group animate-fade-up rounded-2xl border-0 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(3,43,52,0.06),0_12px_32px_-16px_rgba(3,43,52,0.18)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(3,43,52,0.08),0_20px_48px_-16px_rgba(0,147,167,0.35)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <p className="mt-1.5 font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
        )}
        {sub && !loading && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
