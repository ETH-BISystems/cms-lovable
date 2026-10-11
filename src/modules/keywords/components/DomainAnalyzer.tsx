import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const QUICK_COMPETITORS = [
  { name: 'TPG', domain: 'thepointsguy.com' },
  { name: 'NerdWallet', domain: 'nerdwallet.com' },
  { name: 'OMAAT', domain: 'onemileatatime.com' },
  { name: 'Doctor of Credit', domain: 'doctorofcredit.com' },
  { name: 'Upgraded Points', domain: 'upgradedpoints.com' },
  { name: 'Bankrate', domain: 'bankrate.com' },
  { name: 'Frequent Miler', domain: 'frequentmiler.com' },
];

interface DomainAnalyzerProps {
  onAnalyze: (domain: string) => void;
  loading: boolean;
}

export function DomainAnalyzer({ onAnalyze, loading }: DomainAnalyzerProps) {
  const [domain, setDomain] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter competitor domain (e.g., thepointsguy.com)"
          className="flex-1"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && domain.trim() && onAnalyze(domain.trim())}
        />
        <Button onClick={() => onAnalyze(domain.trim())} disabled={!domain.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Analyze
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Quick select:</span>
        {QUICK_COMPETITORS.map((c) => (
          <Button
            key={c.domain}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setDomain(c.domain); onAnalyze(c.domain); }}
          >
            {c.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
