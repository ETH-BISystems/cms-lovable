import type { KeywordOpportunity } from '../types';

const CSV_HEADERS = [
  'keyword',
  'searchVolume',
  'kd',
  'cpc',
  'intent',
  'revenuePotential',
  'opportunityScore',
  'contentGapScore',
  'ethStatus',
  'ethRankPosition',
  'format',
  'topicCluster',
  'competitorPositions',
] as const;

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Generate a CSV string from an array of KeywordOpportunity objects. */
export function generateKeywordsCsv(keywords: KeywordOpportunity[]): string {
  const header = CSV_HEADERS.join(',');

  const rows = keywords.map((kw) => {
    const competitorPositions = kw.competitors
      .map((c) => `${c.site}:${c.position}`)
      .join('; ');

    return [
      escapeCSV(kw.keyword),
      kw.searchVolume,
      kw.kd,
      kw.cpc,
      kw.intent,
      kw.revenuePotential,
      kw.opportunityScore,
      kw.contentGapScore,
      kw.ethStatus,
      kw.ethRankPosition ?? '',
      kw.format,
      escapeCSV(kw.topicCluster),
      escapeCSV(competitorPositions),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

/** Trigger a browser download of a CSV string. */
export function downloadCsv(csvString: string, filename: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
