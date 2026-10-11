import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2 } from 'lucide-react';
import { KDBar } from './shared/KDBar';
import { IntentBadge } from './shared/IntentBadge';
import { SerpFeaturePills } from './shared/SerpFeaturePills';
import { CpcTrendIndicator } from './shared/CpcTrendIndicator';
import { RevenuePill } from './shared/RevenuePill';
import { MiniSparkline } from './shared/MiniSparkline';
import { BulkSearchModal } from './BulkSearchModal';
import { keywordFunctionsService } from '../services/keywordFunctionsService';
import type { ExplorerKeyword, KeywordOpportunity } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface KeywordResearchTabProps {
  keywords: KeywordOpportunity[];
  onResearch: (keyword: KeywordOpportunity) => void;
  canPerformActions: boolean;
}

export function KeywordResearchTab({ keywords, onResearch, canPerformActions }: KeywordResearchTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ExplorerKeyword[] | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState<ExplorerKeyword[] | null>(null);

  const handleSearch = useCallback(async (term?: string) => {
    const query = term ?? searchTerm;
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await keywordFunctionsService.callExploreKeywords({ seed: query });
      setResults(data.keywords);
      setBulkResults(null);
      setRecentSearches((prev) => [query, ...prev.filter((s) => s !== query)].slice(0, 10));
    } catch {
      // Error handled by toast in production
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const handleBulkSearch = useCallback(async (terms: string[]) => {
    setLoading(true);
    try {
      // Search each keyword and combine results
      const allResults: ExplorerKeyword[] = [];
      for (const term of terms.slice(0, 50)) {
        const data = await keywordFunctionsService.callExploreKeywords({ seed: term });
        allResults.push(...data.keywords.slice(0, 1)); // Take top result per seed
      }
      setBulkResults(allResults);
      setResults(null);
    } catch {
      // Error handled by toast
    } finally {
      setLoading(false);
    }
  }, []);

  // Find matching keyword from main collection for the searched term
  const matchedKeyword = results && results.length > 0
    ? keywords.find((kw) => kw.keyword.toLowerCase() === searchTerm.toLowerCase())
    : null;

  const trendData = matchedKeyword?.monthlyTrend.map((v, i) => ({ month: `M${i + 1}`, volume: v })) ?? [];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter a keyword to research..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={() => handleSearch()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
        <Button variant="outline" onClick={() => setBulkModalOpen(true)}>
          Bulk Search
        </Button>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recentSearches.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="cursor-pointer hover:bg-muted"
              onClick={() => { setSearchTerm(s); handleSearch(s); }}
            >
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* Single Search Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          {/* Summary Card */}
          {matchedKeyword && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Volume</p>
                    <p className="font-bold tabular-nums">{matchedKeyword.searchVolume.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">KD</p>
                    <KDBar kd={matchedKeyword.kd} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPC</p>
                    <CpcTrendIndicator cpc={matchedKeyword.cpc} trend={matchedKeyword.cpcTrend} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Intent</p>
                    <IntentBadge intent={matchedKeyword.intent} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <RevenuePill revenue={matchedKeyword.revenuePotential} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ETH Status</p>
                    <Badge variant={matchedKeyword.ethStatus === 'ranking' ? 'default' : 'secondary'}>
                      {matchedKeyword.ethStatus === 'ranking' ? `#${matchedKeyword.ethRankPosition}` : 'No Content'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <SerpFeaturePills features={matchedKeyword.serpFeatures} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 12-Month Trend Chart */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">12-Month Search Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={trendData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={50} />
                    <Tooltip />
                    <Area type="monotone" dataKey="volume" stroke="#3b82f6" fill="#3b82f680" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Related Keywords Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Related Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>KD</TableHead>
                    <TableHead>CPC</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>ETH</TableHead>
                    {canPerformActions && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.slice(0, 20).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.keyword}</TableCell>
                      <TableCell className="tabular-nums">{r.volume.toLocaleString()}</TableCell>
                      <TableCell><KDBar kd={r.kd} /></TableCell>
                      <TableCell><CpcTrendIndicator cpc={r.cpc} trend={r.cpcTrend} /></TableCell>
                      <TableCell><IntentBadge intent={r.intent} /></TableCell>
                      <TableCell>
                        <Badge variant={r.ethStatus === 'ranking' ? 'default' : 'secondary'}>
                          {r.ethStatus === 'ranking' ? `#${r.ethPosition}` : 'No Content'}
                        </Badge>
                      </TableCell>
                      {canPerformActions && (
                        <TableCell>
                          <Button size="sm" variant="outline">Research</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* SERP Analysis */}
          {matchedKeyword && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">SERP Analysis — Top 10 Google Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Rank</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Word Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedKeyword.topGoogleResults.map((result, i) => (
                      <TableRow key={i}>
                        <TableCell className="tabular-nums">{i + 1}</TableCell>
                        <TableCell>
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            {result.title}
                          </a>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new URL(result.url).hostname}
                        </TableCell>
                        <TableCell className="tabular-nums">{result.wordCount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* People Also Ask */}
          {matchedKeyword && matchedKeyword.relatedKeywords.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">People Also Ask</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Intent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedKeyword.relatedKeywords
                      .filter((rk) => rk.keyword.includes('?') || rk.keyword.toLowerCase().startsWith('how') || rk.keyword.toLowerCase().startsWith('what'))
                      .slice(0, 10)
                      .map((rk) => (
                        <TableRow key={rk.keyword}>
                          <TableCell className="font-medium cursor-pointer hover:text-blue-600">{rk.keyword}</TableCell>
                          <TableCell className="tabular-nums">{rk.volume.toLocaleString()}</TableCell>
                          <TableCell><IntentBadge intent={rk.intent} /></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                <Button variant="outline" size="sm" className="mt-2">Add all as FAQ schema</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bulk Search Results */}
      {bulkResults && bulkResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bulk Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>KD</TableHead>
                  <TableHead>CPC</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>ETH Status</TableHead>
                  {canPerformActions && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkResults.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.keyword}</TableCell>
                    <TableCell className="tabular-nums">{r.volume.toLocaleString()}</TableCell>
                    <TableCell><KDBar kd={r.kd} /></TableCell>
                    <TableCell><CpcTrendIndicator cpc={r.cpc} trend={r.cpcTrend} /></TableCell>
                    <TableCell><IntentBadge intent={r.intent} /></TableCell>
                    <TableCell>
                      <Badge variant={r.ethStatus === 'ranking' ? 'default' : 'secondary'}>
                        {r.ethStatus === 'ranking' ? `#${r.ethPosition}` : 'No Content'}
                      </Badge>
                    </TableCell>
                    {canPerformActions && (
                      <TableCell>
                        <Button size="sm" variant="outline">Research</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!results && !bulkResults && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Enter a keyword to research</p>
          <p className="text-sm">Get detailed SERP analysis, related keywords, and competitive data</p>
        </div>
      )}

      <BulkSearchModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSubmit={handleBulkSearch}
        maxKeywords={50}
      />
    </div>
  );
}
