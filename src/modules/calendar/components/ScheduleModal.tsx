import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, Sun, Sunset, Moon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Generate 31 time options: 6:00 AM to 9:00 PM in 30-min increments
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 6; hour <= 21; hour++) {
    for (const min of [0, 30]) {
      if (hour === 21 && min === 30) break; // Stop at 9:00 PM
      const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const m = min === 0 ? '00' : '30';
      options.push(`${h}:${m} ${ampm}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

const PRESETS = [
  { label: 'Morning', time: '9:00 AM', icon: Sun },
  { label: 'Afternoon', time: '1:00 PM', icon: Sunset },
  { label: 'Evening', time: '6:00 PM', icon: Moon },
];

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  date: Date;
  defaultTime?: string;
  onConfirm: (date: Date, time: string) => void | Promise<void>;
}

export function ScheduleModal({
  open,
  onOpenChange,
  title,
  date,
  defaultTime,
  onConfirm,
}: ScheduleModalProps) {
  const [selectedTime, setSelectedTime] = useState(defaultTime ?? '9:00 AM');
  const [submitting, setSubmitting] = useState(false);

  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');

  // Confirm exactly once per open — repeated clicks while the Cloud Function
  // call is in flight must not create duplicate events (CMS-41).
  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(date, selectedTime);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold tracking-tight">
            Schedule Article
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Article title */}
          <p className="text-sm font-medium">{title}</p>

          {/* Date display */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground">
            <Clock className="h-4 w-4 text-accent" />
            <span>{formattedDate}</span>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium">Publish Time</label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            {PRESETS.map(({ label, time, icon: Icon }) => (
              <Button
                key={label}
                variant={selectedTime === time ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTime(time)}
                className="flex-1"
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting
              ? 'Scheduling…'
              : `Schedule for ${format(date, 'MMM d')} at ${selectedTime}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
