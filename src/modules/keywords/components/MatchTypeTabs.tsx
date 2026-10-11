import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface MatchTypeTabsProps {
  activeType: string;
  onTypeChange: (type: string) => void;
  counts?: Record<string, number>;
}

const MATCH_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'broad', label: 'Broad Match' },
  { value: 'phrase', label: 'Phrase Match' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'related', label: 'Related' },
  { value: 'question', label: 'Questions' },
];

const QUESTION_TYPES = [
  { type: 'what', color: 'border-l-blue-500' },
  { type: 'how', color: 'border-l-green-500' },
  { type: 'why', color: 'border-l-purple-500' },
  { type: 'is', color: 'border-l-orange-500' },
  { type: 'can', color: 'border-l-red-500' },
  { type: 'does', color: 'border-l-yellow-500' },
  { type: 'where', color: 'border-l-teal-500' },
  { type: 'when', color: 'border-l-pink-500' },
  { type: 'which', color: 'border-l-indigo-500' },
];

export function MatchTypeTabs({ activeType, onTypeChange, counts }: MatchTypeTabsProps) {
  return (
    <div className="space-y-2">
      <Tabs value={activeType} onValueChange={onTypeChange}>
        <TabsList>
          {MATCH_TYPES.map((mt) => (
            <TabsTrigger key={mt.value} value={mt.value} className="gap-1">
              {mt.label}
              {counts?.[mt.value] != null && (
                <Badge variant="secondary" className="text-[10px] px-1 h-4 ml-1">
                  {counts[mt.value]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activeType === 'question' && (
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((qt) => (
            <Badge
              key={qt.type}
              variant="outline"
              className={`border-l-4 ${qt.color} text-xs`}
            >
              {qt.type}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
