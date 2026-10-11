import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { ApiUsageSettings } from '../types';

export function APICostTrackingTab() {
  const { data, loading, error, save } = useSettings<ApiUsageSettings>('apiUsage');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('apiUsage');
  const [expandedService, setExpandedService] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const budgetUsedPercent = data?.monthlyBudget ? Math.round((data.currentSpend / data.monthlyBudget) * 100) : 0;
  const services = data?.services || [];
  const thresholds = data?.alerts?.thresholdPercentages || [];

  return (
    <div className="space-y-6">
      {/* Monthly Budget Overview */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Monthly Budget Overview</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-md border border-border">
              <p className="text-[10px] text-muted-foreground">Total Budget</p>
              <p className="text-[16px] font-semibold mt-1">${data?.monthlyBudget?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="text-center p-3 rounded-md border border-border">
              <p className="text-[10px] text-muted-foreground">Current Spend</p>
              <p className="text-[16px] font-semibold mt-1">${data?.currentSpend?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="text-center p-3 rounded-md border border-border">
              <p className="text-[10px] text-muted-foreground">Projected Spend</p>
              <p className="text-[16px] font-semibold mt-1">${data?.projectedSpend?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="text-center p-3 rounded-md border border-border">
              <p className="text-[10px] text-muted-foreground">Days Remaining</p>
              <p className="text-[16px] font-semibold mt-1">{data?.daysRemaining || 0}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Budget Used</span>
              <span className={cn('font-medium', budgetUsedPercent > 90 ? 'text-red-600' : budgetUsedPercent > 70 ? 'text-orange-600' : 'text-green-600')}>
                {budgetUsedPercent}%
              </span>
            </div>
            <Progress value={budgetUsedPercent} className={cn('h-2', budgetUsedPercent > 90 ? '[&>div]:bg-red-600' : budgetUsedPercent > 70 ? '[&>div]:bg-orange-500' : '')} />
          </div>
        </div>
      </div>

      {/* Per-Service Cost Breakdown */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Per-Service Cost Breakdown</h3>
        </div>
        <div className="px-5 py-4">
          {services.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No service cost data available.</p>
          ) : (
            <div className="space-y-2">
              {services.map(svc => (
                <div key={svc.name} className="border border-border rounded-md">
                  <button
                    onClick={() => setExpandedService(expandedService === svc.name ? null : svc.name)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {expandedService === svc.name ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span className="font-medium">{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-muted-foreground">${svc.thisMonth.toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        {svc.changePercent > 0 ? <TrendingUp className="h-3 w-3 text-red-500" /> : <TrendingDown className="h-3 w-3 text-green-500" />}
                        <span className={svc.changePercent > 0 ? 'text-red-500' : 'text-green-500'}>{Math.abs(svc.changePercent)}%</span>
                      </div>
                    </div>
                  </button>
                  {expandedService === svc.name && (
                    <div className="px-4 pb-3 border-t border-border">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-[11px]">
                        <div>
                          <p className="text-muted-foreground">Last Month</p>
                          <p className="font-medium">${svc.lastMonth.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Daily Avg</p>
                          <p className="font-medium">${svc.dailyAvg.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Usage</p>
                          <p className="font-medium">{svc.usageMetric}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Budget</p>
                          <p className="font-medium">${svc.budget.toFixed(2)}</p>
                        </div>
                      </div>
                      {svc.dailyCosts.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border">
                          <p className="text-[10px] text-muted-foreground mb-1">Daily Costs (last 7 days)</p>
                          <div className="flex items-end gap-1 h-12">
                            {svc.dailyCosts.slice(-7).map((dc, i) => {
                              const maxCost = Math.max(...svc.dailyCosts.slice(-7).map(d => d.cost));
                              const height = maxCost > 0 ? (dc.cost / maxCost) * 100 : 0;
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div className="w-full bg-accent/60 rounded-sm" style={{ height: `${height}%`, minHeight: '2px' }} />
                                  <span className="text-[8px] text-muted-foreground">{dc.date.slice(-2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget Alerts */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Budget Alerts</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Alert Thresholds</label>
            <div className="flex flex-wrap gap-2">
              {thresholds.map((t, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{t}%</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data?.alerts?.autoThrottleAt90 || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Auto-Throttle at 90%</label>
          </div>
        </div>
      </div>

      {/* Cost Anomaly Detection */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Cost Anomaly Detection</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={data?.costAnomalyDetection || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Enable Cost Anomaly Detection</label>
          </div>
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Cost Optimization Recommendations</h3>
        </div>
        <div className="px-5 py-4">
          {(!data?.optimizationRecommendations || data.optimizationRecommendations.length === 0) ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No optimization recommendations at this time.</p>
          ) : (
            <ul className="space-y-2">
              {data.optimizationRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
