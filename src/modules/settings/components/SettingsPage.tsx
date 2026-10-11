import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import {
  Settings, AlertTriangle, Search as SearchIcon, X,
  Cog, Palette, Cpu, Globe, Mail, RefreshCw, Hash, Search,
  Share2, FileText, Shield, Bell, DollarSign, Target, Users,
  Wrench, ScrollText, Download, Menu, Megaphone, KeyRound, Bot,
  BookOpenCheck, UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import { UserManagementTab } from '@/modules/auth';
import { GeneralTab } from './GeneralTab';
import { BrandVoiceTab } from './BrandVoiceTab';
import { HumanizerRulesTab } from './HumanizerRulesTab';
import { AIConfigTab } from './AIConfigTab';
import { WebflowTab } from './WebflowTab';
import { BeehiivTab } from './BeehiivTab';
import { WebflowSyncTab } from './WebflowSyncTab';
import { SlackTab } from './SlackTab';
import { SeoApiTab } from './SeoApiTab';
import { SocialAccountsTab } from './SocialAccountsTab';
import { AdPlatformsTab } from './AdPlatformsTab';
import { ContentRulesTab } from './ContentRulesTab';
import { ComplianceRulesTab } from './ComplianceRulesTab';
import { NotificationsTab } from './NotificationsTab';
import { APICostTrackingTab } from './APICostTrackingTab';
import { KPITargetsTab } from './KPITargetsTab';
import { CompetitorsRSSTab } from './CompetitorsRSSTab';
import { TeamRolesAuthorsTab } from './TeamRolesAuthorsTab';
import { ScraperManagementTab } from './ScraperManagementTab';
import { CredentialsTab } from './CredentialsTab';
import { AiFinalProcessingTab } from '@/modules/ai-final-processing';
import { AuditLogTab } from './AuditLogTab';
import { DataExportTab } from './DataExportTab';
import type { SettingId } from '../types';

interface TabItem {
  name: string;
  slug: string;
  icon: React.ElementType;
  settingId: SettingId;
  group: string;
  description: string;
  /** Hidden from the settings nav for non-admin users (CMS-160). */
  adminOnly?: boolean;
}

const tabItems: TabItem[] = [
  { name: 'General', slug: 'general', icon: Cog, settingId: 'general', group: 'GENERAL', description: 'Company identity, site configuration, and dashboard preferences.' },
  { name: 'Brand Voice', slug: 'brand-voice', icon: Palette, settingId: 'brandVoice', group: 'GENERAL', description: 'Tone, banned phrases, exemplar libraries, and voice training rules.' },
  { name: 'AI Configuration', slug: 'ai-config', icon: Cpu, settingId: 'aiConfig', group: 'GENERAL', description: 'LLM models, agent assignments, and prompt testing.' },
  { name: 'Webflow Integration', slug: 'webflow', icon: Globe, settingId: 'webflow', group: 'INTEGRATIONS', description: 'API connection, site mapping, and publishing defaults.' },
  { name: 'Beehiiv Integration', slug: 'beehiiv', icon: Mail, settingId: 'beehiiv', group: 'INTEGRATIONS', description: 'Newsletter platform connection, subscriber sync, and deliverability.' },
  { name: 'Webflow CMS Sync', slug: 'cms-sync', icon: RefreshCw, settingId: 'cmsSync', group: 'INTEGRATIONS', description: 'Collection sync status, queue management, and error logs.' },
  { name: 'Slack Integration', slug: 'slack', icon: Hash, settingId: 'slack', group: 'INTEGRATIONS', description: 'Channel routing, event notifications, and daily digest.' },
  { name: 'SEO API Integration', slug: 'seo-api', icon: Search, settingId: 'seoApi', group: 'INTEGRATIONS', description: 'SEO provider, Google Search Console, and analytics connections.' },
  { name: 'Social Accounts', slug: 'social-accounts', icon: Share2, settingId: 'socialAccounts', group: 'INTEGRATIONS', description: 'OAuth connections for social platforms across brands.' },
  { name: 'Ad Platforms', slug: 'ad-platforms', icon: Megaphone, settingId: 'adPlatforms', group: 'INTEGRATIONS', description: 'Advertising platform connections for campaign tracking.' },
  { name: 'Content Rules', slug: 'content-rules', icon: FileText, settingId: 'contentRules', group: 'CONTENT', description: 'Taxonomy, templates, expiration policies, and canonical URLs.' },
  { name: 'Compliance Rules', slug: 'compliance', icon: Shield, settingId: 'compliance', group: 'CONTENT', description: 'FTC disclosures, disclaimers, financial guardrails, and audit trails.' },
  { name: 'Notifications', slug: 'notifications', icon: Bell, settingId: 'notifications', group: 'CONTENT', description: 'Global notification defaults, quiet hours, and per-user overrides.' },
  { name: 'API Cost Tracking', slug: 'api-costs', icon: DollarSign, settingId: 'apiUsage', group: 'OPERATIONS', description: 'Monthly budget, per-service costs, alerts, and optimization.' },
  { name: 'KPI Targets', slug: 'kpi', icon: Target, settingId: 'kpiTargets', group: 'OPERATIONS', description: 'Performance targets for content, traffic, SEO, and newsletter.' },
  { name: 'Competitors & RSS', slug: 'competitors-rss', icon: Users, settingId: 'competitorsRss', group: 'OPERATIONS', description: 'Competitor sites, RSS feeds, and newsletter monitoring.' },
  { name: 'Team, Roles & Authors', slug: 'team-authors', icon: Users, settingId: 'general', group: 'OPERATIONS', description: 'Team members, role assignments, author profiles, and Webflow sync.' },
  { name: 'Scraper Management', slug: 'scraper', icon: Wrench, settingId: 'scraper', group: 'OPERATIONS', description: 'Platform config, run history, scheduling, and error monitoring.' },
  { name: 'AI Final Processing', slug: 'ai-final-processing', icon: Bot, settingId: 'aiFinalProcessing', group: 'OPERATIONS', description: 'ZeroGPT detection, Gemma normalisation, cadence, and GPU telemetry.' },
  { name: 'Humanizer Rules', slug: 'humanizer-rules', icon: BookOpenCheck, settingId: 'humanizerRules', group: 'OPERATIONS', description: 'StoryScope-distilled style rules + banned stock phrases for the article and card humaniser.' },
  { name: 'API Credentials', slug: 'credentials', icon: KeyRound, settingId: 'credentials', group: 'SYSTEM', description: 'Rotate the API keys stored in Firebase Secrets (admin only).' },
  { name: 'User Management', slug: 'user-management', icon: UserCog, settingId: 'userManagement', group: 'SYSTEM', description: 'Invite users and manage CMS login accounts, roles, and access (admin only).', adminOnly: true },
  { name: 'Audit Log', slug: 'audit-log', icon: ScrollText, settingId: 'general', group: 'SYSTEM', description: 'Searchable log of every platform action for compliance.' },
  { name: 'Data Export', slug: 'data-export', icon: Download, settingId: 'dataExport', group: 'SYSTEM', description: 'Export articles, analytics, card data, and full platform archives.' },
];

const GROUPS = ['GENERAL', 'INTEGRATIONS', 'CONTENT', 'OPERATIONS', 'SYSTEM'];

const tabComponents: Record<string, React.ComponentType> = {
  'General': GeneralTab,
  'Brand Voice': BrandVoiceTab,
  'AI Configuration': AIConfigTab,
  'Webflow Integration': WebflowTab,
  'Beehiiv Integration': BeehiivTab,
  'Webflow CMS Sync': WebflowSyncTab,
  'Slack Integration': SlackTab,
  'SEO API Integration': SeoApiTab,
  'Social Accounts': SocialAccountsTab,
  'Ad Platforms': AdPlatformsTab,
  'Content Rules': ContentRulesTab,
  'Compliance Rules': ComplianceRulesTab,
  'Notifications': NotificationsTab,
  'API Cost Tracking': APICostTrackingTab,
  'KPI Targets': KPITargetsTab,
  'Competitors & RSS': CompetitorsRSSTab,
  'Team, Roles & Authors': TeamRolesAuthorsTab,
  'Scraper Management': ScraperManagementTab,
  'AI Final Processing': AiFinalProcessingTab,
  'Humanizer Rules': HumanizerRulesTab,
  'API Credentials': CredentialsTab,
  'User Management': UserManagementTab,
  'Audit Log': AuditLogTab,
  'Data Export': DataExportTab,
};

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canWrite, isAdmin } = useSettingsPermissions();
  const [settingsSearch, setSettingsSearch] = useState('');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [dirtyTabs, setDirtyTabs] = useState<Set<string>>(new Set());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const slugTabMap = useMemo(
    () => Object.fromEntries(tabItems.map(t => [t.slug, t.name])),
    []
  );

  const tabParam = searchParams.get('tab') || 'general';
  const activeTab = slugTabMap[tabParam] || 'General';
  const activeTabItem = tabItems.find(t => t.name === activeTab) || tabItems[0];
  const readOnly = !canWrite(activeTabItem.settingId);

  const filteredTabs = useMemo(() => {
    // Admin-only tabs (e.g. User Management) never appear for other roles —
    // the tab component also self-guards against deep links.
    const visible = isAdmin ? tabItems : tabItems.filter(t => !t.adminOnly);
    const q = settingsSearch.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter(t => t.name.toLowerCase().includes(q));
  }, [settingsSearch, isAdmin]);

  const handleTabChange = useCallback((val: string) => {
    if (dirtyTabs.has(activeTab) && val !== activeTab) {
      setPendingTab(val);
      setShowUnsavedDialog(true);
      return;
    }
    navigateToTab(val);
  }, [dirtyTabs, activeTab]);

  const navigateToTab = useCallback((val: string) => {
    const item = tabItems.find(t => t.name === val);
    if (!item) return;
    setSearchParams({ tab: item.slug });
    setShowUnsavedDialog(false);
    setPendingTab(null);
    setMobileSidebarOpen(false);
  }, [setSearchParams]);

  const handleSaveAndLeave = useCallback(() => {
    setDirtyTabs(prev => { const n = new Set(prev); n.delete(activeTab); return n; });
    if (pendingTab) navigateToTab(pendingTab);
  }, [activeTab, pendingTab, navigateToTab]);

  const handleLeaveWithout = useCallback(() => {
    setDirtyTabs(prev => { const n = new Set(prev); n.delete(activeTab); return n; });
    if (pendingTab) navigateToTab(pendingTab);
  }, [activeTab, pendingTab, navigateToTab]);

  const ActiveComponent = tabComponents[activeTab];

  const sidebarContent = (
    <>
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={settingsSearch}
            onChange={e => setSettingsSearch(e.target.value)}
            placeholder="Search settings..."
            className="pl-8 h-8 text-[12px]"
          />
          {settingsSearch && (
            <button
              onClick={() => setSettingsSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tab list grouped */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
        {GROUPS.map(group => {
          const groupTabs = filteredTabs.filter(t => t.group === group);
          if (groupTabs.length === 0) return null;
          return (
            <div key={group}>
              <div className="px-2 py-1">
                <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">{group}</span>
              </div>
              {groupTabs.map(tab => {
                const isActive = activeTab === tab.name;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.name}
                    onClick={() => handleTabChange(tab.name)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors relative',
                      isActive
                        ? 'bg-accent/10 text-accent font-medium border-l-[3px] border-accent'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-[3px] border-transparent'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.name}</span>
                    {dirtyTabs.has(tab.name) && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-4 -mx-6">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[250px] shrink-0 border-r border-border bg-card">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative w-[280px] h-full bg-card flex flex-col shadow-xl">
            <div className="h-12 flex items-center justify-between px-4 border-b border-border">
              <span className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4" /> Settings
              </span>
              <button onClick={() => setMobileSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Content panel */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="p-6 lg:p-8 pb-24">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden mb-4 flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-4 h-4" /> Settings Menu
          </button>

          {/* Tab header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-bold text-foreground">{activeTabItem.name}</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">{activeTabItem.description}</p>
              </div>
              {readOnly && (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                  Read Only
                </span>
              )}
            </div>
          </div>

          {/* Active tab content */}
          {ActiveComponent && <ActiveComponent />}
        </div>

        {/* Tabs with editable settings save inline — no global save button
            (the previous one was never wired and stayed permanently disabled) */}
      </div>

      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes on <span className="font-medium text-foreground">{activeTab}</span>. Save before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => { setShowUnsavedDialog(false); setPendingTab(null); }}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" onClick={handleLeaveWithout}>
              Leave Without Saving
            </Button>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSaveAndLeave}>
              Save & Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
