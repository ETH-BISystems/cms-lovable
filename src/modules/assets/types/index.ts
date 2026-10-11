import type { Timestamp } from '@/services/timestamp';
import type { FirestoreDocument } from '@/platform/types/firestore';

// ─── Enums / Union Types ──────────────────────────────────────────────────────

export type AssetCategory =
  | 'Photo'
  | 'Screenshot'
  | 'Infographic'
  | 'Card Art'
  | 'Card Image'
  | 'Issuer Logo'
  | 'Airline Logo'
  | 'Hotel Logo'
  | 'Alliance Logo'
  | 'Program Logo'
  | 'Team Photo';

export type AssetSource = 'Upload' | 'Stock' | 'AI Generated';

export type AssetFormat = 'WebP' | 'PNG' | 'SVG' | 'JPG' | 'GIF' | 'AVIF';

export type AssetStatus = 'draft' | 'active' | 'archived';

export type WebflowSyncStatus = 'Synced' | 'Pending' | 'Not Published' | 'Failed' | 'N/A';

export type UsageContext = 'featured' | 'inline' | 'card-art' | 'logo' | 'comparison';

export type ArticleStatus = 'Published' | 'Draft' | 'In Review';

// ─── Asset Document ───────────────────────────────────────────────────────────

export interface AssetTaxonomy {
  airlines: string[];           // e.g., ["United", "Delta"]
  hotels: string[];             // e.g., ["Marriott", "Hilton"]
  cabinClass: string | null;    // e.g., "Business", "First", "Economy"
  experienceTypes: string[];    // e.g., ["Lounge", "Flight", "Hotel Stay"]
  lounges: string[];            // e.g., ["United Polaris Lounge", "Centurion Lounge"]
  destinations: Array<{
    city: string;
    country: string;
  }>;
  creditCards: string[];        // e.g., ["Chase Sapphire Reserve", "Amex Platinum"]
  aircraftTypes: string[];      // e.g., ["Boeing 777-300ER", "Airbus A350"]
  tripComponent: string | null; // e.g., "In-Flight", "Hotel Stay", "Pre-Departure"
}

export interface AISuggestions {
  description: string;
  altText: string;
  titleAttribute: string;
  seoFilename: string;
  tags: string[];
  taxonomy: Partial<AssetTaxonomy>;
}

// ─── Generation Metadata ──────────────────────────────────────────────────────

export interface GenerationMetadata {
  qualityTier: QualityTier;
  modelName: string;              // e.g., 'gemini-3-pro-image-preview'
  stylePreset: StylePreset;
  resolution: Resolution;
  aspectRatio: string;
  numImages: number;
  costPerImage: number;
}

/**
 * Where an asset came from (CMS-155). Set by `uploadAssetFromURL` for source
 * article images and carried forward (plus `editedWithPrompt`) through
 * `editAIImage` edit chains.
 */
export interface AssetProvenance {
  /** The source article page the image was found on. */
  sourceUrl?: string;
  /** The original external image URL (pre-import / pre-edit). */
  originalImageUrl?: string;
  /** The AI edit prompt that produced this asset. */
  editedWithPrompt?: string;
}

export interface AssetDocument extends FirestoreDocument {
  id: string;
  filename: string;
  description: string;
  category: AssetCategory;
  source: AssetSource;
  format: AssetFormat;
  width: number;
  height: number;
  sizeBytes: number;
  uploadedBy: string;           // UID
  uploadedAt: Timestamp;
  lastUpdated: Timestamp;
  altText: string;
  titleAttribute: string;
  tags: string[];
  cdnUrl: string;
  thumbnailUrl: string;
  status: AssetStatus;
  webflowSync: WebflowSyncStatus;
  lastSynced: Timestamp | null;
  association: {
    type: string;               // e.g., "Card"
    name: string;               // e.g., "Chase Sapphire Reserve"
  } | null;
  darkVariantUrl: string | null;
  isBrandAsset: boolean;
  seoScore: number;             // 0-100
  taxonomy: AssetTaxonomy;
  webflowItemId: string | null; // Stored after first Webflow sync
  aiSuggestions?: AISuggestions | null; // Populated by startAIIntake, cleared by completeAIIntake
  generationMetadata?: GenerationMetadata;  // Present for AI-generated images
  generationCost?: number;                  // Total cost for this generation
  provenance?: AssetProvenance | null;      // CMS-155: origin trail for URL imports / AI edits
}

// ─── Brand Asset Slots ────────────────────────────────────────────────────────

export type BrandAssetCategory =
  | 'Issuer Logo'
  | 'Airline Logo'
  | 'Hotel Logo'
  | 'Alliance Logo'
  | 'Team Photo';

export interface BrandAssetSlot {
  id: string;
  entityName: string;            // e.g., "Chase", "United Airlines"
  category: BrandAssetCategory;
  cdnUrl: string | null;
  darkVariantUrl: string | null;
  updatedAt: Timestamp;
  updatedBy: string;             // UID
}

// ─── AI Budget ────────────────────────────────────────────────────────────────

export interface AIBudgetDocument {
  monthlyLimit: number;          // e.g., 50.00
  currentMonthUsage: number;     // Running total for current month
  currentMonth: string;          // e.g., "2026-03"
  lastUpdated: Timestamp;
}

export interface BudgetUsage {
  used: number;
  total: number;
  remaining: number;
}

// ─── Google Drive Connection ──────────────────────────────────────────────────

/**
 * Workspace-wide Drive connection state as reported by the googleDriveStatus
 * callable. One connection serves the whole team; the refresh token lives in
 * Secret Manager and is never exposed to clients.
 */
export interface GoogleDriveConnection {
  /** OAuth client id/secret are configured in Settings → API Credentials. */
  configured: boolean;
  connected: boolean;
  driveUserEmail: string | null;
  connectedByEmail: string | null;
  connectedAt: string | null;
  /** Present when the stored grant expired or was revoked — reconnect required. */
  connectionError: string | null;
}

/** One browsable Drive entry (folder or image) returned by googleDriveList. */
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size: number;
  webViewLink: string | null;
  /** Signed proxy URL (googleDriveThumb) — renders without any token. */
  thumbnailUrl: string | null;
}

// ─── Upload History Entry ─────────────────────────────────────────────────────

export interface UploadHistoryEntry {
  uploadedBy: string;           // UID
  uploadedAt: Timestamp;
  filename: string;
  sizeBytes: number;
  format: string;
  cdnUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage: string | null;
}

// ─── Usage Entry ──────────────────────────────────────────────────────────────

export interface UsageEntry {
  articleId: string;
  articleTitle: string;
  context: UsageContext;
  status: ArticleStatus;
  addedBy: string;              // UID
  addedAt: Timestamp;
}

// ─── Cloud Function Input / Output Types ──────────────────────────────────────

export interface UploadAssetInput {
  filename: string;
  category: AssetCategory;
  source: AssetSource;
  description?: string;
  sizeBytes: number;
  contentType: string;
  format?: string;
}

export interface UploadAssetResult {
  assetId: string;
}

export interface CompleteUploadInput {
  assetId: string;
  storagePath: string;
}

export interface StartAIIntakeInput {
  assetId: string;
}

export interface AIIntakeResult {
  description: string;
  altText: string;
  titleAttribute: string;
  seoFilename: string;
  taxonomy: Partial<AssetTaxonomy>;
  tags: string[];
}

export interface CompleteAIIntakeInput {
  assetId: string;
  approvedData: {
    description: string;
    altText: string;
    titleAttribute: string;
    filename: string;
    taxonomy: Partial<AssetTaxonomy>;
    tags: string[];
  };
}

export interface UpdateAssetInput {
  assetId: string;
  fields: Partial<Pick<AssetDocument,
    'filename' | 'description' | 'altText' | 'titleAttribute' | 'tags' | 'taxonomy' | 'association' | 'status'
  >>;
}

export interface DeleteAssetInput {
  assetId: string;
}

export interface DeleteAssetResult {
  usageCount: number;
  usageWarnings: Array<{
    articleId: string;
    articleTitle: string;
  }>;
}

export interface AddAssetToArticleInput {
  assetId: string;
  articleId: string;
  context: UsageContext;
}

export interface RemoveAssetFromArticleInput {
  assetId: string;
  articleId: string;
}

export interface SyncToWebflowInput {
  assetId: string;
}

export interface SyncToWebflowResult {
  webflowItemId: string;
  success?: boolean;
  message?: string;
}

export interface BulkSyncToWebflowInput {
  assetIds: string[];
}

export interface BulkSyncToWebflowResult {
  synced: string[];
  failed: Array<{ assetId: string; error: string }>;
  successCount?: number;
  failureCount?: number;
}

export type QualityTier = 'fast' | 'standard' | 'pro';

export type StylePreset =
  | 'photorealistic'
  | 'editorial'
  | 'cinematic'
  | 'illustration'
  | 'infographic'
  | 'brand'
  | 'none';

export type Resolution = '1K' | '2K' | '4K';

export type AspectRatioOption = '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

export interface GenerateAIImageInput {
  prompt: string;
  qualityTier?: QualityTier;           // default: 'fast'
  stylePreset?: StylePreset;           // default: 'none'
  resolution?: Resolution;             // default: '1K'
  aspectRatio?: AspectRatioOption;
  numImages?: 1 | 2 | 4;              // default: 4
  category?: AssetCategory;
  tags?: string[];
  negativePrompt?: string;
  sourceImages?: string[];             // CDN URLs or base64 data URIs
  editMode?: boolean;                  // true for image-to-image editing
}

export interface GenerateAIImageResult {
  assetId: string;
  cdnUrl: string;
  message: string;
  generationCost: number;
  additionalAssets?: Array<{
    assetId: string;
    cdnUrl: string;
  }>;
}

export interface EditAIImageInput {
  assetId: string;                 // Original asset to edit
  prompt: string;                  // Follow-up edit instruction
  negativePrompt?: string;
  sourceImages?: string[];         // Additional reference images (CDN URLs or base64)
  instanceCount?: number;          // 1-4, number of variations to generate
  strictMode?: boolean;            // true = preserve original exactly, only make specified changes
  width?: number;                  // Output image width in pixels
  height?: number;                 // Output image height in pixels
}

export interface ImageSize {
  width: number;
  height: number;
  isCustom: boolean;               // custom sizes can be deleted, defaults cannot
}

export interface EditAIImageResult {
  assetId: string;                 // New asset with edits applied
  cdnUrl: string;
  message: string;
  additionalAssets?: Array<{      // For multiple variations (instanceCount > 1)
    assetId: string;
    cdnUrl: string;
  }>;
}

export interface UploadFromURLInput {
  url: string;
  category: AssetCategory;
  description?: string;
  tags?: string[];
  /** CMS-155: the source article page the image was found on (provenance). */
  sourceUrl?: string;
}

export interface UploadFromURLResult {
  assetId: string;
  cdnUrl: string;
  message: string;
}

export interface CheckDuplicateInput {
  fileHash: string;
}

export interface CheckDuplicateResult {
  isDuplicate: boolean;
  existingAsset: {
    id: string;
    filename: string;
    cdnUrl: string;
  } | null;
}

export interface BulkAddTagsInput {
  assetIds: string[];
  tags: string[];
}

export interface BulkAddTagsResult {
  updated: number;
  failed: number;
}

// ─── Batch Apply Metadata (CMS-158) ──────────────────────────────────────────

export type BatchTagMode = 'replace' | 'append';

export interface BatchApplyAssetMetadataInput {
  assetIds: string[];
  fields: {
    /** Applied to every selected asset when non-empty. */
    description?: string;
    /** Applied to every selected asset when non-empty. */
    tags?: string[];
    /** 'replace' overwrites tags; 'append' merges (deduped). Default 'replace'. */
    tagMode?: BatchTagMode;
  };
}

export interface BatchApplyAssetMetadataResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  failures: Array<{ assetId: string; error: string }>;
}

export interface GenerateExportZIPInput {
  assetIds: string[];
  includeMetadata?: boolean;
}

export interface GenerateExportZIPResult {
  downloadUrl: string;          // Signed URL with 1-hour expiration
}

// ─── Brand Assets Cloud Function Types ────────────────────────────────────────

export interface UpdateBrandAssetUrlInput {
  slotId: string;
  cdnUrl: string;
}

export interface UpdateBrandAssetUrlResult {
  success: boolean;
}

export interface BulkImportBrandUrlsInput {
  rows: Array<{ entityName: string; cdnUrl: string }>;
}

export interface BulkImportBrandUrlsResult {
  matched: number;
  total: number;
}

// ─── Google Drive Cloud Function Types ────────────────────────────────────────

export interface GoogleDriveAuthUrlResult {
  authUrl: string;
}

export interface GoogleDriveListInput {
  folderId?: string | null;
  pageToken?: string | null;
  query?: string | null;
}

export interface GoogleDriveListResult {
  files: GoogleDriveFile[];
  nextPageToken: string | null;
}

export interface GoogleDriveImportInput {
  fileIds: string[];
  folderIds?: string[];
}

export interface GoogleDriveImportFileResult {
  fileId: string;
  name: string;
  ok: boolean;
  assetId?: string;
  skipped?: boolean;
  error?: string;
}

export interface GoogleDriveImportResult {
  imported: number;
  failed: number;
  skipped: number;
  /** True when the batch cap left files unimported — re-run to continue. */
  truncated: boolean;
  assetIds: string[];
  results: GoogleDriveImportFileResult[];
}

// ─── Filter / UI State Types ──────────────────────────────────────────────────

export interface AssetFilters {
  category: AssetCategory | '';
  airlines: string[];
  hotels: string[];
  cabinClass: string | '';
  experienceTypes: string[];
  aircraftTypes: string[];
  destinations: Array<{ city: string; country: string }>;
  source: AssetSource | '';
  usage: 'all' | 'used' | 'unused';
  dateFrom: Timestamp | null;
  dateTo: Timestamp | null;
  search: string;
  aiIntakeOnly: boolean;        // Shows only draft assets
  creditCardOnly: boolean;      // Shows only assets tagged with a credit card
  // Optional server-side query knobs consumed by assetService.subscribeToAssets.
  // Not all UI filter bars set these — treat as undefined by default.
  status?: AssetStatus;
  format?: AssetFormat;
  webflowSync?: WebflowSyncStatus;
  isBrandAsset?: boolean;
  minSeoScore?: number;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export type SortOption =
  | 'newest-first'
  | 'oldest-first'
  | 'name-a-z'
  | 'name-z-a'
  | 'largest-first'
  | 'smallest-first'
  | 'most-used'
  | 'destination-a-z'
  | 'aircraft-type';

export interface SEOScoreBreakdown {
  filenamePoints: number;       // 0, 15, or 30
  altTextPoints: number;        // 0, 20, or 40
  titlePoints: number;          // 0 or 30
  total: number;                // 0-100
}

// ─── Locations (shared collection) ────────────────────────────────────────────

export interface LocationDocument extends FirestoreDocument {
  id: string;
  city: string;
  country: string;
  countryCode: string;          // ISO 3166-1 alpha-2
  searchTerms: string[];        // ["tokyo", "japan", "tyo"]
}
