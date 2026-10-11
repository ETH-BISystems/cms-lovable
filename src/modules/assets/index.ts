// Assets Module - Public API Exports
// All other modules should import from this barrel file only

// Components
export { AssetsPage } from './components/AssetsPage';
export { AssetDetailPanel } from './components/AssetDetailPanel';
export { AssetCard } from './components/AssetCard';
export { AssetGrid } from './components/AssetGrid';
export { AssetListView } from './components/AssetListView';
export { FilterBar } from './components/FilterBar';
export { SearchBar } from './components/SearchBar';
export { CategoryFilter } from './components/CategoryFilter';
export { NeedsIntakeBanner } from './components/NeedsIntakeBanner';
export { BulkActionsToolbar } from './components/BulkActionsToolbar';
export { ArticlePicker } from './components/ArticlePicker';
export { AssetPickerDialog } from './components/AssetPickerDialog';
export type { AssetPickerDialogProps } from './components/AssetPickerDialog';
export { UploadDialog } from './components/UploadDialog';
export { BatchEditDialog } from './components/BatchEditDialog';
export type { BatchEditDialogProps } from './components/BatchEditDialog';
export { GenerateAIImageDialog } from './components/GenerateAIImageDialog';
export { EditAIImageDialog } from './components/EditAIImageDialog';
export type { EditAIImageDialogProps } from './components/EditAIImageDialog';
export { AIIntakePanel } from './components/AIIntakePanel';
export { AIIntakeFlow } from './components/AIIntakeFlow';
export { ContentTagsSection } from './components/ContentTagsSection';
export { BrandAssetsCDN } from './components/BrandAssetsCDN';
export { GoogleDriveTab } from './components/GoogleDriveTab';
export { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
export { WebflowSyncDialog } from './components/WebflowSyncDialog';
export { ExportDialog } from './components/ExportDialog';
export { SEOScoreIndicator } from './components/SEOScoreIndicator';
export { TagsInput } from './components/TagsInput';
export { TaxonomyPicker } from './components/TaxonomyPicker';
export { UsageTracker } from './components/UsageTracker';

// Context
export { AssetsProvider, useAssetsContext } from './context/AssetsContext';

// Hooks (for other modules that need asset data)
export { useAssets } from './hooks/useAssets';
export { useAssetDetail } from './hooks/useAssetDetail';
export { useAssetUpload } from './hooks/useAssetUpload';
export { useBulkAssetUpload } from './hooks/useBulkAssetUpload';
export type { BulkUploadItem, BulkUploadStatus } from './hooks/useBulkAssetUpload';
export { useAIIntake } from './hooks/useAIIntake';
export { useAssetMutations } from './hooks/useAssetMutations';
export { useWebflowSync } from './hooks/useWebflowSync';
export { useTaxonomyData } from './hooks/useTaxonomyData';

// Utils
export {
  isReelPortrait,
  checkReelPortrait,
  loadImageDimensions,
  REEL_PORTRAIT,
} from './utils/imageAspect';
export { buildBatchApplyPayload, normalizeBatchTags } from './utils/batchMetadata';

// Services (exposed for advanced use cases)
export * as assetService from './services/assetService';
export * as storageService from './services/storageService';
export * as aiService from './services/aiService';
export * as webflowService from './services/webflowService';
export * as budgetService from './services/budgetService';
export * as brandAssetsService from './services/brandAssetsService';
export * as googleDriveService from './services/googleDriveService';

// Types (for other modules that reference asset data)
export type {
  AssetCategory,
  AssetSource,
  AssetFormat,
  AssetStatus,
  WebflowSyncStatus,
  UsageContext,
  ArticleStatus,
  AssetTaxonomy,
  GenerationMetadata,
  AssetProvenance,
  AssetDocument,
  BrandAssetCategory,
  BrandAssetSlot,
  AIBudgetDocument,
  BudgetUsage,
  GoogleDriveConnection,
  GoogleDriveFile,
  UploadHistoryEntry,
  UsageEntry,
  AssetFilters,
  SortOption,
  SEOScoreBreakdown,
  LocationDocument,
  AISuggestions,
  QualityTier,
  StylePreset,
  Resolution,
  AspectRatioOption,
  UploadAssetInput,
  UploadAssetResult,
  StartAIIntakeInput,
  CompleteAIIntakeInput,
  UpdateAssetInput,
  DeleteAssetInput,
  DeleteAssetResult,
  AddAssetToArticleInput,
  RemoveAssetFromArticleInput,
  SyncToWebflowInput,
  SyncToWebflowResult,
  BulkSyncToWebflowInput,
  BulkSyncToWebflowResult,
  GenerateAIImageInput,
  GenerateAIImageResult,
  BulkAddTagsInput,
  BulkAddTagsResult,
  BatchTagMode,
  BatchApplyAssetMetadataInput,
  BatchApplyAssetMetadataResult,
  GenerateExportZIPInput,
  GenerateExportZIPResult,
  CheckDuplicateInput,
  CheckDuplicateResult,
  UpdateBrandAssetUrlInput,
  UpdateBrandAssetUrlResult,
  BulkImportBrandUrlsInput,
  BulkImportBrandUrlsResult,
  GoogleDriveAuthUrlResult,
  GoogleDriveListInput,
  GoogleDriveListResult,
  GoogleDriveImportInput,
  GoogleDriveImportFileResult,
  GoogleDriveImportResult,
} from './types';
