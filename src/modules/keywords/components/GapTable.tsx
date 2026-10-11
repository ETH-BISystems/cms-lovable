import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Download, Bookmark, Search } from 'lucide-react';
import { KDBar } from './shared/KDBar';
import { IntentBadge } from './shared/IntentBadge';
import { SerpFeaturePills } from './shared/SerpFeaturePills';
import { DataTablePagination } from './shared/DataTablePagination';
import type { KeywordGap, GapType } from '../types';

interface GapTableProps {
  gaps: KeywordGap[];
  activeGapType: GapType | 'all';
  competitorDomains: string[];
  canPerformActions: boolean;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
}

const GAP_TYPE_COLORS: Record<GapType, string> = {
  missing: 'bg-red-100 text-red-800',
  weak: 'bg-yellow-100 text-yellow-800',
  strong: 'bg-green-100 text-green-800',
  unique: 'bg-blue-100 text-blue-800',
  untapped: 'bg-purple-100 text-purple-800',
};

const GAP_TYPE_ACTIONS: Record<GapType, string> = {
  missing: 'Research',
  weak: 'Refresh',
  strong: 'Defend',
  unique: 'Moat',
  untapped: 'Research',
};

export function GapTable({
  gaps,
  activeGapType,
  competitorDomains,
  canPerformActions,
  pagination,
}: GapTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isUntapped = activeGapType === 'untapped';

  const allSelected = gaps.length > 0 && gaps.every((g) => selectedIds.includes(g.id));

  return (
    <div className="space-y-3">
      {/* AI Insight for Untapped */}
      {isUntapped && gaps.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-4 flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Untapped Opportunities</p>
              <p className="text-sm text-muted-foreground">
                These {gaps.length} keywords have search demand but neither ETH nor selected competitors rank for them.
                This is a first-mover opportunity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedIds.length > 0 && canPerformActions && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm"><Search className="h-4 w-4 mr-1" />Research Selected</Button>
            <Button variant="outline" size="sm"><Bookmark className="h-4 w-4 mr-1" />Track Selected</Button>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    setSelectedIds(checked ? gaps.map((g) => g.id) : [])
                  }
                />
              </TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>KD</TableHead>
              <TableHead>CPC</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>ETH</TableHead>
              {isUntapped ? (
                <>
                  <TableHead>SERP Features</TableHead>
                  <TableHead>Top Domain</TableHead>
                  <TableHead>Format</TableHead>
                </>
              ) : (
                competitorDomains.map((domain) => (
                  <TableHead key={domain} className="text-xs">{domain.split('.')[0]}</TableHead>
                ))
              )}
              {activeGapType === 'all' && <TableHead>Type</TableHead>}
              {canPerformActions && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {gaps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                  No keywords in this category
                </TableCell>
              </TableRow>
            ) : (
              gaps.map((gap) => (
                <TableRow key={gap.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(gap.id)}
                      onCheckedChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(gap.id) ? prev.filter((id) => id !== gap.id) : [...prev, gap.id],
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{gap.keyword}</TableCell>
                  <TableCell className="tabular-nums">{gap.volume.toLocaleString()}</TableCell>
                  <TableCell><KDBar kd={gap.kd} /></TableCell>
                  <TableCell className="tabular-nums">${gap.cpc.toFixed(2)}</TableCell>
                  <TableCell><IntentBadge intent={gap.intent} /></TableCell>
                  <TableCell>
                    {gap.ethPosition ? (
                      <Badge variant="default">#{gap.ethPosition}</Badge>
                    ) : (
                      <Badge variant="secondary">—</Badge>
                    )}
                  </TableCell>
                  {isUntapped ? (
                    <>
                      <TableCell><SerpFeaturePills features={gap.serpFeatures} /></TableCell>
                      <TableCell className="text-xs">{gap.topRankingDomain ?? '—'}</TableCell>
                      <TableCell className="text-xs">{gap.recommendedFormat ?? '—'}</TableCell>
                    </>
                  ) : (
                    competitorDomains.map((domain) => (
                      <TableCell key={domain} className="tabular-nums">
                        {gap.competitorPositions[domain] ? `#${gap.competitorPositions[domain]}` : '—'}
                      </TableCell>
                    ))
                  )}
                  {activeGapType === 'all' && (
                    <TableCell>
                      <Badge className={`text-xs ${GAP_TYPE_COLORS[gap.gapType]}`}>
                        {gap.gapType}
                      </Badge>
                    </TableCell>
                  )}
                  {canPerformActions && (
                    <TableCell>
                      <Button size="sm" variant="outline">
                        {GAP_TYPE_ACTIONS[gap.gapType]}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination {...pagination} />
    </div>
  );
}
