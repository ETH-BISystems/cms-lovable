// MOCK — replaces Firebase Storage uploads + the saveVoiceNote callable with
// in-memory equivalents on the article store. Exported names/signatures match
// production.

import { delay } from '@/services/_delay';
import { storeSaveVoiceNote } from './articleStore';

interface SaveVoiceNoteInput {
  articleId: string;
  audioStoragePath: string | null;
  transcript: string;
  duration: number;
  mode: 'recorded' | 'typed';
  noteType?: 'direction' | 'tip';
  contributor?: string;
}

interface SaveVoiceNoteOutput {
  noteId: string;
  transcriptionStatus: string;
}

/**
 * Mock of the Firebase Storage upload (production: uploadBytes to
 * `voice-notes/{articleId}/{timestamp}-{uid}.webm`). Returns a fake storage
 * path; no bytes leave the browser.
 */
export async function uploadVoiceNote(
  articleId: string,
  audioBlob: Blob,
  uid: string
): Promise<string> {
  await delay(600);
  if (!audioBlob) throw new Error('Failed to upload voice note: empty blob');
  return `voice-notes/${articleId}/${Date.now()}-${uid}.webm`;
}

/**
 * Mock of the saveVoiceNote Cloud Function — persists to the in-memory store
 * so useVoiceNotes subscribers see the note immediately.
 */
export async function callSaveVoiceNote(
  input: SaveVoiceNoteInput
): Promise<SaveVoiceNoteOutput> {
  await delay(400);
  return storeSaveVoiceNote(input);
}

/** Mock of Storage getDownloadURL — the path itself round-trips. */
export async function getVoiceNoteAudioUrl(storagePath: string): Promise<string> {
  await delay(100);
  return storagePath;
}
