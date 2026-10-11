/**
 * Storage Service (MOCK)
 *
 * Same exported names/signatures as production. The real file transfer is
 * simulated: uploadFile replays progress ticks on a timer and resolves via
 * the same onProgress/onError/onComplete callback contract the Firebase
 * UploadTask wrapper used. uploadToSignedUrl keeps the production XHR PUT
 * (it only ever runs against a signed URL, which the mock never issues).
 */

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

/** Minimal stand-in for firebase/storage's UploadTask (consumers ignore it). */
export interface MockUploadTask {
  cancel: () => void;
}

/**
 * Upload file to signed URL (direct PUT request)
 * Used after getting uploadUrl from uploadAsset Cloud Function
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  options?: UploadOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && options?.onProgress) {
        options.onProgress({
          bytesTransferred: e.loaded,
          totalBytes: e.total,
          progress: (e.loaded / e.total) * 100,
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options?.onComplete?.();
        resolve();
      } else {
        const error = new Error(`Upload failed with status ${xhr.status}`);
        options?.onError?.(error);
        reject(error);
      }
    });

    xhr.addEventListener('error', () => {
      const error = new Error('Upload failed');
      options?.onError?.(error);
      reject(error);
    });

    xhr.addEventListener('abort', () => {
      const error = new Error('Upload aborted');
      options?.onError?.(error);
      reject(error);
    });

    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Upload file with progress tracking (MOCK).
 * production: uploadBytesResumable(ref(storage, storagePath), file) with a
 * 'state_changed' listener — the mock replays the same callback sequence.
 */
export function uploadFile(
  file: File,
  storagePath: string,
  options?: UploadOptions
): MockUploadTask {
  void storagePath;
  let cancelled = false;
  const total = file.size || 1;
  const ticks = [0.08, 0.22, 0.41, 0.63, 0.82, 1];

  let i = 0;
  const step = () => {
    if (cancelled) return;
    const fraction = ticks[i];
    options?.onProgress?.({
      bytesTransferred: Math.round(total * fraction),
      totalBytes: total,
      progress: fraction * 100,
    });
    i += 1;
    if (i < ticks.length) {
      setTimeout(step, 120);
    } else {
      options?.onComplete?.();
    }
  };
  setTimeout(step, 60);

  return {
    cancel: () => {
      cancelled = true;
      options?.onError?.(new Error('Upload aborted'));
    },
  };
}

/**
 * Calculate perceptual hash for duplicate detection
 * This is a simplified client-side implementation
 * Server-side implementation in Cloud Functions is more robust
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Validate file before upload
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];

  // Max size: 50MB
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size exceeds 50MB limit');
  }

  // Allowed formats
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif',
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not supported. Allowed: JPG, PNG, WebP, GIF, SVG, AVIF');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate thumbnail preview (client-side)
 */
export async function generateThumbnailPreview(
  file: File,
  maxWidth = 300,
  maxHeight = 300
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
