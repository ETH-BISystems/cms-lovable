import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Unplug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { AdPlatformsSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  google_ads: { label: 'Google Ads', color: 'bg-blue-500/10 text-blue-600' },
  meta_ads: { label: 'Meta Ads', color: 'bg-indigo-500/10 text-indigo-600' },
  microsoft_ads: { label: 'Microsoft Ads', color: 'bg-cyan-500/10 text-cyan-600' },
};

export function AdPlatformsTab() {
  const { data, loading, error } = useSettings<AdPlatformsSettings>('adPlatforms');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('adPlatforms');

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const platforms = data?.platforms || [];

  if (platforms.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <Unplug className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-[13px] text-muted-foreground mb-3">No ad platforms configured yet.</p>
        {!readOnly && <Button variant="outline" size="sm" className="text-[12px]">Configure Ad Platforms</Button>}
      </div>
    );
  }

  return (
    <NotYetAvailable note="Ad platform connections are not yet available — OAuth integration with these platforms has not been built.">
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map(platform => {
          const meta = PLATFORM_META[platform.platform] || { label: platform.platform, color: 'bg-muted text-muted-foreground' };
          return (
            <div key={platform.platform} className="bg-card rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={cn('text-[10px]', meta.color)}>{meta.label}</Badge>
                {platform.connected ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {platform.connected ? (
                <div>
                  <p className="text-[12px] font-medium">{platform.accountName || 'Connected'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Connected {platform.connectedAt ? new Date(platform.connectedAt as unknown as string).toLocaleDateString() : ''}
                  </p>
                  {!readOnly && (
                    <Button variant="ghost" size="sm" className="text-[11px] text-destructive mt-2 h-7 px-2">Disconnect</Button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-muted-foreground">Not connected</p>
                  {!readOnly && (
                    <Button variant="outline" size="sm" className="text-[11px] mt-2 h-7">Connect</Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </NotYetAvailable>
  );
}
