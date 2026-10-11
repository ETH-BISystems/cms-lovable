// Page Components
export { ExperiencePage } from './components/ExperiencePage';
export { ZernioCallbackPage } from './components/ZernioCallbackPage';

// Sub-Components
export { AudioWaveform } from './components/AudioWaveform';
export { InlineTagEditor } from './components/InlineTagEditor';

// Services (Cloud Function wrappers other modules may call)
export {
  callImportSocialPost,
  callBackfillSocialHandle,
  callAttachToArticle,
  callDetachFromArticle,
  callZernioConnectStart,
  callZernioConnectionSync,
  callZernioDisconnect,
} from './services/experienceService';
export type { ZernioConnectionSyncResult } from './services/experienceService';

// Utils
export { buildVideoEmbedHtml, buildSocialEmbedHtml, buildEmailSocialEmbedHtml, buildSocialLinkCardHtml, getVideoEmbedSrc, isEmbeddableVideoUrl } from './utils/videoEmbed';
export { timestampToDate } from './utils/handleMatch';

// Hooks
export { useExperiences } from './hooks/useExperiences';
export { useExperienceFilters } from './hooks/useExperienceFilters';
export { useAudioPlayback } from './hooks/useAudioPlayback';
export { useExperienceCapture } from './hooks/useExperienceCapture';

// Types
export type {
  ExperienceItem,
  ExperienceSource,
  ExperienceTaxonomy,
  ExperienceTranscript,
  ExperienceAutoTags,
  ExperienceRef,
  Brand,
  NoteType,
  AIConfidence,
  SocialAccount,
  SocialPlatform,
  ArticleNeedingExperience,
  ExperienceSuggestion,
  CaptureCategory,
  CaptureMetadata,
  TaxonomyDimension,
} from './types';

// Route metadata
export const experienceRoutes = [
  { path: '/experience', label: 'Experience Library', icon: 'Mic' },
] as const;

export const experienceNavigation = {
  label: 'Experience Library',
  icon: 'Mic',
  path: '/experience',
};
