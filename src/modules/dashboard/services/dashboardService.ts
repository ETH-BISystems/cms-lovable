// MOCK dashboard service — replaces the component's direct Firestore
// onSnapshot subscriptions (articles, refresh-queue, keywords, article-tasks)
// with in-memory seed data. Shapes match exactly what DashboardPage maps out
// of the snapshot docs.

import { delay } from '@/services/_delay';

export interface DashboardArticle { id: string; title: string; status: string }
export interface DashboardRefreshItem { id: string; title: string; refreshReason: string }
export interface DashboardKeyword { id: string; keyword: string; searchVolume: number; keywordDifficulty: number; serpFeatures: number; opportunityScore: number }
export interface DashboardTask { id: string; name: string; taskType: string; status: string; dueDate: Date | null; assignee: string }

const ARTICLES: DashboardArticle[] = [
  { id: 'art_001', title: 'Best Business Class Seats to Europe in 2026', status: 'Published' },
  { id: 'art_002', title: 'How to Maximize Chase Ultimate Rewards', status: 'Published' },
  { id: 'art_003', title: 'Amex Platinum vs Capital One Venture X', status: 'Published' },
  { id: 'art_004', title: 'Complete Guide to Airline Alliance Partners', status: 'In Review' },
  { id: 'art_005', title: 'Qatar Qsuites: Routes and Availability Guide', status: 'Writing' },
  { id: 'art_006', title: 'Hotel Status Matching Strategies', status: 'Writing' },
  { id: 'art_007', title: 'ANA First Class Award Sweet Spots', status: 'Researching' },
  { id: 'art_008', title: 'Best Cards for Lounge Access', status: 'Needs Refresh' },
  { id: 'art_009', title: 'Transfer Partner Bonus Calendar', status: 'Needs Refresh' },
  { id: 'art_010', title: 'Singapore Airlines Suites Class Guide', status: 'Published' },
  { id: 'art_011', title: 'Positioning Flights Explained', status: 'Researching' },
  { id: 'art_012', title: 'Dynamic Pricing Survival Guide', status: 'In Review' },
];

const REFRESH_QUEUE: DashboardRefreshItem[] = [
  { id: 'rq_001', title: 'Best Cards for Lounge Access', refreshReason: 'Annual fee changes' },
  { id: 'rq_002', title: 'Transfer Partner Bonus Calendar', refreshReason: 'Outdated ratios' },
  { id: 'rq_003', title: 'Amex Platinum vs Capital One Venture X', refreshReason: 'Benefit refresh' },
];

const KEYWORDS: DashboardKeyword[] = [
  { id: 'kw_001', keyword: 'best business class to europe', searchVolume: 8100, keywordDifficulty: 34, serpFeatures: 6, opportunityScore: 92 },
  { id: 'kw_002', keyword: 'qatar qsuites award availability', searchVolume: 2900, keywordDifficulty: 28, serpFeatures: 4, opportunityScore: 88 },
  { id: 'kw_003', keyword: 'amex transfer partners list', searchVolume: 12100, keywordDifficulty: 45, serpFeatures: 8, opportunityScore: 84 },
  { id: 'kw_004', keyword: 'ana first class award chart', searchVolume: 1900, keywordDifficulty: 22, serpFeatures: 3, opportunityScore: 81 },
  { id: 'kw_005', keyword: 'hotel status match 2026', searchVolume: 4400, keywordDifficulty: 31, serpFeatures: 5, opportunityScore: 76 },
];

const TASKS: DashboardTask[] = [
  { id: 'task_001', name: 'Review alliance partners draft', taskType: 'Review', status: 'In Progress', dueDate: new Date(Date.now() + 864e5), assignee: 'Daynis Olman' },
  { id: 'task_002', name: 'Source Qsuites cabin images', taskType: 'Images', status: 'Pending', dueDate: new Date(Date.now() + 2 * 864e5), assignee: 'Daynis Olman' },
  { id: 'task_003', name: 'Update lounge access fee table', taskType: 'Refresh', status: 'Pending', dueDate: new Date(Date.now() - 864e5), assignee: 'Daynis Olman' },
  { id: 'task_004', name: 'Humanise ANA first class article', taskType: 'AI Polish', status: 'Blocked', dueDate: new Date(Date.now() + 4 * 864e5), assignee: 'Daynis Olman' },
];

function subscribe<T>(data: T, listener: (data: T) => void, ms = 250): () => void {
  let active = true;
  delay(ms).then(() => {
    if (active) listener(data);
  });
  return () => {
    active = false;
  };
}

export const dashboardService = {
  subscribeToArticles(listener: (articles: DashboardArticle[]) => void) {
    return subscribe(ARTICLES, listener);
  },
  subscribeToRefreshQueue(listener: (items: DashboardRefreshItem[]) => void) {
    return subscribe(REFRESH_QUEUE.slice(0, 3), listener);
  },
  subscribeToTopKeywords(listener: (keywords: DashboardKeyword[]) => void) {
    const sorted = [...KEYWORDS].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
    return subscribe(sorted, listener);
  },
  subscribeToTasksFor(assignee: string, listener: (tasks: DashboardTask[]) => void) {
    return subscribe(TASKS.filter((t) => t.assignee === assignee).slice(0, 6), listener);
  },
};
