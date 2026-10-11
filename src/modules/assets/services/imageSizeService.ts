/**
 * Image Size Service (MOCK)
 *
 * Team-shared custom image sizes for AI image editing. In production these
 * live in the `image_sizes` Firestore collection (doc id = "WxH") with
 * mutations via the addImageSize / removeImageSize callables; here they are
 * an in-memory list with the same subscribe/add/remove surface.
 */

import { delay } from '@/services/_delay';
import type { ImageSize } from '../types';

type Unsubscribe = () => void;

// production: Firestore `image_sizes` collection (ordered by addedAt asc)
const customSizeStore: ImageSize[] = [];

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((cb) => cb());
}

/** production: onSnapshot(query(collection(db, 'image_sizes'), orderBy('addedAt', 'asc'))) */
export function subscribeToImageSizes(
  onData: (sizes: ImageSize[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const emit = () => {
    try {
      onData([...customSizeStore]);
    } catch (err) {
      onError(err as Error);
    }
  };
  const timer = setTimeout(emit, 150);
  listeners.add(emit);
  return () => {
    clearTimeout(timer);
    listeners.delete(emit);
  };
}

/** production: httpsCallable(functions, 'addImageSize') */
export async function addImageSize(width: number, height: number): Promise<void> {
  await delay(200);
  if (!customSizeStore.some((s) => s.width === width && s.height === height)) {
    customSizeStore.push({ width, height, isCustom: true });
    notify();
  }
}

/** production: httpsCallable(functions, 'removeImageSize') */
export async function removeImageSize(width: number, height: number): Promise<void> {
  await delay(200);
  const idx = customSizeStore.findIndex((s) => s.width === width && s.height === height);
  if (idx >= 0) {
    customSizeStore.splice(idx, 1);
    notify();
  }
}
