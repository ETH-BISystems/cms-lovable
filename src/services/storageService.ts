// MOCK storage service — same interface as the production Firebase Storage
// upload flow (uploadAsset callable → storage put → completeUpload callable →
// read-back). In the mock there is no bucket: the uploaded file is read into
// an in-memory data URL so it renders everywhere in this browser session,
// and the returned shape matches the production UploadedAsset exactly.
//
// NOTE: production persists real CDN URLs from Firebase Storage. The mock's
// data URLs are intentionally NOT blob: URLs (those are session-local and
// broke 14 card images in the real system — see service history).

import { delay, mockId } from './_delay';

export interface UploadedAsset {
  id: string;
  filename: string;
  cdnUrl: string;
  thumbnailUrl: string;
  format: string;
  fileSize: number;
  uploadedAt: Date;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const storageService = {
  async uploadFile(file: File, _folder = 'assets'): Promise<UploadedAsset> {
    await delay(600);
    const dataUrl = await readAsDataUrl(file);
    return {
      id: mockId('asset'),
      filename: file.name,
      cdnUrl: dataUrl,
      thumbnailUrl: dataUrl,
      format: file.type,
      fileSize: file.size,
      uploadedAt: new Date(),
    };
  },
};
