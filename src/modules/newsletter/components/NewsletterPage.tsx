import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Mail, Send, FileText, Globe, Users, BarChart3 } from 'lucide-react';
import { NewsletterProvider, useNewsletterContext } from '../context/NewsletterContext';
import type { NewsletterTab } from '../context/NewsletterContext';
import { RoleGate } from './shared/RoleGate';
import { TodaysEditionTab } from './TodaysEditionTab';
import { PastEditionsTab } from './PastEditionsTab';
import { DraftsQueuedTab } from './DraftsQueuedTab';
import { CompetitorIntelTab } from './CompetitorIntelTab';
import { SubscribersTab } from './SubscribersTab';
import { AnalyticsTab } from './AnalyticsTab';
import { EditionBuilderModal } from './EditionBuilderModal';
import { QuickBriefModal } from './QuickBriefModal';
import { useEditionMutations } from '../hooks/useEditionMutations';
import { useAuth } from '@/modules/auth';
import type { CreateEditionInput, ContentBlockType, QuickBriefConfig, Role as NewsletterRole } from '../types/index';

const TAB_CONFIG: { value: NewsletterTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'today', label: "Today's Edition", icon: Mail },
  { value: 'past-editions', label: 'Past Editions', icon: Send },
  { value: 'drafts-queued', label: 'Drafts & Queued', icon: FileText },
  { value: 'competitor-intel', label: 'Competitor Intel', icon: Globe },
  { value: 'subscribers', label: 'Subscribers', icon: Users },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
];

function NewsletterPageContent() {
  const { activeTab, setActiveTab, setSelectedEditionId } = useNewsletterContext();
  const { createEdition, loading: mutLoading } = useEditionMutations();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link from the Editorial Calendar: /newsletter?edition=<editionId>
  useEffect(() => {
    const editionId = searchParams.get('edition');
    if (editionId) {
      setSelectedEditionId(editionId);
      setActiveTab('today');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, setSelectedEditionId, setActiveTab]);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefTopic, setBriefTopic] = useState('');
  const [briefContext, setBriefContext] = useState<{ competitors: string[]; type: string } | undefined>();

  const handleCreateEdition = useCallback(
    async (input: CreateEditionInput) => {
      try {
        const result = await createEdition(input);
        setBuilderOpen(false);
        if (result?.editionId) {
          setSelectedEditionId(result.editionId);
          setActiveTab('today');
        }
      } catch {
        // Error is tracked in useEditionMutations
      }
    },
    [createEdition, setSelectedEditionId, setActiveTab],
  );

  const handleOpenBrief = useCallback(
    (topic: string, context?: { competitors: string[]; type: string }) => {
      setBriefTopic(topic);
      setBriefContext(context);
      setBriefOpen(true);
    },
    [],
  );

  const handleGenerateBrief = useCallback((_config: QuickBriefConfig) => {
    // Would call autoCurate or a dedicated generation mutation
    setBriefOpen(false);
  }, []);

  const handleAddBlankBlock = useCallback((_blockType: ContentBlockType) => {
    setBriefOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Mail className="h-5 w-5" /> Newsletter Command Center
        </h1>
        <RoleGate minimumRole="Writer">
          <Button size="sm" onClick={() => setBuilderOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1" /> New Edition
          </Button>
        </RoleGate>
      </div>

      {/* Tab navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as NewsletterTab)}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList className="h-9 bg-transparent p-0 gap-0">
            {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-1.5 text-xs gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="today" className="mt-0">
            <TodaysEditionTab onCreateEdition={() => setBuilderOpen(true)} />
          </TabsContent>
          <TabsContent value="past-editions" className="mt-0">
            <PastEditionsTab />
          </TabsContent>
          <TabsContent value="drafts-queued" className="mt-0">
            <DraftsQueuedTab />
          </TabsContent>
          <TabsContent value="competitor-intel" className="mt-0">
            <CompetitorIntelTab
              onResearchTopic={(topic, competitors) =>
                handleOpenBrief(topic, { competitors, type: 'research' })
              }
              onAddToEdition={(topic, ctx) => handleOpenBrief(topic, ctx)}
              onSaveTopic={(topic) => handleOpenBrief(topic)}
            />
          </TabsContent>
          <TabsContent value="subscribers" className="mt-0">
            <SubscribersTab />
          </TabsContent>
          <TabsContent value="analytics" className="mt-0">
            <AnalyticsTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Modals */}
      <EditionBuilderModal
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onCreateEdition={handleCreateEdition}
        loading={mutLoading.createEdition}
      />
      <QuickBriefModal
        open={briefOpen}
        onOpenChange={setBriefOpen}
        topic={briefTopic}
        competitorContext={briefContext}
        onGenerate={handleGenerateBrief}
        onAddBlank={handleAddBlankBlock}
      />
    </div>
  );
}

/**
 * Main Newsletter page wrapped in NewsletterProvider.
 *
 * Requirements: 1.1, 12.1, 12.2, 12.3, 12.4, 13.5
 */
export function NewsletterPage() {
  const { role } = useAuth();

  // Map the platform role enum (lowercase) to the newsletter module's Role union
  const newsletterRole: NewsletterRole =
    role === 'admin' ? 'Admin'
    : role === 'editor' ? 'Editor'
    : role === 'writer' ? 'Writer'
    : 'Viewer';

  return (
    <NewsletterProvider userRole={newsletterRole}>
      <NewsletterPageContent />
    </NewsletterProvider>
  );
}
