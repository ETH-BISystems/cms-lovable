import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Trophy, AlertCircle, Calendar, Users, BarChart3, MousePointerClick } from 'lucide-react';
import { StatusBadge } from './shared/StatusBadge';
import type { NewsletterEdition } from '../types/index';

interface EditionDetailViewProps {
  edition: NewsletterEdition;
}

/**
 * Past edition detail view with metadata, analytics, and content blocks.
 *
 * Requirements: 8.3, 7.3, 7.4
 */
export function EditionDetailView({ edition }: EditionDetailViewProps) {
  const hasAnalytics =
    edition.openRate !== undefined && edition.clickRate !== undefined;

  const formattedDate =
    edition.date instanceof Date
      ? edition.date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  return (
    <div className="space-y-6 p-4">
      {/* ── Metadata Header ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">#{edition.number}</span>
          <h2 className="text-xl font-bold">{edition.subject}</h2>
          <StatusBadge status={edition.status} />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {formattedDate}
          </span>
          <Badge variant="outline">{edition.editionType}</Badge>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {edition.audience}
          </span>
          {edition.abWinner && (
            <Badge variant="secondary" className="text-xs">
              <Trophy className="h-2.5 w-2.5 mr-0.5" />
              A/B Winner: {edition.abWinner}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Analytics Metrics ── */}
      {hasAnalytics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{edition.openRate}%</p>
              <p className="text-[10px] text-muted-foreground">Open Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <MousePointerClick className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{edition.clickRate}%</p>
              <p className="text-[10px] text-muted-foreground">Click Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{edition.unsubscribes ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Unsubscribes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">${(edition.revenue ?? 0).toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-600 p-3 bg-amber-50 rounded">
          <AlertCircle className="h-4 w-4" />
          Pending sync — analytics data not yet available for this edition.
        </div>
      )}

      {/* ── Link Click Data Table ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Link Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Link</TableHead>
                <TableHead className="text-xs">Clicks</TableHead>
                <TableHead className="text-xs">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edition.blocks.length > 0 ? (
                edition.blocks
                  .filter((b) => b.sourceRef?.url)
                  .map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="text-xs max-w-[300px] truncate">
                        {block.sourceRef?.label ?? block.title}
                      </TableCell>
                      <TableCell className="text-xs">—</TableCell>
                      <TableCell className="text-xs">—</TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-xs text-center text-muted-foreground">
                    No link data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Content Blocks ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Content Blocks ({edition.blocks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {edition.blocks.map((block) => (
            <div key={block.id} className="border rounded p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {block.type}
                </Badge>
                <span className="text-xs font-medium">{block.title}</span>
              </div>
              {block.body && (
                <div
                  className="text-xs text-muted-foreground prose prose-xs max-w-none"
                  dangerouslySetInnerHTML={{ __html: block.body }}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
