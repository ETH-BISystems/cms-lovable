import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Tag,
  Award,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useSubscribers } from '../hooks/useSubscribers';
import { useEditionMutations } from '../hooks/useEditionMutations';

/**
 * Subscribers tab with growth stats, lifecycle funnel, segments,
 * automation journeys, poll insights, referral program, and tags.
 *
 * Requirements: 6.1–6.9, 13.2, 13.6
 */
export function SubscribersTab() {
  const { subscribers, stats, funnelCounts, tagCounts, loading, error } = useSubscribers();
  const { syncSubscribers, loading: mutLoading } = useEditionMutations();
  const [chartRange, setChartRange] = useState<'30d' | '90d' | '365d'>('30d');

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Stale data warning
  const showStaleWarning = error !== null;

  return (
    <div className="space-y-6 p-4">
      {/* Stale data warning */}
      {showStaleWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Beehiiv API is unreachable. Showing cached data. Last sync: unknown.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Subscriber Growth Section ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Subscribers"
          value={stats.totalSubscribers.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Net Growth (30d)"
          value={`${stats.netGrowth >= 0 ? '+' : ''}${stats.netGrowth}`}
          icon={UserPlus}
          trend={stats.growthTrend}
        />
        <StatCard
          title="Active"
          value={String(funnelCounts['active'] ?? 0)}
          icon={Zap}
        />
        <StatCard
          title="At-Risk"
          value={String(funnelCounts['at-risk'] ?? 0)}
          icon={AlertTriangle}
        />
      </div>

      {/* Growth chart placeholder */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Subscriber Growth</CardTitle>
            <div className="flex gap-1">
              {(['30d', '90d', '365d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={chartRange === range ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => setChartRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted rounded flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Growth chart — {chartRange}</span>
          </div>
        </CardContent>
      </Card>

      {/* Source breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Source Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="h-32 w-32 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] text-muted-foreground">Pie chart</span>
            </div>
            <div className="flex-1 space-y-1.5">
              {stats.sourceBreakdown.map((src) => (
                <div key={src.source} className="flex items-center gap-2 text-xs">
                  <span className="w-16 font-medium truncate">{src.source}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${src.percentage}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-12 text-right">
                    {src.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Lifecycle Funnel ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lifecycle Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {[
              { label: 'New (30d)', key: 'new', color: 'bg-blue-400' },
              { label: 'Active', key: 'active', color: 'bg-green-400' },
              { label: 'Engaged', key: 'engaged', color: 'bg-emerald-500' },
              { label: 'At-Risk', key: 'at-risk', color: 'bg-amber-400' },
              { label: 'Churned', key: 'churned', color: 'bg-red-400' },
            ].map((stage) => {
              const count = funnelCounts[stage.key] ?? 0;
              const maxCount = Math.max(...Object.values(funnelCounts), 1);
              const height = Math.max((count / maxCount) * 100, 8);
              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium">{count}</span>
                  <div
                    className={`w-full ${stage.color} rounded-t transition-all`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Segments Section ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Segments</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => syncSubscribers()}
              disabled={mutLoading.syncSubscribers}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${mutLoading.syncSubscribers ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: 'Premium Members', type: 'Dynamic', count: 0, pct: 0 },
              { name: 'Engaged Readers', type: 'Dynamic', count: 0, pct: 0 },
              { name: 'New Subscribers', type: 'Static', count: 0, pct: 0 },
            ].map((seg) => (
              <Card key={seg.name}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{seg.name}</span>
                    <Badge variant="outline" className="text-[10px]">{seg.type}</Badge>
                  </div>
                  <p className="text-lg font-bold">{seg.count}</p>
                  <p className="text-[10px] text-muted-foreground">{seg.pct}% of total</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Automation Journeys ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" /> Automation Journeys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Welcome Series', status: 'Active', trigger: 'New subscriber', entered: 150, active: 45, completed: 100, rate: 67 },
              { name: 'Re-engagement', status: 'Paused', trigger: 'Inactive 30d', entered: 80, active: 0, completed: 30, rate: 38 },
            ].map((journey) => (
              <div key={journey.name} className="border rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{journey.name}</span>
                  <Badge
                    variant={journey.status === 'Active' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {journey.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Trigger: {journey.trigger}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold">{journey.entered}</p>
                    <p className="text-[10px] text-muted-foreground">Entered</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{journey.active}</p>
                    <p className="text-[10px] text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{journey.completed}</p>
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{journey.rate}%</p>
                    <p className="text-[10px] text-muted-foreground">Rate</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Poll Insights ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Poll Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No poll data available yet.</p>
        </CardContent>
      </Card>

      {/* ── Referral Program ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4" /> Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Referrals', value: '0' },
              { label: 'Active Referrers', value: '0' },
              { label: 'Conversion Rate', value: '0%' },
              { label: 'Top Referrer', value: '—' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Rank</TableHead>
                <TableHead className="text-xs">Subscriber</TableHead>
                <TableHead className="text-xs">Referrals</TableHead>
                <TableHead className="text-xs">Milestone</TableHead>
                <TableHead className="text-xs">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-xs text-center text-muted-foreground">
                  No referral data yet
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Subscriber Tags ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4" /> Subscriber Tags
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => syncSubscribers()}
              disabled={mutLoading.syncSubscribers}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${mutLoading.syncSubscribers ? 'animate-spin' : ''}`} />
              Sync Tags
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {tagCounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags found.</p>
            ) : (
              tagCounts.map(({ tag, count }) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag} ({count})
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">{title}</span>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold">{value}</span>
          {trend && (
            <>
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
              {trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
