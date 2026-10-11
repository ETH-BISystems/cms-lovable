import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KDBar } from './shared/KDBar';
import { IntentBadge } from './shared/IntentBadge';
import { CpcTrendIndicator } from './shared/CpcTrendIndicator';
import { MiniSparkline } from './shared/MiniSparkline';
import { SerpFeaturePills } from './shared/SerpFeaturePills';
import { DataTablePagination } from './shared/DataTablePagination';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ExplorerKeyword } from '../types';

interface ExplorerTableProps {
  keywords: ExplorerKeyword[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
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

export function ExplorerTable({
  keywords,
  selectedIds,
  onSelectionChange,
  canPerformActions,
  pagination,
}: ExplorerTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allSelected = keywords.length > 0 && keywords.every((kw) => selectedIds.includes(kw.id));

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    onSelectionChange(checked ? keywords.map((kw) => kw.id) : [])
                  }
                />
              </TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>KD</TableHead>
              <TableHead>CPC</TableHead>
              <TableHead>SERP</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>ETH</TableHead>
              {canPerformActions && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No keywords found
                </TableCell>
              </TableRow>
            ) : (
              keywords.map((kw) => (
                <>
                  <TableRow
                    key={kw.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === kw.id ? null : kw.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(kw.id)}
                        onCheckedChange={() =>
                          onSelectionChange(
                            selectedIds.includes(kw.id)
                              ? selectedIds.filter((id) => id !== kw.id)
                              : [...selectedIds, kw.id],
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell>
                      {kw.matchType === 'question' && kw.questionType ? (
                        <Badge variant="outline" className="text-xs">{kw.questionType}</Badge>
                      ) : (
                        <IntentBadge intent={kw.intent} />
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{kw.volume.toLocaleString()}</TableCell>
                    <TableCell><KDBar kd={kw.kd} /></TableCell>
                    <TableCell><CpcTrendIndicator cpc={kw.cpc} trend={kw.cpcTrend} /></TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="tabular-nums">{kw.serpFeatureCount}</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <SerpFeaturePills features={kw.serpFeatures} />
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell><MiniSparkline data={kw.trend} /></TableCell>
                    <TableCell>
                      {kw.ethPosition ? (
                        <Badge variant="default">#{kw.ethPosition}</Badge>
                      ) : (
                        <Badge variant="secondary">—</Badge>
                      )}
                    </TableCell>
                    {canPerformActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline">
                          {kw.ethStatus === 'no-content' ? 'Research' : 'Refresh'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedId === kw.id && (
                    <TableRow key={`${kw.id}-expanded`}>
                      <TableCell colSpan={10} className="bg-muted/30 py-3 px-8">
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">Trend: </span>
                            <MiniSparkline data={kw.trend} width={120} height={30} />
                          </div>
                          <div>
                            <span className="text-muted-foreground">SERP: </span>
                            <SerpFeaturePills features={kw.serpFeatures} />
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cluster: </span>
                            <Badge variant="outline">{kw.cluster}</Badge>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination {...pagination} />
    </div>
  );
}
