import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2 } from 'lucide-react';

export interface ColumnVisibility {
  sparkline: boolean;
  volume: boolean;
  kd: boolean;
  cpc: boolean;
  intent: boolean;
  revenue: boolean;
  score: boolean;
  gap: boolean;
  serpFeatures: boolean;
  backlinks: boolean;
  competitors: boolean;
  ethStatus: boolean;
  format: boolean;
}

const DEFAULT_VISIBILITY: ColumnVisibility = {
  sparkline: true,
  volume: true,
  kd: true,
  cpc: true,
  intent: true,
  revenue: true,
  score: true,
  gap: true,
  serpFeatures: true,
  backlinks: true,
  competitors: true,
  ethStatus: true,
  format: true,
};

const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  sparkline: 'Sparkline',
  volume: 'Volume',
  kd: 'KD',
  cpc: 'CPC',
  intent: 'Intent',
  revenue: 'Revenue',
  score: 'Score',
  gap: 'Gap Score',
  serpFeatures: 'SERP Features',
  backlinks: 'Backlinks',
  competitors: 'Competitors',
  ethStatus: 'ETH Status',
  format: 'Format',
};

interface ColumnCustomizerProps {
  columns: ColumnVisibility;
  onChange: (columns: ColumnVisibility) => void;
}

export function ColumnCustomizer({ columns, onChange }: ColumnCustomizerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="end">
        <div className="space-y-2">
          {(Object.keys(COLUMN_LABELS) as (keyof ColumnVisibility)[]).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={columns[key]}
                onCheckedChange={(checked) =>
                  onChange({ ...columns, [key]: !!checked })
                }
              />
              {COLUMN_LABELS[key]}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DEFAULT_VISIBILITY };
