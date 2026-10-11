import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SerpFeature } from '../../types';

interface SerpFeaturePillsProps {
  features: SerpFeature[];
  className?: string;
}

const ABBREVIATIONS: Record<SerpFeature, string> = {
  'Featured Snippet': 'FS',
  PAA: 'PAA',
  'Knowledge Panel': 'KP',
  'Image Pack': 'Img',
  Video: 'Vid',
  'Top Stories': 'TS',
  'Local Pack': 'LP',
  Shopping: 'Shop',
};

export function SerpFeaturePills({ features, className }: SerpFeaturePillsProps) {
  if (features.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={`flex flex-wrap gap-1 ${className ?? ''}`}>
        {features.map((feature) => (
          <Tooltip key={feature}>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 cursor-default">
                {ABBREVIATIONS[feature]}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{feature}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
