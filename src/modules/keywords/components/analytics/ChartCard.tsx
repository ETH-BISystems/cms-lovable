import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  /** Height of the loading skeleton, matches the chart body. */
  skeletonHeight?: number;
  actions?: ReactNode;
  children: ReactNode;
}

/** Card wrapper for a chart or table section with a consistent header. */
export function ChartCard({ title, description, loading, skeletonHeight = 288, actions, children }: ChartCardProps) {
  return (
    <Card className="animate-fade-up rounded-2xl border-0 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(3,43,52,0.06),0_12px_32px_-16px_rgba(3,43,52,0.18)] transition-shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_2px_4px_rgba(3,43,52,0.08),0_20px_48px_-16px_rgba(0,147,167,0.3)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-base font-semibold tracking-tight">{title}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="w-full rounded-lg" style={{ height: skeletonHeight }} /> : children}
      </CardContent>
    </Card>
  );
}
