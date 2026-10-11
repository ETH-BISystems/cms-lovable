import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';

const KNOWN_COMPETITORS = [
  'TPG', 'NerdWallet', 'OMAAT', 'Doctor of Credit',
  'Upgraded Points', 'Bankrate', 'Frequent Miler',
];

const COMPETITOR_DOMAINS: Record<string, string> = {
  TPG: 'thepointsguy.com',
  NerdWallet: 'nerdwallet.com',
  OMAAT: 'onemileatatime.com',
  'Doctor of Credit': 'doctorofcredit.com',
  'Upgraded Points': 'upgradedpoints.com',
  Bankrate: 'bankrate.com',
  'Frequent Miler': 'frequentmiler.com',
};

interface CompetitorSelectorProps {
  onCompare: (competitors: string[]) => void;
  loading: boolean;
}

export function CompetitorSelector({ onCompare, loading }: CompetitorSelectorProps) {
  const [competitors, setCompetitors] = useState<string[]>(['', '', '', '']);

  const setCompetitor = (index: number, value: string) => {
    setCompetitors((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const clearCompetitor = (index: number) => {
    setCompetitor(index, '');
  };

  const addQuickCompetitor = (name: string) => {
    const domain = COMPETITOR_DOMAINS[name];
    if (!domain) return;
    const emptyIndex = competitors.findIndex((c) => !c);
    if (emptyIndex >= 0) {
      setCompetitor(emptyIndex, domain);
    }
  };

  const activeCompetitors = competitors.filter(Boolean);
  const isCompetitorSelected = (name: string) =>
    competitors.includes(COMPETITOR_DOMAINS[name] ?? '');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="default" className="text-sm py-1 px-3">
          elitetravelhackers.com
        </Badge>
        <span className="text-muted-foreground text-sm">vs</span>
        {competitors.map((comp, i) => (
          <div key={i} className="relative">
            <Input
              placeholder={`Competitor ${i + 1}`}
              className="w-48 pr-8"
              value={comp}
              onChange={(e) => setCompetitor(i, e.target.value)}
            />
            {comp && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => clearCompetitor(i)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        <Button
          onClick={() => onCompare(activeCompetitors)}
          disabled={activeCompetitors.length === 0 || loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Compare Keywords
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Quick add:</span>
        {KNOWN_COMPETITORS.map((name) => (
          <Button
            key={name}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={isCompetitorSelected(name)}
            onClick={() => addQuickCompetitor(name)}
          >
            {name}
          </Button>
        ))}
      </div>
    </div>
  );
}
