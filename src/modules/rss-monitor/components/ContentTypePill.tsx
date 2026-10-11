import type { ContentType } from '../types';

export interface ContentTypeConfig {
  emoji: string;
  bg: string;
  text: string;
}

const contentTypeMap: Record<string, ContentTypeConfig> = {
  'Airline Review': { emoji: '✈️', bg: 'bg-blue-100', text: 'text-blue-700' },
  'Hotel Review': { emoji: '🏨', bg: 'bg-purple-100', text: 'text-purple-700' },
  'Card Review': { emoji: '💳', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'Lounge Review': { emoji: '🛋️', bg: 'bg-teal-100', text: 'text-teal-700' },
  'Deal Alert': { emoji: '💰', bg: 'bg-amber-100', text: 'text-amber-700' },
  News: { emoji: '📰', bg: 'bg-slate-100', text: 'text-slate-700' },
  Guide: { emoji: '📖', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  // Values written by the RSS enrichment function (functions/src/rss-monitor/enrich.ts)
  Deal: { emoji: '💰', bg: 'bg-amber-100', text: 'text-amber-700' },
  Review: { emoji: '⭐', bg: 'bg-indigo-100', text: 'text-indigo-700' },
};

const fallbackConfig: ContentTypeConfig = { emoji: '📰', bg: 'bg-slate-100', text: 'text-slate-700' };

export function getContentTypeConfig(contentType: ContentType | string): ContentTypeConfig {
  return contentTypeMap[contentType] ?? fallbackConfig;
}

interface ContentTypePillProps {
  contentType: ContentType;
}

export function ContentTypePill({ contentType }: ContentTypePillProps) {
  const config = getContentTypeConfig(contentType);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span>{config.emoji}</span>
      <span>{contentType}</span>
    </span>
  );
}
