import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CheckSquare,
  Rss,
  Search,
  TrendingUp,
  Activity,
  Target,
  FileCheck,
  Bot,
  KanbanSquare,
  Flag,
  FileBarChart,
  Calendar,
  Mail,
  BarChart3,
  CreditCard,
  ArrowRightLeft,
  Image,
  Frame,
  Mic,
  Settings,
  Star,
  Globe,
  Users,
  GitCompare,
  Gauge,
  FileSearch,
  Link2,
  Sparkles,
  BrainCircuit,
  Network,
  Megaphone,
  ScanSearch,
  Building2,
  Crosshair,
  Radar,
  AreaChart,
  PieChart,
  Route,
  LifeBuoy,
} from 'lucide-react';
import { FEATURES } from '@/platform/config/features';

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  enabled: boolean;
  children?: NavItem[];
}

export const navigationItems: NavItem[] = [
  { title: 'Home', path: '/', icon: LayoutDashboard, enabled: FEATURES.home },
  { title: 'My Tasks', path: '/my-tasks', icon: CheckSquare, enabled: FEATURES.myTasks },
  { title: 'Service Tickets', path: '/service-tickets', icon: LifeBuoy, enabled: FEATURES.serviceTickets },
  { title: 'RSS Feed Monitor', path: '/rss', icon: Rss, enabled: FEATURES.rssFeedMonitor },
  {
    title: 'SEO Intelligence',
    path: '/keywords/intelligence',
    icon: BrainCircuit,
    enabled: FEATURES.keywords,
    children: [
      { title: 'Command Dashboard', path: '/keywords/intelligence', icon: BrainCircuit, enabled: FEATURES.keywords },
      { title: 'Internal Links', path: '/keywords/internal-links', icon: Network, enabled: FEATURES.keywords },
      { title: 'Brand Monitoring', path: '/keywords/brand-monitoring', icon: Megaphone, enabled: FEATURES.keywords },
      { title: 'AI Visibility', path: '/keywords/ai-visibility', icon: Sparkles, enabled: FEATURES.keywords },
    ],
  },
  {
    title: 'SEO Research',
    path: '/keywords',
    icon: Search,
    enabled: FEATURES.keywords,
    children: [
      { title: 'Keyword Research', path: '/keywords', icon: Search, enabled: FEATURES.keywords },
      { title: 'Keyword Overview', path: '/keywords/overview', icon: Gauge, enabled: FEATURES.keywords },
      { title: 'SERP Analysis', path: '/keywords/serp', icon: BarChart3, enabled: FEATURES.keywords },
      { title: 'Keyword Trends', path: '/keywords/trends', icon: Activity, enabled: FEATURES.keywords },
      { title: 'Content Gap', path: '/keywords/content-gap', icon: GitCompare, enabled: FEATURES.keywords },
      { title: 'Business Research', path: '/keywords/business-research', icon: Building2, enabled: FEATURES.keywords },
    ],
  },
  {
    title: 'Domain Analytics',
    path: '/keywords/domain-overview',
    icon: Globe,
    enabled: FEATURES.keywords,
    children: [
      { title: 'Domain Overview', path: '/keywords/domain-overview', icon: Globe, enabled: FEATURES.keywords },
      { title: 'Organic Research', path: '/keywords/organic-research', icon: FileSearch, enabled: FEATURES.keywords },
      { title: 'Competitor Analysis', path: '/keywords/competitors', icon: Users, enabled: FEATURES.keywords },
      { title: 'Traffic Insights', path: '/keywords/traffic', icon: TrendingUp, enabled: FEATURES.keywords },
      { title: 'Top Pages', path: '/keywords/top-pages', icon: FileBarChart, enabled: FEATURES.keywords },
      { title: 'Backlink Analytics', path: '/keywords/backlinks', icon: Link2, enabled: FEATURES.keywords },
      { title: 'Rank Tracker', path: '/keywords/rank-tracker', icon: Crosshair, enabled: FEATURES.keywords },
      { title: 'Page Audit', path: '/keywords/page-audit', icon: ScanSearch, enabled: FEATURES.keywords },
    ],
  },
  {
    title: 'Traffic & Market',
    path: '/traffic-market',
    icon: Radar,
    enabled: FEATURES.trafficMarket,
    children: [
      { title: 'Traffic Analytics', path: '/traffic-market', icon: AreaChart, enabled: FEATURES.trafficMarket },
      { title: 'Market Overview', path: '/traffic-market/market-overview', icon: PieChart, enabled: FEATURES.trafficMarket },
      { title: 'Top Pages', path: '/traffic-market/top-pages', icon: FileBarChart, enabled: FEATURES.trafficMarket },
      { title: 'AI Traffic', path: '/traffic-market/ai-traffic', icon: Bot, enabled: FEATURES.trafficMarket },
      { title: 'Traffic Distribution', path: '/traffic-market/distribution', icon: Route, enabled: FEATURES.trafficMarket },
      { title: 'Sources & Destinations', path: '/traffic-market/sources', icon: ArrowRightLeft, enabled: FEATURES.trafficMarket },
    ],
  },
  {
    title: 'Article Pipeline',
    path: '/pipeline',
    icon: KanbanSquare,
    enabled: FEATURES.pipeline,
    children: [
      { title: 'New Articles', path: '/pipeline', icon: KanbanSquare, enabled: FEATURES.pipeline },
      { title: 'Refresh Queue', path: '/pipeline/refresh', icon: Flag, enabled: FEATURES.pipeline },
      { title: 'Content Library', path: '/pipeline/content-library', icon: FileBarChart, enabled: FEATURES.pipeline },
    ],
  },
  { title: 'Editorial Calendar', path: '/calendar', icon: Calendar, enabled: FEATURES.calendar },
  { title: 'Newsletter Command Center', path: '/newsletter', icon: Mail, enabled: FEATURES.newsletter },
  { title: 'Analytics', path: '/analytics', icon: BarChart3, enabled: FEATURES.analytics },
  {
    title: 'Card Data Manager',
    path: '/cards',
    icon: CreditCard,
    enabled: FEATURES.cards,
  },
  // Stand-alone section (out of Card Data Manager): TP cheat-sheet embeds +
  // matrix values + branding. The legacy /cards/transfer-partners route still works.
  { title: 'Transfer Partner Tables', path: '/transfer-partners', icon: ArrowRightLeft, enabled: FEATURES.cardTransferPartners },
  { title: 'Asset Library', path: '/assets', icon: Image, enabled: FEATURES.assets },
  { title: 'Experience Library', path: '/experience', icon: Star, enabled: FEATURES.experience },
  { title: 'iFrame Manager', path: '/iframes', icon: Frame, enabled: FEATURES.iframes },
  { title: 'Voice Training', path: '/voice-training', icon: Mic, enabled: FEATURES.voiceTraining },
  { title: 'Settings', path: '/settings', icon: Settings, enabled: FEATURES.settings },
];
