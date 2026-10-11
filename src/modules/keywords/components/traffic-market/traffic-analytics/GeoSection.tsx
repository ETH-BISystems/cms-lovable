import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { ArrowRight, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartCard } from '../../analytics/ChartCard';
import { exportRowsToCsv } from '../../analytics/exportCsv';
import { formatCompact } from '../../analytics/format';
import { GeoChoropleth } from '../charts/GeoChoropleth';
import { formatShare } from '../shared/trafficFormat';
import { useAnalyticsQuery } from '../../../hooks/useAnalyticsQuery';
import { trafficMarketService } from '../../../services/trafficMarketService';
import { InlineEmpty, InlineError } from './common';

type GeoMetric = 'visits' | 'uniqueVisitors';

/**
 * Brand Presence in AI Platforms — deep link, the AIV engine lives on its own
 * page. Rendered by GeoSection; also shown standalone by TrafficAnalyticsPage
 * when the Similarweb integration is disabled (AI Visibility is independent).
 */
export function BrandPresenceCard() {
  return (
    <Card className="animate-fade-up rounded-2xl border-0 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(3,43,52,0.06),0_12px_32px_-16px_rgba(3,43,52,0.18)]">
      <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/15">
            <Sparkles className="h-5 w-5 text-accent" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold tracking-tight">
              Brand Presence in AI Platforms
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              See how often your brand is cited by ChatGPT, Gemini, Claude, Perplexity, Grok, DeepSeek and
              Copilot — per-engine mention share, sentiment, and the prompts that surface your competitors
              instead of you.
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/keywords/ai-visibility">
            Check AI Visibility
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface GeoSectionProps {
  /** Current domain set — options for the domain selector. */
  domains: string[];
}

/**
 * TA-04 — geographic distribution (choropleth + ranked country table with a
 * Visits / Unique Visitors toggle re-scoping the map) and the Brand Presence
 * in AI Platforms panel deep-linking to the AI Visibility engine.
 */
export function GeoSection({ domains }: GeoSectionProps) {
  const [domain, setDomain] = useState('');
  const [metric, setMetric] = useState<GeoMetric>('visits');
  const query = useAnalyticsQuery(trafficMarketService.geo);
  const { run } = query;

  useEffect(() => {
    if (domains.length > 0 && !domains.includes(domain)) {
      setDomain(domains[0]);
    }
  }, [domains, domain]);

  useEffect(() => {
    if (domain) run({ domain });
  }, [domain, run]);

  const data = query.data;
  const showSkeleton = query.loading || (!data && !query.error);

  const countries = useMemo(
    () => (data ? [...data.countries].sort((a, b) => b.share - a.share) : []),
    [data],
  );

  // Device split + unique visitors are clickstream-only — hide the columns
  // and the Unique Visitors map toggle when the provider serves them as null.
  const hasDeviceSplit = countries.some(c => c.desktopShare != null || c.mobileShare != null);
  const hasUniqueVisitors = countries.some(c => c.uniqueVisitors != null);
  const activeMetric: GeoMetric = hasUniqueVisitors ? metric : 'visits';

  /** Map value: visits share directly; unique visitors normalized to a 0–1 share. */
  const mapData = useMemo(() => {
    if (activeMetric === 'visits') {
      return countries.map(c => ({ countryCode: c.countryCode, countryName: c.countryName, value: c.share }));
    }
    const totalUnique = countries.reduce((sum, c) => sum + (c.uniqueVisitors ?? 0), 0);
    return countries.map(c => ({
      countryCode: c.countryCode,
      countryName: c.countryName,
      value: totalUnique > 0 ? (c.uniqueVisitors ?? 0) / totalUnique : 0,
    }));
  }, [countries, activeMetric]);

  const exportGeo = () => {
    if (countries.length === 0) return;
    exportRowsToCsv(
      `traffic-geo-${domain || 'domain'}.csv`,
      countries.map(c => ({
        country_code: c.countryCode,
        country: c.countryName,
        share: c.share,
        visits: c.visits,
        unique_visitors: c.uniqueVisitors,
        desktop_share: c.desktopShare,
        mobile_share: c.mobileShare,
      })),
    );
  };

  return (
    <>
      <ChartCard
        title="Geo Distribution"
        description={domain ? `Traffic by country for ${domain}` : 'Traffic by country'}
        loading={showSkeleton}
        skeletonHeight={400}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select value={domain} onValueChange={setDomain} disabled={domains.length === 0}>
              <SelectTrigger className="h-8 w-52 text-xs">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map(d => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasUniqueVisitors && (
              <Tabs value={activeMetric} onValueChange={value => setMetric(value as GeoMetric)}>
                <TabsList className="h-8">
                  <TabsTrigger value="visits" className="h-6 px-2.5 text-xs">
                    Visits
                  </TabsTrigger>
                  <TabsTrigger value="uniqueVisitors" className="h-6 px-2.5 text-xs">
                    Unique Visitors
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Button variant="outline" size="sm" onClick={exportGeo} disabled={countries.length === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        }
      >
        {query.error ? (
          <InlineError message={query.error} onRetry={query.retry} />
        ) : countries.length === 0 ? (
          <InlineEmpty message="No geographic data for this domain." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <GeoChoropleth data={mapData} height={380} />
            <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="w-24">Share</TableHead>
                    <TableHead className="w-24">Visits</TableHead>
                    {hasDeviceSplit && <TableHead className="w-24">Desktop</TableHead>}
                    {hasDeviceSplit && <TableHead className="w-24">Mobile</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.map((country, i) => (
                    <TableRow key={country.countryCode}>
                      <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{country.countryName}</TableCell>
                      <TableCell className="tabular-nums">{formatShare(country.share)}</TableCell>
                      <TableCell className="tabular-nums">{formatCompact(country.visits)}</TableCell>
                      {hasDeviceSplit && (
                        <TableCell className="tabular-nums">{formatShare(country.desktopShare)}</TableCell>
                      )}
                      {hasDeviceSplit && (
                        <TableCell className="tabular-nums">{formatShare(country.mobileShare)}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ChartCard>

      <BrandPresenceCard />
    </>
  );
}
