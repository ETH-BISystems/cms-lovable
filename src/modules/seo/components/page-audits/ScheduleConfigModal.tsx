import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { AuditConfigDoc, AuditFrequency } from '../../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ScheduleConfigModalProps {
  config: AuditConfigDoc | null;
  open: boolean;
  onClose: () => void;
  onSave: (config: {
    enabled: boolean;
    frequency: AuditFrequency;
    dayOfWeek?: number;
    timeOfDay: string;
    triggers: {
      onPublish: boolean;
      onRefresh: boolean;
      onRankingChange: boolean;
      onTrafficDrop: boolean;
    };
    notifications: {
      slack: boolean;
      onlyOnIssues: boolean;
    };
    apiCallsLimit: number;
  }) => void;
}

export function ScheduleConfigModal({
  config,
  open,
  onClose,
  onSave,
}: ScheduleConfigModalProps) {
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [frequency, setFrequency] = useState<AuditFrequency>(
    config?.frequency ?? 'weekly'
  );
  const [dayOfWeek, setDayOfWeek] = useState(config?.dayOfWeek ?? 0);
  const [timeOfDay, setTimeOfDay] = useState(config?.timeOfDay ?? '06:00');
  const [trigOnPublish, setTrigOnPublish] = useState(
    config?.triggers.onPublish ?? true
  );
  const [trigOnRefresh, setTrigOnRefresh] = useState(
    config?.triggers.onRefresh ?? true
  );
  const [trigOnRanking, setTrigOnRanking] = useState(
    config?.triggers.onRankingChange ?? false
  );
  const [trigOnTraffic, setTrigOnTraffic] = useState(
    config?.triggers.onTrafficDrop ?? false
  );
  const [slackNotify, setSlackNotify] = useState(
    config?.notifications.slack ?? false
  );
  const [slackIssuesOnly, setSlackIssuesOnly] = useState(
    config?.notifications.onlyOnIssues ?? false
  );

  // Sync state when config changes
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setFrequency(config.frequency);
      setDayOfWeek(config.dayOfWeek ?? 0);
      setTimeOfDay(config.timeOfDay);
      setTrigOnPublish(config.triggers.onPublish);
      setTrigOnRefresh(config.triggers.onRefresh);
      setTrigOnRanking(config.triggers.onRankingChange);
      setTrigOnTraffic(config.triggers.onTrafficDrop);
      setSlackNotify(config.notifications.slack);
      setSlackIssuesOnly(config.notifications.onlyOnIssues);
    }
  }, [config]);

  const handleSave = () => {
    onSave({
      enabled,
      frequency,
      dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : undefined,
      timeOfDay,
      triggers: {
        onPublish: trigOnPublish,
        onRefresh: trigOnRefresh,
        onRankingChange: trigOnRanking,
        onTrafficDrop: trigOnTraffic,
      },
      notifications: {
        slack: slackNotify,
        onlyOnIssues: slackIssuesOnly,
      },
      apiCallsLimit: config?.apiCallsLimit ?? 1000,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Audits</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Section 1: Automated Full-Site Audits */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              Automated Full-Site Audits
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                Enable automated audits
              </span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            {enabled && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Frequency
                  </label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as AuditFrequency)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(frequency === 'weekly' || frequency === 'biweekly') && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Day of Week
                    </label>
                    <div className="flex gap-1">
                      {DAYS.map((d, i) => (
                        <button
                          key={d}
                          onClick={() => setDayOfWeek(i)}
                          className={cn(
                            'px-2.5 py-1 text-xs rounded-md border transition-colors',
                            dayOfWeek === i
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'bg-card border-border text-foreground hover:bg-muted'
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Time
                  </label>
                  <Input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="w-32"
                  />
                </div>
              </>
            )}
          </div>

          {/* Section 2: Audit Triggers */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Audit Triggers
            </h4>
            <p className="text-xs text-muted-foreground">
              Events that auto-trigger an audit of the affected article:
            </p>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={trigOnPublish}
                onChange={(e) => setTrigOnPublish(e.target.checked)}
                className="rounded"
              />
              On publish
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={trigOnRefresh}
                onChange={(e) => setTrigOnRefresh(e.target.checked)}
                className="rounded"
              />
              On content refresh
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={trigOnRanking}
                onChange={(e) => setTrigOnRanking(e.target.checked)}
                className="rounded"
              />
              On ranking change (5+ positions)
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={trigOnTraffic}
                onChange={(e) => setTrigOnTraffic(e.target.checked)}
                className="rounded"
              />
              On traffic drop (20%+ in 7 days)
            </label>
          </div>

          {/* Section 3: Notifications */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Notifications
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                Slack notification on audit complete
              </span>
              <Switch checked={slackNotify} onCheckedChange={setSlackNotify} />
            </div>
            <div
              className={cn(
                'flex items-center justify-between',
                !slackNotify ? 'opacity-40 pointer-events-none' : ''
              )}
            >
              <span className="text-sm text-foreground">
                Only notify on issues
              </span>
              <Switch
                checked={slackIssuesOnly}
                onCheckedChange={setSlackIssuesOnly}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
