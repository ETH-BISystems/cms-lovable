import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SiteId } from '../../types';

const SITES: { id: SiteId; name: string; domain: string }[] = [
  { id: 'eth', name: 'Elite Travel Hackers', domain: 'elitetravelhackers.com' },
  { id: 'epm', name: 'Elite Points & Miles', domain: 'elitepointsandmiles.com' },
];

interface SiteSelectorProps {
  selectedSite: SiteId;
  onSiteChange: (site: SiteId) => void;
}

export function SiteSelector({ selectedSite, onSiteChange }: SiteSelectorProps) {
  const current = SITES.find((s) => s.id === selectedSite) ?? SITES[0];

  return (
    <Select value={selectedSite} onValueChange={(v) => onSiteChange(v as SiteId)}>
      <SelectTrigger className="w-[260px] h-9 text-[12px] font-medium">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{current.name}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SITES.map((site) => (
          <SelectItem key={site.id} value={site.id} className="text-[12px]">
            <div>
              <p className="font-medium">{site.name}</p>
              <p className="text-[10px] text-muted-foreground">{site.domain}</p>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
