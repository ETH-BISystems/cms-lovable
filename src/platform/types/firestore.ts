import type { Timestamp } from '@/services/timestamp';

/** Base fields present on every Firestore document. */
export interface FirestoreDocument {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
