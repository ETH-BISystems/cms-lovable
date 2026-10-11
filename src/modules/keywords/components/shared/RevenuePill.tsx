import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RevenuePotential } from '../../types';

interface RevenuePillProps {
  revenue: RevenuePotential;
  className?: string;
}

const REVENUE_STYLES: Record<RevenuePotential, string> = {
  High: 'bg-green-100 text-green-800 hover:bg-green-100',
  Medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  Low: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
};

export function RevenuePill({ revenue, className }: RevenuePillProps) {
  return (
    <Badge variant="secondary" className={cn('text-xs font-medium', REVENUE_STYLES[revenue], className)}>
      ${revenue}
    </Badge>
  );
}
