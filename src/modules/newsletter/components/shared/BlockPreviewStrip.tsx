import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ContentBlock, ContentBlockType } from '../../types/index';

const BLOCK_COLORS: Record<ContentBlockType, string> = {
  'Card Alert': 'bg-blue-500',
  'Deal Alert': 'bg-red-500',
  'Lead Story': 'bg-purple-500',
  'Article Spotlight': 'bg-indigo-500',
  'Quick Hits': 'bg-amber-500',
  'Transfer Bonus': 'bg-teal-500',
  'Transfer Bonus Watch': 'bg-cyan-500',
  'Tip of the Day': 'bg-green-500',
  'Personal Note': 'bg-pink-500',
  'Partner Highlight': 'bg-orange-500',
  'Affiliate Feature': 'bg-yellow-500',
  Custom: 'bg-gray-500',
  Divider: 'bg-gray-300',
};

const BLOCK_ABBREVIATIONS: Record<ContentBlockType, string> = {
  'Card Alert': 'CA',
  'Deal Alert': 'DA',
  'Lead Story': 'LS',
  'Article Spotlight': 'AS',
  'Quick Hits': 'QH',
  'Transfer Bonus': 'TB',
  'Transfer Bonus Watch': 'TW',
  'Tip of the Day': 'TD',
  'Personal Note': 'PN',
  'Partner Highlight': 'PH',
  'Affiliate Feature': 'AF',
  Custom: 'CU',
  Divider: '—',
};

interface BlockPreviewStripProps {
  blocks: ContentBlock[];
  onBlockClick?: (blockId: string) => void;
}

export function BlockPreviewStrip({ blocks, onBlockClick }: BlockPreviewStripProps) {
  if (blocks.length === 0) return null;

  return (
    <TooltipProvider>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1.5 p-1">
          {blocks.map((block) => (
            <Tooltip key={block.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onBlockClick?.(block.id)}
                  className={`${BLOCK_COLORS[block.type] ?? 'bg-gray-500'} text-white text-[10px] font-bold rounded px-2 py-1 min-w-[28px] text-center transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1`}
                >
                  {BLOCK_ABBREVIATIONS[block.type] ?? '??'}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{block.type}</p>
                {block.title && <p className="text-muted-foreground">{block.title}</p>}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </TooltipProvider>
  );
}
