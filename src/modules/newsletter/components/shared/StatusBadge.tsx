import { Badge } from '@/components/ui/badge';
import type { EditionStatus } from '../../types/index';

const STATUS_STYLES: Record<EditionStatus, string> = {
  Curating: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  Writing: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  'In Review': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  Approved: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
  Ready: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
  Scheduled: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
  Sent: 'bg-green-100 text-green-800 hover:bg-green-100',
  Draft: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  Cancelled: 'bg-gray-200 text-gray-500 hover:bg-gray-200',
  'Send Failed': 'bg-red-100 text-red-800 hover:bg-red-100',
};

interface StatusBadgeProps {
  status: EditionStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={`${STATUS_STYLES[status]} ${className}`}>
      {status}
    </Badge>
  );
}
