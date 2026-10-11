import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';

interface ExplorerSearchBarProps {
  onSearch: (seed: string) => void;
  onBulkSearch: () => void;
  recentSearches: string[];
  loading: boolean;
}

const SUGGESTED_SEEDS = [
  'best travel credit cards',
  'chase sapphire preferred',
  'amex platinum benefits',
  'airline miles transfer',
  'hotel loyalty programs',
];

export function ExplorerSearchBar({
  onSearch,
  onBulkSearch,
  recentSearches,
  loading,
}: ExplorerSearchBarProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter a seed keyword to explore..."
            className="pl-9"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <Button onClick={handleSubmit} disabled={loading || !value.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
        <Button variant="outline" onClick={onBulkSearch}>
          Bulk Search
        </Button>
      </div>

      {recentSearches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Recent:</span>
          {recentSearches.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="cursor-pointer hover:bg-muted"
              onClick={() => { setValue(s); onSearch(s); }}
            >
              {s}
            </Badge>
          ))}
        </div>
      )}

      {recentSearches.length === 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Suggested:</span>
          {SUGGESTED_SEEDS.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="cursor-pointer hover:bg-muted"
              onClick={() => { setValue(s); onSearch(s); }}
            >
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
