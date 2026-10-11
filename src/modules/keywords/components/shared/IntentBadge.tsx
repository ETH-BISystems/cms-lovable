import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { KeywordIntent } from '../../types';

interface IntentBadgeProps {
  intent: KeywordIntent;
  className?: string;
}

const INTENT_STYLES: Record<KeywordIntent, string> = {
  Informational: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  Commercial: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  Transactional: 'bg-green-100 text-green-800 hover:bg-green-100',
  Navigational: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
};

export function IntentBadge({ intent, className }: IntentBadgeProps) {
  return (
    <Badge variant="secondary" className={cn('text-xs font-medium', INTENT_STYLES[intent], className)}>
      {intent}
    </Badge>
  );
}
