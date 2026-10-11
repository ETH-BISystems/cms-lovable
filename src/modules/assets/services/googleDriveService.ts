/**
 * Google Drive Service (MOCK)
 *
 * In-memory rewrite of the production service. The workspace-wide Drive
 * connection is simulated as already-connected; listGoogleDriveFiles serves
 * a small seeded folder tree and importFromGoogleDrive registers the picked
 * images in the asset store (via assetService's mock insert helper) exactly
 * like the production googleDriveImport callable registers them via
 * uploadAssetFromURL semantics.
 */

import { delay, mockId } from '@/services/_delay';
import { Timestamp } from '@/services/timestamp';
import { __insertAsset } from './assetService';
import type {
  GoogleDriveConnection,
  GoogleDriveAuthUrlResult,
  GoogleDriveListInput,
  GoogleDriveListResult,
  GoogleDriveImportInput,
  GoogleDriveImportResult,
  GoogleDriveFile,
  AssetDocument,
} from '../types';

// production: settings/googleDrive doc + live grant verification (googleDriveStatus callable)
let connection: GoogleDriveConnection = {
  configured: true,
  connected: true,
  driveUserEmail: 'team@elitetravelhackers.com',
  connectedByEmail: 'daynis@elitetravelhackers.com',
  connectedAt: new Date(Date.now() - 30 * 864e5).toISOString(),
  connectionError: null,
};

const thumb = (slug: string) => `https://picsum.photos/seed/${slug}/400/300`;

function img(id: string, name: string, size: number, slug: string): GoogleDriveFile {
  return {
    id,
    name,
    mimeType: name.endsWith('.png') ? 'image/png' : 'image/jpeg',
    isFolder: false,
    size,
    webViewLink: `https://drive.google.com/file/d/${id}/view`,
    thumbnailUrl: thumb(slug),
  };
}

function folder(id: string, name: string): GoogleDriveFile {
  return {
    id,
    name,
    mimeType: 'application/vnd.google-apps.folder',
    isFolder: true,
    size: 0,
    webViewLink: `https://drive.google.com/drive/folders/${id}`,
    thumbnailUrl: null,
  };
}

// production: googleDriveList → Drive files.list per folder (corpora=user, all drives)
const driveTree = new Map<string, GoogleDriveFile[]>([
  ['root', [
    folder('folder-trip-photos', 'Trip Photos'),
    folder('folder-logos', 'Brand & Logos'),
    img('drive-img-1', 'haneda-lounge-view.jpg', 1_240_000, 'drive-haneda-lounge'),
    img('drive-img-2', 'boeing-777-wing-sunset.jpg', 2_180_000, 'drive-777-wing'),
    img('drive-img-3', 'singapore-suites-cabin.jpg', 1_860_000, 'drive-sq-suites'),
  ]],
  ['folder-trip-photos', [
    img('drive-img-4', 'tokyo-shinjuku-night.jpg', 1_540_000, 'drive-shinjuku'),
    img('drive-img-5', 'kyoto-fushimi-inari.jpg', 1_390_000, 'drive-fushimi'),
    img('drive-img-6', 'sydney-harbour-flight.jpg', 2_050_000, 'drive-sydney-harbour'),
    img('drive-img-7', 'louvre-abu-dhabi.jpg', 1_720_000, 'drive-louvre-abudhabi'),
  ]],
  ['folder-logos', [
    img('drive-img-8', 'virgin-atlantic-logo.png', 84_000, 'drive-virgin-logo'),
    img('drive-img-9', 'ana-logo.png', 62_000, 'drive-ana-logo'),
  ]],
  ['sharedWithMe', [
    folder('folder-shared-2026', 'ETH Shared 2026'),
    img('drive-img-10', 'contributor-iceland-lagoon.jpg', 2_340_000, 'drive-iceland-lagoon'),
  ]],
  ['folder-shared-2026', [
    img('drive-img-11', 'contributor-doha-skyline.jpg', 1_910_000, 'drive-doha-skyline'),
    img('drive-img-12', 'contributor-a380-takeoff.jpg', 2_460_000, 'drive-a380-takeoff'),
  ]],
]);

/** Current workspace connection state (verified live against Google). */
// production: httpsCallable(functions, 'googleDriveStatus')
export async function getGoogleDriveStatus(): Promise<GoogleDriveConnection> {
  await delay(300);
  return { ...connection };
}

/**
 * Start the OAuth connect flow. In the mock the workspace is pre-connected;
 * this returns a dummy consent URL for parity with the disconnected path.
 */
// production: httpsCallable(functions, 'googleDriveAuthUrl')
export async function getGoogleDriveAuthUrl(): Promise<GoogleDriveAuthUrlResult> {
  await delay(200);
  return { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=1' };
}

/** Browse a Drive folder (folders + images, shared drives included). */
// production: httpsCallable(functions, 'googleDriveList')
export async function listGoogleDriveFiles(
  input: GoogleDriveListInput = {}
): Promise<GoogleDriveListResult> {
  await delay(350);
  const key = input.folderId ?? 'root';
  let files = [...(driveTree.get(key) ?? [])];

  if (input.query) {
    const q = input.query.toLowerCase();
    files = files.filter((f) => f.name.toLowerCase().includes(q));
  }

  return { files, nextPageToken: null };
}

/**
 * Bulk-import selected files (and folder contents, one level deep) into the
 * Asset Library. production: httpsCallable(functions, 'googleDriveImport') —
 * server-side copy → Storage + asset doc (status active, source Upload) with
 * provenance { source: 'google-drive', driveFileId, ... } and upload_history.
 */
export async function importFromGoogleDrive(
  input: GoogleDriveImportInput
): Promise<GoogleDriveImportResult> {
  await delay(1500);

  // Expand selected folders one level deep, like production.
  const fileIds = new Set(input.fileIds);
  for (const folderId of input.folderIds ?? []) {
    for (const child of driveTree.get(folderId) ?? []) {
      if (!child.isFolder) fileIds.add(child.id);
    }
  }

  const allFiles = [...driveTree.values()].flat();
  const results: GoogleDriveImportResult['results'] = [];
  const assetIds: string[] = [];

  for (const fileId of fileIds) {
    const file = allFiles.find((f) => f.id === fileId);
    if (!file) {
      results.push({ fileId, name: fileId, ok: false, error: 'File not found in Drive listing' });
      continue;
    }
    if (file.size > 25 * 1024 * 1024) {
      results.push({ fileId, name: file.name, ok: false, skipped: true, error: 'Skipped: file exceeds 25 MB limit' });
      continue;
    }

    const assetId = mockId('asset');
    const slug = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cdnUrl = file.thumbnailUrl?.replace('/400/300', '/1024/768') ?? `https://picsum.photos/seed/${slug}/1024/768`;
    const now = Timestamp.now();

    const asset: AssetDocument = {
      id: assetId,
      filename: file.name,
      description: '',
      category: 'Photo',
      source: 'Upload',
      format: file.mimeType.includes('png') ? 'PNG' : 'JPG',
      width: 1024,
      height: 768,
      sizeBytes: file.size,
      uploadedBy: 'mock-admin',
      uploadedAt: now,
      lastUpdated: now,
      altText: '',
      titleAttribute: '',
      tags: [],
      cdnUrl,
      thumbnailUrl: file.thumbnailUrl ?? cdnUrl,
      status: 'active',
      webflowSync: 'N/A',
      lastSynced: null,
      association: null,
      darkVariantUrl: null,
      isBrandAsset: false,
      seoScore: 0,
      taxonomy: {
        airlines: [],
        hotels: [],
        cabinClass: null,
        experienceTypes: [],
        lounges: [],
        destinations: [],
        creditCards: [],
        aircraftTypes: [],
        tripComponent: null,
      },
      webflowItemId: null,
      aiSuggestions: null,
      provenance: {
        sourceUrl: file.webViewLink ?? undefined,
        originalImageUrl: `https://drive.google.com/file/d/${file.id}/view`,
      },
      createdAt: now,
      updatedAt: now,
    };
    __insertAsset(asset);
    assetIds.push(assetId);
    results.push({ fileId, name: file.name, ok: true, assetId });
  }

  connection = { ...connection };

  const imported = results.filter((r) => r.ok).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok && !r.skipped).length;

  return { imported, failed, skipped, truncated: false, assetIds, results };
}

/** Disconnect the workspace Drive (admin only, server-enforced). */
// production: httpsCallable(functions, 'googleDriveDisconnect')
export async function disconnectGoogleDrive(): Promise<{ disconnected: boolean }> {
  await delay(400);
  connection = {
    ...connection,
    connected: false,
    driveUserEmail: null,
    connectedByEmail: null,
    connectedAt: null,
  };
  return { disconnected: true };
}
