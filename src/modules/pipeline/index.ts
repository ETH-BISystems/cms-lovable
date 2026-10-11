// Pipeline Module - Public API

// Types
export type {
  ArticleStatus,
  ArticleStage,
  PublishingState,
  RefreshStatus,
  RefreshReasonType,
  TaskStatus,
  EntryPoint,
  Priority,
  RevenuePotential,
  ConfidenceLevel,
  LinkSuggestionStatus,
  LinkStatus,
  SourceUrl,
  PipelineArticle,
  RefreshQueueItem,
  ArticleTask,
  ArticleVersion,
  CreateArticleInput,
  CreateArticleOutput,
  UpdateArticleStatusInput,
  UpdateArticleStatusOutput,
  AddToRefreshQueueInput,
  GenerateArticleDraftInput,
  GenerateTopicResearchInput,
  GenerateTopicResearchOutput,
  PublishToWebflowInput,
  PublishToWebflowOutput,
  ManageTasksInput,
  ManageTasksOutput,
  ResearchFinding,
  ResearchBrief,
  CompetitorData,
  PipelineFilters,
  RefreshQueueFilters,
  ContentLibraryFilters,
  LinkSuggestion,
  KeywordOpportunity,
  CompetitorGap,
  SEOIssue,
  RefreshTrigger,
  ArticleBrief,
  SEOCheckResult,
  FinalApprovalChecklist,
  MonitoringData,
  FactCheckIssue,
  FactCheckIssueType,
  ArticleFactCheck,
} from './types';

export {
  PIPELINE_CREATION_STAGES,
  HUMAN_GATE_STAGES,
  AUTO_STAGES,
  ACTION_STAGES,
  STAGE_ORDER,
  STATUS_TO_STAGE_MAP,
  PANEL_TABS,
  STAGE_DEFAULT_TAB,
  STAGE_TABS,
  KANBAN_COLUMNS,
  getValidForwardStages,
  getValidBackwardStages,
  isValidStageTransition,
  getStageDefaultTab,
  getStageTabs,
} from './types';
export type { PanelTab } from './types';

// Page Components
export { PipelinePage } from './components/PipelinePage';
export { RefreshQueuePage } from './components/RefreshQueuePage';
export { ContentLibraryPage } from './components/ContentLibraryPage';

// Detail Panel
export { ArticleDetailPanel } from './components/ArticleDetailPanel';

// Modals
export { NewArticleModal } from './components/NewArticleModal';
export { RefreshArticleModal } from './components/RefreshArticleModal';
export { AssetLibraryPickerModal } from './components/AssetLibraryPickerModal';
// Editorial insert dialogs — shared with the cards module's RichTextField
// (CMS-107) so card embed fields offer the full article insert set.
export { AddImageDialog } from './components/AddImageDialog';
export { AddVideoDialog } from './components/AddVideoDialog';
export { EmbedSocialPostDialog } from './components/EmbedSocialPostDialog';

// Hooks
export { useTeamMembers, type TeamMember } from './hooks/useTeamMembers';
export { useNewArticleModal } from './hooks/useNewArticleModal';

// Services
export { callCreateArticle } from './services/articleService';

// Context Providers
export { PipelineProvider, usePipelineContext } from './context/PipelineContext';
export { ArticleDetailProvider, useArticleDetailContext } from './context/ArticleDetailContext';
export { ArticleDetailPanelHost } from './components/ArticleDetailPanelHost';
export { ArticleDeepLinkHandler } from './components/ArticleDeepLinkHandler';

// Route definitions
export const pipelineRoutes = [
  { path: '/pipeline', label: 'Pipeline', icon: 'GitBranch' },
  { path: '/pipeline/refresh', label: 'Refresh Queue', icon: 'RefreshCw' },
  { path: '/pipeline/content-library', label: 'Content Library', icon: 'Library' },
];

// Navigation metadata for shell integration
export const pipelineNavigation = {
  label: 'Pipeline',
  icon: 'GitBranch',
  children: [
    { path: '/pipeline', label: 'Pipeline Board' },
    { path: '/pipeline/refresh', label: 'Refresh Queue' },
    { path: '/pipeline/content-library', label: 'Content Library' },
  ],
};
