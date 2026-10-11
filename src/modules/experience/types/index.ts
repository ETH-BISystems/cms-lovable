import { Timestamp } from '@/services/timestamp';

// ─── Enums & Union Types ────────────────────────────────────────────────────

export type ExperienceSource = 'voice-note' | 'editorial-note' | 'tiktok' | 'instagram' | 'youtube' | 'x-twitter' | 'linkedin' | 'facebook' | 'pinterest';
export type NoteType = 'personal' | 'editorial' | 'refresh';
export type Brand = 'EPM' | 'CC' | 'JF';
export type AIConfidence = 'high' | 'medium' | 'low';
export type TranscriptionStatus = 'pending' | 'completed' | 'error' | 'skipped';
export type TaggingStatus = 'pending' | 'completed' | 'error';
export type CaptureCategory = 'flight' | 'hotel' | 'lounge' | 'destination' | 'card' | 'general';
export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'x-twitter' | 'linkedin' | 'facebook' | 'pinterest';
export type UsageStatus = 'all' | 'attached' | 'unattached' | 'embedded' | 'eeat-sources';
export type ExperienceTab = 'all' | 'voice-notes' | 'social-posts' | 'articles-needing';
export type TaxonomyDimension = 'airline' | 'hotel' | 'airport' | 'destination' | 'cabinClass' | 'lounge' | 'creditCard' | 'experienceType' | 'tripComponent';

// ─── Taxonomy ───────────────────────────────────────────────────────────────

export interface ExperienceTaxonomy {
  airline?: string;
  hotel?: string;
  airport?: string;
  destination?: string;
  aircraftType?: string;
  cabinClass?: string;
  lounge?: string;
  creditCard?: string;
  experienceType?: string;
  tripComponent?: string;
  tags: string[];
}

// ─── Core Data Models ───────────────────────────────────────────────────────

export interface ExperienceAutoTags {
  destinations: string[];
  airlines: string[];
  hotels: string[];
  experienceTypes: string[];
  cardKeywords: string[];
}

export interface ExperienceTranscript {
  id: string;
  sourcePlatform: 'dashboard-recording' | SocialPlatform;
  sourceUrl?: string;
  /** oEmbed HTML from the source platform — used to embed the post inline in articles */
  embedHtml?: string | null;
  videoTitle?: string;
  publishDate?: Timestamp;
  transcriptText: string;
  /** Cloud Storage path of the transcript text file (experience-transcripts/{id}.txt) */
  transcriptFilePath?: string;
  confidence?: string;
  contributor: string;
  contributorUid: string;
  topicTags: string[];
  autoTags: ExperienceAutoTags;
  attachedArticleIds: string[];
  exportedToNotebookLM: boolean;
  exportedAt?: Timestamp;
  audioStoragePath?: string;
  duration?: number;
  transcriptionStatus?: 'pending' | 'completed' | 'error' | 'skipped';
  taggingStatus?: 'pending' | 'completed' | 'error';
  noteType?: 'personal' | 'editorial' | 'refresh';
  title?: string;
  category?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExperienceRef {
  id: string;
  transcriptId: string;
  transcriptPreview: string;
  contributor: string;
  sourcePlatform: string;
  attachedAt: Timestamp;
  attachedBy: string;
}

// ─── Cloud Function Input/Output Types ──────────────────────────────────────

export interface SaveExperienceNoteInput {
  audioStoragePath: string | null;
  transcript: string;
  duration: number;
  mode: 'recorded' | 'typed';
  noteType: 'personal' | 'editorial' | 'refresh';
  contributor: string;
  topicTags?: string[];
  title?: string;
  category?: string;
}

export interface SaveExperienceNoteOutput {
  transcriptId: string;
  transcriptionStatus: string;
}

export interface AutoTagTranscriptInput {
  transcriptId: string;
}

export interface AutoTagTranscriptOutput {
  success: boolean;
  autoTags?: ExperienceAutoTags;
  error?: string;
}

export interface AttachExperienceInput {
  transcriptId: string;
  articleId: string;
}

export interface AttachExperienceOutput {
  success: boolean;
  refId: string;
}

export interface DetachExperienceInput {
  transcriptId: string;
  articleId: string;
}

export interface DetachExperienceOutput {
  success: boolean;
}

export interface ExportToNotebookLMInput {
  transcriptIds: string[];
  format: 'structured' | 'raw';
}

export interface ExportToNotebookLMOutput {
  success: boolean;
  exportedCount: number;
  downloadUrl: string;
  errors?: string[];
}

export interface ImportPlaceholderOutput {
  success: false;
  error: string;
  setupCommand: string;
}

// ─── Hook Return Types ──────────────────────────────────────────────────────

export interface UseExperienceTranscriptsOptions {
  sourcePlatform?: string;
  contributorUid?: string;
  noteType?: string;
  exportedToNotebookLM?: boolean;
  limit?: number;
}

export interface UseExperienceTranscriptsReturn {
  transcripts: ExperienceTranscript[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export interface UseExperienceCaptureReturn {
  saving: boolean;
  error: string | null;
  saveRecording: (audioBlob: Blob, duration: number, metadata: CaptureMetadata) => Promise<string>;
  saveTyped: (text: string, metadata: CaptureMetadata) => Promise<string>;
}

export interface UseAutoTagReturn {
  tagging: boolean;
  triggerAutoTag: (transcriptId: string) => Promise<ExperienceAutoTags | null>;
}

export interface UseExperienceExportReturn {
  exporting: boolean;
  exportSelected: (ids: string[], format: 'structured' | 'raw') => Promise<string>;
  exportAllPending: (format: 'structured' | 'raw') => Promise<string>;
}

// ─── Component Prop Interfaces ──────────────────────────────────────────────

export interface ExperienceLibraryProps {
  onOpenNotebook: () => void;
  onOpenCapture: (mode: 'record' | 'type') => void;
}

export interface ExperienceCardProps {
  transcript: ExperienceTranscript;
  onFilterByTag: (key: string, value: string) => void;
  onAttach: (transcriptId: string) => void;
  onRetag: (transcriptId: string) => void;
}

export interface CapturePanelProps {
  onSaved: () => void;
  /** Which capture mode the panel opens in (Record New vs Type New). */
  initialMode?: 'record' | 'type';
}

export interface NotebookLMPanelProps {
  open: boolean;
  onClose: () => void;
}

export interface ArticlePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (articleId: string, articleTitle: string) => void;
  currentAttachments: string[];
  /** The transcript being attached/detached */
  transcriptId: string | null;
}

export interface InlineTagEditorProps {
  transcript: ExperienceTranscript;
  onSave: (transcriptId: string, tags: ExperienceAutoTags, topicTags: string[]) => void;
  onCancel: () => void;
}

// ─── Capture Metadata ───────────────────────────────────────────────────────

export interface CaptureMetadata {
  noteType: 'personal' | 'editorial' | 'refresh';
  contributor: string;
  contributorUid?: string;
  topicTags?: string[];
  title?: string;
  category?: string;
}


// ─── Experience Item (unified view model) ───────────────────────────────────

export interface ExperienceItem {
  id: string;
  source: ExperienceSource;
  noteType: NoteType;
  contributor: { name: string; uid: string; avatar: string };
  accountHandle?: string;
  /** The connected handle whose import created this item (handle imports only). */
  sourceHandle?: string;
  brand: Brand;
  title?: string;
  transcript: string;
  duration?: number;
  sourceUrl?: string;
  /** oEmbed HTML from the source platform — used to embed the post inline in articles */
  embedHtml?: string | null;
  audioStoragePath?: string;
  taxonomy: ExperienceTaxonomy;
  attachedArticles: ArticleRef[];
  embeddedInCount: number;
  eeatSourceCount: number;
  aiConfidence?: AIConfidence;
  transcriptionStatus: TranscriptionStatus;
  taggingStatus: TaggingStatus;
  engagementMetrics?: EngagementMetrics;
  thumbnailUrl?: string;
  thumbnailAspect?: '16:9' | '9:16' | '1:1';
  threadCount?: number;
  caption?: string;
  category?: CaptureCategory;
  exportedToNotebookLM: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleRef {
  id: string;
  title: string;
}

export interface EngagementMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  retweets?: number;
  reactions?: number;
}

// ─── Social Accounts ────────────────────────────────────────────────────────

export interface SocialAccount {
  platform: SocialPlatform;
  handle: string;
  displayName: string;
  brand: Brand;
  connected: boolean;
  lastSynced?: Date;
  postCount: number;
}

// ─── Articles Needing Experience ────────────────────────────────────────────

export interface ArticleNeedingExperience {
  id: string;
  title: string;
  status: 'Writing' | 'Researching';
  assignee: { name: string; avatar: string };
  needed: string;
  targetKeyword: string;
  topicTags: string[];
  aiSuggestions: ExperienceSuggestion[];
}

export interface ExperienceSuggestion {
  experienceId: string;
  title: string;
  sourceType: ExperienceSource;
  relevanceDescription: string;
  thumbnailUrl?: string;
}

// ─── Filter & Hook Types ────────────────────────────────────────────────────

export interface ExperienceFilterState {
  activeTab: ExperienceTab;
  searchQuery: string;
  activeSource: ExperienceSource | null;
  brandFilter: Brand | null;
  teamMemberFilter: string | null;
  usageStatusFilter: UsageStatus;
  socialPlatformFilter: SocialPlatform | null;
  /** Show only items imported from this account handle (connected-handle view). */
  accountHandleFilter: string | null;
  taxonomyFilters: Partial<Record<TaxonomyDimension, string>>;
}

export interface UseExperiencesOptions {
  source?: ExperienceSource;
  brand?: Brand;
  noteType?: NoteType;
  contributorUid?: string;
  usageStatus?: UsageStatus;
  /** Only items imported from this account handle. */
  accountHandle?: string;
  taxonomyFilters?: Partial<Record<TaxonomyDimension, string>>;
  searchQuery?: string;
  limit?: number;
}

export interface UseExperiencesReturn {
  items: ExperienceItem[];
  totalCount: number;
  filteredCount: number;
  /** Distinct account handles across ALL loaded items (unfiltered), with item counts — most items first. */
  accountHandles: Array<{ handle: string; count: number }>;
  /** Every loaded item before filtering/pagination — for cross-cutting stats (handle centre). */
  allItems: ExperienceItem[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

// ─── Capture Types ──────────────────────────────────────────────────────────

export interface CaptureFormState {
  title: string;
  contributor: string;
  contributorUid: string;
  category: CaptureCategory;
  mode: 'record' | 'type';
  noteType: NoteType;
  brand: Brand;
  taxonomy: Partial<ExperienceTaxonomy>;
  freeformTags: string[];
  attachToArticleId?: string;
}

export interface FollowUpQuestion {
  question: string;
  answer?: string;
  skipped: boolean;
}

// ─── Import Results ─────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  importedCount?: number;
  error?: string;
  setupCommand?: string;
}

// ─── NotebookLM ─────────────────────────────────────────────────────────────

export interface NotebookExportOptions {
  format: 'structured' | 'raw';
  transcriptIds: string[];
}
