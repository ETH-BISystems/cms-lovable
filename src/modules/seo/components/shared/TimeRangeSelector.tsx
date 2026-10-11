import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const DEFAULT_OPTIONS = ['7 days', '30 days', '90 days', 'Custom'];

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
}

export function TimeRangeSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
}: TimeRangeSelectorProps) {
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);

  const isCustomActive = value.startsWith('Custom');

  const handleClick = (option: string) => {
    if (option === 'Custom') {
      setCustomPickerOpen(true);
      return;
    }
    onChange(option);
  };

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      onChange(`Custom: ${format(customStart, 'MMM d')} – ${format(customEnd, 'MMM d')}`);
      setCustomPickerOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-0">
      <div className="flex bg-muted rounded-md p-0.5">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleClick(option)}
            className={cn(
              'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
              (option === value || (option === 'Custom' && isCustomActive))
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:text-card-foreground'
            )}
          >
            {option === 'Custom' && isCustomActive
              ? value.replace('Custom: ', '')
              : option}
          </button>
        ))}
      </div>

      {/* Custom Date Range Picker */}
      <Popover open={customPickerOpen} onOpenChange={setCustomPickerOpen}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="space-y-3">
            <p className="text-xs font-medium text-foreground">Custom Date Range</p>
            <div className="flex gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Start</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[130px] h-8 justify-start text-left text-[11px]',
                        !customStart && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="w-3 h-3 mr-1.5" />
                      {customStart ? format(customStart, 'MMM d, yyyy') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">End</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[130px] h-8 justify-start text-left text-[11px]',
                        !customEnd && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="w-3 h-3 mr-1.5" />
                      {customEnd ? format(customEnd, 'MMM d, yyyy') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-[11px]"
              disabled={!customStart || !customEnd}
              onClick={applyCustomRange}
            >
              Apply Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
