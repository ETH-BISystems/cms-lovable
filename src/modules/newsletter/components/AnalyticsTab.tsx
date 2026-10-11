import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  MousePointerClick,
  Users,
  Trophy,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useEditions } from '../hooks/useEditions';

/**
 * Analytics tab with top metrics, top blocks, and edition-level analytics.
 *
 * Requirements: 7.1–7.6
 */
export function AnalyticsTab() {
  const { metrics, topBlocks, loading: analyticsLoading } = useAnalytics();
  const { editions, loading: editionsLoading } = useEditions({
    status: 'Sent',
    search: '',
    editionType: 'All',
  });

  const loading = analyticsLoading || editionsLoading;

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

  const sentEditions = editions.filter((e) => e.status === 'Sent');

  // Empty state
  if (sentEditions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Analytics available after first send</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Once you send your first newsletter edition, analytics data will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* ── Top-level Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Avg Open Rate"
          value={`${metrics.avgOpenRate}%`}
          icon={Mail}
          trend={metrics.openRateTrend}
        />
        <MetricCard
          title="Avg Click Rate"
          value={`${metrics.avgClickRate}%`}
          icon={MousePointerClick}
          trend={metrics.clickRateTrend}
        />
        <MetricCard
          title="Total Subscribers"
          value={metrics.totalSubscribers.toLocaleString()}
          icon={Users}
        />
        <MetricCard
          title="Growth Rate"
          value={`${metrics.subscriberGrowthRate}%`}
          icon={TrendingUp}
        />
      </div>

      {/* ── Top Performing Content Blocks ── */}
      {topBlocks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Performing Content Blocks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Click Rate</TableHead>
                  <TableHead className="text-xs">Clicks</TableHead>
                  <TableHead className="text-xs">Edition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topBlocks.map((block, i) => (
                  <TableRow key={`${block.title}-${block.editionNumber}-${i}`}>
                    <TableCell className="text-xs font-medium">{block.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {block.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{block.clickRate}%</TableCell>
                    <TableCell className="text-xs">{block.clicks}</TableCell>
                    <TableCell className="text-xs">#{block.editionNumber}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Edition-level Analytics ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Edition Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sentEditions.map((edition) => {
            const hasAnalytics =
              edition.openRate !== undefined && edition.clickRate !== undefined;

            return (
              <div key={edition.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium">#{edition.number}</span>
                  <span className="text-xs truncate flex-1">{edition.subject}</span>
                  {edition.abWinner && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Trophy className="h-2.5 w-2.5 mr-0.5" />
                      A/B Winner: {edition.abWinner}
                    </Badge>
                  )}
                </div>

                {hasAnalytics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-sm font-bold">{edition.openRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Open Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{edition.clickRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Click Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{edition.unsubscribes ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Unsubscribes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">
                        ${(edition.revenue ?? 0).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Pending sync — analytics data not yet available
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
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
