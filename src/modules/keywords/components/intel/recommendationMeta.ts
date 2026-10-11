import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  Bot,
  Megaphone as MegaphoneIcon,
  FilePlus2,
  GitMerge,
  Link2,
  Link2Off,
  Network,
  RefreshCw,
  Trophy,
  Undo2,
  Wrench,
} from 'lucide-react';
import type { IntelActionName, RecommendationType } from '../../types/intel';

export interface RecommendationMeta {
  label: string;
  icon: LucideIcon;
  /** Left-stripe + chip tint. */
  stripeClass: string;
  chipClass: string;
  primaryAction: Extract<IntelActionName, 'create_article' | 'add_to_refresh_queue' | 'create_task'>;
  primaryLabel: string;
}

export const RECOMMENDATION_META: Record<RecommendationType, RecommendationMeta> = {
  keyword_striking_distance: {
    label: 'Striking Distance', icon: Trophy,
    stripeClass: 'bg-green-500', chipClass: 'bg-green-100 text-green-800',
    primaryAction: 'add_to_refresh_queue', primaryLabel: 'Optimize Page',
  },
  new_content: {
    label: 'New Content', icon: FilePlus2,
    stripeClass: 'bg-accent', chipClass: 'bg-accent/10 text-accent',
    primaryAction: 'create_article', primaryLabel: 'Create Draft',
  },
  refresh: {
    label: 'Refresh', icon: RefreshCw,
    stripeClass: 'bg-amber-500', chipClass: 'bg-amber-100 text-amber-800',
    primaryAction: 'add_to_refresh_queue', primaryLabel: 'Add to Refresh Queue',
  },
  cannibalization_merge: {
    label: 'Cannibalization', icon: GitMerge,
    stripeClass: 'bg-rose-500', chipClass: 'bg-rose-100 text-rose-800',
    primaryAction: 'create_task', primaryLabel: 'Create Merge Task',
  },
  internal_link_cluster: {
    label: 'Internal Links', icon: Network,
    stripeClass: 'bg-sky-500', chipClass: 'bg-sky-100 text-sky-800',
    primaryAction: 'create_task', primaryLabel: 'Create Linking Task',
  },
  backlink_reclaim: {
    label: 'Reclaim Link', icon: Undo2,
    stripeClass: 'bg-indigo-500', chipClass: 'bg-indigo-100 text-indigo-800',
    primaryAction: 'create_task', primaryLabel: 'Create Outreach Task',
  },
  backlink_gap: {
    label: 'Backlink Gap', icon: Link2,
    stripeClass: 'bg-indigo-500', chipClass: 'bg-indigo-100 text-indigo-800',
    primaryAction: 'create_task', primaryLabel: 'Create Outreach Task',
  },
  backlink_fix: {
    label: 'Fix Links', icon: Link2Off,
    stripeClass: 'bg-indigo-500', chipClass: 'bg-indigo-100 text-indigo-800',
    primaryAction: 'create_task', primaryLabel: 'Create Fix Task',
  },
  linkable_asset: {
    label: 'Linkable Asset', icon: Wrench,
    stripeClass: 'bg-indigo-500', chipClass: 'bg-indigo-100 text-indigo-800',
    primaryAction: 'create_article', primaryLabel: 'Create Draft',
  },
  ai_gap: {
    label: 'AI Visibility', icon: Bot,
    stripeClass: 'bg-purple-500', chipClass: 'bg-purple-100 text-purple-800',
    primaryAction: 'create_article', primaryLabel: 'Create Draft',
  },
  ai_refresh: {
    label: 'AI Citability', icon: Bot,
    stripeClass: 'bg-purple-500', chipClass: 'bg-purple-100 text-purple-800',
    primaryAction: 'add_to_refresh_queue', primaryLabel: 'Add to Refresh Queue',
  },
  ai_overview_gap: {
    label: 'AI Overview', icon: Bot,
    stripeClass: 'bg-fuchsia-500', chipClass: 'bg-fuchsia-100 text-fuchsia-800',
    primaryAction: 'add_to_refresh_queue', primaryLabel: 'Optimize for Citation',
  },
  brand_reputation: {
    label: 'Brand Pulse', icon: MegaphoneIcon,
    stripeClass: 'bg-orange-500', chipClass: 'bg-orange-100 text-orange-800',
    primaryAction: 'create_task', primaryLabel: 'Create Review Task',
  },
};

export const ACTIONED_DEEP_LINK: Record<string, { label: string; path: (id: string) => string }> = {
  articleId: { label: 'Open in Pipeline', path: () => '/pipeline' },
  refreshQueueId: { label: 'Open Refresh Queue', path: () => '/pipeline/refresh' },
  taskId: { label: 'Open My Tasks', path: () => '/my-tasks' },
};

export { ArrowUpRight };
