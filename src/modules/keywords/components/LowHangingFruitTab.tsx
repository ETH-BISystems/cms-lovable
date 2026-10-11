import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, TrendingUp, ArrowUp, ArrowDown, Minus, Download, RefreshCw } from 'lucide-react';
import { KDBar } from './shared/KDBar';
import { IntentBadge } from './shared/IntentBadge';
import { CpcTrendIndicator } from './shared/CpcTrendIndicator';
import { DataTablePagination } from './shared/DataTablePagination';
import { usePagination } from '../hooks/usePagination';
import type { KeywordOpportunity } from '../types';

interface LowHangingFruitTabProps {
  keywords: KeywordOpportunity[];
  onRefresh: (keyword: KeywordOpportunity) => void;
  canPerformActions: boolean;
}

export function LowHangingFruitTab({ keywords, onRefresh, canPerformActions }: LowHangingFruitTabProps) {
  const [positionFilter, setPositionFilter] = useState<'all' | 'near' | 'deep'>('all');
  const [minVolume, setMinVolume] = useState(0);
  const [maxKD, setMaxKD] = useState(100);
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter to page-2 keywords (positions 11-20)
  const page2Keywords = useMemo(() => {
    return keywords.filter((kw) => {
      const pos = kw.ethRankPosition;
      if (pos == null || pos < 11 || pos > 20) return false;

      if (positionFilter === 'near' && (pos < 11 || pos > 15)) return false;
      if (positionFilter === 'deep' && (pos < 16 || pos > 20)) return false;
      if (kw.searchVolume < minVolume) return false;
      if (kw.kd > maxKD) return false;
      if (intentFilter !== 'all' && kw.intent !== intentFilter) return false;

      return true;
    });
  }, [keywords, positionFilter, minVolume, maxKD, intentFilter]);

  const pagination = usePagination(page2Keywords.length);
  const paginatedKeywords = pagination.paginatedSlice(page2Keywords);

  // Stats
  const totalTrafficOpportunity = page2Keywords.reduce((sum, kw) => sum + kw.searchVolume, 0);
  const highestVolume = page2Keywords.reduce(
    (best, kw) => (kw.searchVolume > (best?.searchVolume ?? 0) ? kw : best),
    page2Keywords[0] as KeywordOpportunity | undefined,
  );
  const avgGap = page2Keywords.length > 0
    ? Math.round(page2Keywords.reduce((sum, kw) => sum + ((kw.ethRankPosition ?? 11) - 10), 0) / page2Keywords.length)
    : 0;

  // Top 3 easiest wins
  const easiestWins = [...page2Keywords]
    .sort((a, b) => (a.ethRankPosition ?? 20) - (b.ethRankPosition ?? 20))
    .slice(0, 3);

  const getTrendIcon = (kw: KeywordOpportunity) => {
    if (!kw.positionHistory || kw.positionHistory.length < 2) return <Minus className="h-3 w-3 text-gray-500" />;
    const recent = kw.positionHistory[kw.positionHistory.length - 1];
    const prev = kw.positionHistory[kw.positionHistory.length - 2];
    if (recent < prev) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (recent > prev) return <ArrowDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {/* AI Insight Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Page 2 Opportunity</p>
            <p className="text-sm text-muted-foreground">
              {page2Keywords.length} keywords on page 2 with an estimated {totalTrafficOpportunity.toLocaleString()} monthly traffic if pushed to page 1.
              {easiestWins.length > 0 && (
                <> Top wins: {easiestWins.map((kw) => `${kw.keyword} (#${kw.ethRankPosition})`).join(', ')}.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{page2Keywords.length}</p>
            <p className="text-xs text-muted-foreground">Page 2 Keywords</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold tabular-nums">{totalTrafficOpportunity.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Traffic Opportunity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{highestVolume?.keyword ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              Highest Volume {highestVolume ? `(${highestVolume.searchVolume.toLocaleString()} / #${highestVolume.ethRankPosition})` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold tabular-nums">{avgGap} pos</p>
            <p className="text-xs text-muted-foreground">Avg Gap to Page 1</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={positionFilter} onValueChange={(v) => setPositionFilter(v as 'all' | 'near' | 'deep')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All 11-20</SelectItem>
            <SelectItem value="near">Near Miss 11-15</SelectItem>
            <SelectItem value="deep">Deep Page 2 16-20</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Min Volume"
          className="w-28"
          value={minVolume || ''}
          onChange={(e) => setMinVolume(Number(e.target.value) || 0)}
        />

        <Input
          type="number"
          placeholder="Max KD"
          className="w-24"
          value={maxKD === 100 ? '' : maxKD}
          onChange={(e) => setMaxKD(Number(e.target.value) || 100)}
        />

        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intents</SelectItem>
            <SelectItem value="Informational">Informational</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
            <SelectItem value="Transactional">Transactional</SelectItem>
            <SelectItem value="Navigational">Navigational</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && canPerformActions && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
            <Button size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />Bulk Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={paginatedKeywords.length > 0 && paginatedKeywords.every((kw) => selectedIds.includes(kw.id))}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedIds(paginatedKeywords.map((kw) => kw.id));
                    else setSelectedIds([]);
                  }}
                />
              </TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>KD</TableHead>
              <TableHead>CPC</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>ETH URL</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Page 1 Competitors</TableHead>
              <TableHead>Gap to #10</TableHead>
              {canPerformActions && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedKeywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  No page-2 keywords match your filters
                </TableCell>
              </TableRow>
            ) : (
              paginatedKeywords.map((kw) => (
                <TableRow key={kw.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(kw.id)}
                      onCheckedChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(kw.id) ? prev.filter((id) => id !== kw.id) : [...prev, kw.id],
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{kw.keyword}</TableCell>
                  <TableCell>
                    <Badge variant={(kw.ethRankPosition ?? 20) <= 15 ? 'default' : 'secondary'}>
                      #{kw.ethRankPosition}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{kw.searchVolume.toLocaleString()}</TableCell>
                  <TableCell><KDBar kd={kw.kd} /></TableCell>
                  <TableCell><CpcTrendIndicator cpc={kw.cpc} trend={kw.cpcTrend} /></TableCell>
                  <TableCell><IntentBadge intent={kw.intent} /></TableCell>
                  <TableCell className="text-xs text-blue-600 truncate max-w-[120px]">
                    {kw.ethArticleTitle ?? '—'}
                  </TableCell>
                  <TableCell>{getTrendIcon(kw)}</TableCell>
                  <TableCell className="tabular-nums">
                    {kw.competitors.filter((c) => c.position <= 10).length}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {(kw.ethRankPosition ?? 20) - 10} pos
                  </TableCell>
                  {canPerformActions && (
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => onRefresh(kw)}>
                        Refresh
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
