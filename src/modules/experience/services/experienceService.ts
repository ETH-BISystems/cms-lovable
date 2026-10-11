// MOCK SERVICE — in-memory replacement for the production experienceService.
// Every function below keeps its production name/signature; the production
// implementation wrapped Firebase Storage or a callable Cloud Function
// (noted per-function in comments, e.g. // production: httpsCallable(functions, 'saveExperienceNote')).
// Data lives in module-level stores and is emitted to subscribers after mutations,
// mimicking Firestore onSnapshot behaviour closely enough for the mock UI.

import { delay, mockId } from '@/services/_delay';
import { Timestamp } from '@/services/timestamp';
import type {
  SaveExperienceNoteInput,
  SaveExperienceNoteOutput,
  AutoTagTranscriptOutput,
  AttachExperienceOutput,
  DetachExperienceOutput,
  ExportToNotebookLMOutput,
  ImportResult,
  ExperienceAutoTags,
} from '../types';

// ─── Raw document shapes (as Firestore returned them in production) ─────────

/** Raw experience-transcripts doc — consumed by useExperiences' converter and
 * useExperienceTranscripts' mapper, so field names mirror production exactly. */
export interface ExperienceDoc extends Record<string, unknown> {
  id: string;
  sourcePlatform: string;
  sourceUrl?: string;
  embedHtml?: string | null;
  videoTitle?: string;
  publishDate?: Timestamp;
  transcriptText: string;
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
  brand?: string;
  accountHandle?: string;
  sourceHandle?: string;
  engagementMetrics?: { views?: number; likes?: number; comments?: number; retweets?: number; reactions?: number };
  thumbnailUrl?: string;
  thumbnailAspect?: '16:9' | '9:16' | '1:1';
  threadCount?: number;
  caption?: string;
  aiConfidence?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Raw articles doc — consumed by ArticlePickerDialog / ArticlesNeedingExperience. */
export interface ArticleDoc extends Record<string, unknown> {
  id: string;
  title: string;
  status: string;
  assignee: { name: string; avatar: string };
  targetKeyword: string;
  topicTags?: string[];
  attachedExperienceIds?: string[];
  hasExperience?: boolean;
  createdAt: Timestamp;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const NOW = Date.now();
const DAY = 864e5;

const emptyAutoTags = (): ExperienceAutoTags => ({
  destinations: [],
  airlines: [],
  hotels: [],
  experienceTypes: [],
  cardKeywords: [],
});

let transcripts: ExperienceDoc[] = [
  // 1 — Voice note: JAL First Class flight review (flight)
  {
    id: 'exp-jal-first-hnd-sfo',
    sourcePlatform: 'dashboard-recording',
    transcriptText:
      'JAL First Class Haneda to San Francisco, seat 2K. The suite is noticeably wider than the ANA Suite — ' +
      'I could actually sit cross-legged. Champagne was Salon 2013, and the caviar service came out before takeoff. ' +
      'Booked with 80,000 AA miles — the same seat prices at $14,000 cash. Mattress pad plus the air-weave pillow ' +
      'meant I slept a solid six hours. Only gripe: the Wi-Fi cut out over the Pacific for about 40 minutes.',
    confidence: 'high',
    contributor: 'Daynis Olman',
    contributorUid: 'mock-admin-uid',
    topicTags: ['jal', 'first-class', 'hnd-sfo', 'award-flight'],
    autoTags: { ...emptyAutoTags(), airlines: ['Japan Airlines'], destinations: ['San Francisco'], experienceTypes: ['Flight Review'] },
    attachedArticleIds: ['article-jal-review'],
    exportedToNotebookLM: true,
    exportedAt: Timestamp.fromMillis(NOW - 1 * DAY),
    audioStoragePath: 'experience-notes/exp-jal-first-hnd-sfo/seed-mock-admin-uid.webm',
    duration: 184,
    transcriptionStatus: 'completed',
    taggingStatus: 'completed',
    noteType: 'personal',
    title: 'JAL First Class HND→SFO — worth every mile',
    category: 'flight',
    brand: 'EPM',
    aiConfidence: 'High',
    createdAt: Timestamp.fromMillis(NOW - 2 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 1 * DAY),
  },
  // 2 — Voice note: Amex Centurion Lounge LAS (lounge)
  {
    id: 'exp-centurion-lounge-las',
    sourcePlatform: 'dashboard-recording',
    transcriptText:
      'Quick note from the Amex Centurion Lounge at LAS Terminal 1. Got in at 8am and it was maybe 40% full — ' +
      'by 9:30 there was a waitlist. The made-to-order breakfast is gone; it is back to a buffet, but the chilaquiles ' +
      'were genuinely good. Full bar opens at 9. Shower suites are bookable at the front desk with about a 20-minute wait. ' +
      'Pro tip for readers: the quiet room in the back left corner has the best tarmac views and nobody sits there.',
    confidence: 'high',
    contributor: 'Sarah Chen',
    contributorUid: 'mock-editor-uid',
    topicTags: ['amex', 'centurion-lounge', 'las-vegas', 'lounge-access'],
    autoTags: { ...emptyAutoTags(), destinations: ['Las Vegas'], experienceTypes: ['Lounge Visit'], cardKeywords: ['Amex Platinum'] },
    attachedArticleIds: [],
    exportedToNotebookLM: false,
    audioStoragePath: 'experience-notes/exp-centurion-lounge-las/seed-mock-editor-uid.webm',
    duration: 96,
    transcriptionStatus: 'completed',
    taggingStatus: 'completed',
    noteType: 'editorial',
    title: 'Amex Centurion Lounge LAS — morning visit notes',
    category: 'lounge',
    brand: 'EPM',
    aiConfidence: 'High',
    createdAt: Timestamp.fromMillis(NOW - 4 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 4 * DAY),
  },
  // 3 — Editorial note (typed): Park Hyatt Tokyo (hotel)
  {
    id: 'exp-park-hyatt-tokyo',
    sourcePlatform: 'dashboard-recording',
    transcriptText:
      'Park Hyatt Tokyo, four nights on points (30k Hyatt/night — category 8 pricing after the March chart change). ' +
      'Booked a Park King and was upgraded at check-in to a Park Deluxe King on the 49th floor with a direct Fuji view ' +
      'from the bed. Globalist breakfast at Girandole is the full buffet plus a la carte — the Japanese set is the move. ' +
      'New York Bar on 52 still has the best skyline in the city; cover charge waived for hotel guests after 8pm. ' +
      'Watch out: the pool requires a reservation slot now, even for suite guests.',
    contributor: 'Daynis Olman',
    contributorUid: 'mock-admin-uid',
    topicTags: ['park-hyatt', 'tokyo', 'hyatt-points', 'globalist'],
    autoTags: { ...emptyAutoTags(), hotels: ['Park Hyatt'], destinations: ['Tokyo'], experienceTypes: ['Hotel Stay'] },
    attachedArticleIds: [],
    exportedToNotebookLM: true,
    exportedAt: Timestamp.fromMillis(NOW - 2 * DAY),
    duration: 0,
    transcriptionStatus: 'skipped',
    taggingStatus: 'completed',
    noteType: 'editorial',
    title: 'Park Hyatt Tokyo — Fuji view upgrade + booking notes',
    category: 'hotel',
    brand: 'EPM',
    aiConfidence: 'High',
    createdAt: Timestamp.fromMillis(NOW - 6 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 2 * DAY),
  },
  // 4 — Editorial note (typed): Tokyo fine dining (dining)
  {
    id: 'exp-tokyo-fine-dining',
    sourcePlatform: 'dashboard-recording',
    transcriptText:
      'Dining roundup from the Tokyo leg. Narisawa was the standout — the Satoyama tasting menu runs about 12 courses ' +
      'and the bread proofing at the table is theatre worth the price alone (¥55,000/head with the wine pairing). ' +
      'Den was harder to book but more fun; the Dentucky Fried Chicken gimmick actually lands. For a cheaper night, ' +
      'Afuri ramen at 2am after landing beats any konbini run. Note for the article: all three took Amex without issue, ' +
      'but Narisawa requires a card guarantee at booking — no-show fee is the full menu price.',
    contributor: 'Sarah Chen',
    contributorUid: 'mock-editor-uid',
    topicTags: ['tokyo', 'dining', 'fine-dining', 'narisawa', 'den'],
    autoTags: { ...emptyAutoTags(), destinations: ['Tokyo'], experienceTypes: ['Dining'] },
    attachedArticleIds: [],
    exportedToNotebookLM: false,
    duration: 0,
    transcriptionStatus: 'skipped',
    taggingStatus: 'completed',
    noteType: 'editorial',
    title: 'Tokyo fine dining — Narisawa vs Den',
    category: 'destination',
    brand: 'EPM',
    aiConfidence: 'High',
    createdAt: Timestamp.fromMillis(NOW - 8 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 8 * DAY),
  },
  // 5 — YouTube import: Qatar Qsuites review
  {
    id: 'exp-yt-qsuites-review',
    sourcePlatform: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=Qsuites123x',
    embedHtml: null,
    videoTitle: 'Qatar Airways Qsuites Review: Worth the Avios?',
    publishDate: Timestamp.fromMillis(NOW - 10 * DAY),
    transcriptText:
      'Today we are flying Qatar Airways Qsuites from Doha to London Heathrow in 7K... The double bed setup in the ' +
      'middle seats is the real deal — if you are travelling as a couple, rows 3 and 5 are the ones to grab. ' +
      'The dine-on-demand menu meant I ate the full mezze at 3am. Booked with 70,000 Avios plus $280 in fees.',
    confidence: 'high',
    contributor: 'Elite Points & Miles',
    contributorUid: 'mock-admin-uid',
    topicTags: ['qatar', 'qsuites', 'business-class', 'avios'],
    autoTags: { ...emptyAutoTags(), airlines: ['Qatar Airways'], destinations: ['London'], experienceTypes: ['Flight Review'] },
    attachedArticleIds: [],
    exportedToNotebookLM: false,
    transcriptionStatus: 'completed',
    taggingStatus: 'completed',
    noteType: 'editorial',
    title: 'Qatar Airways Qsuites Review: Worth the Avios?',
    category: 'flight',
    brand: 'EPM',
    accountHandle: '@ElitePointsMiles',
    sourceHandle: '@ElitePointsMiles',
    engagementMetrics: { views: 48200, likes: 3100, comments: 214 },
    thumbnailUrl: 'https://picsum.photos/seed/qsuites-review/640/360',
    thumbnailAspect: '16:9',
    caption: 'Qsuites Doha→London — the double bed setup is the real deal. Full review on the channel.',
    aiConfidence: 'High',
    createdAt: Timestamp.fromMillis(NOW - 10 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 10 * DAY),
  },
  // 6 — TikTok import: Changi lounge hack
  {
    id: 'exp-tt-changi-lounge-hack',
    sourcePlatform: 'tiktok',
    sourceUrl: 'https://www.tiktok.com/@elitepointsmiles/video/7255667788990111234',
    embedHtml: null,
    transcriptText:
      'This hack gets you into the best lounge at Changi without status. The Private Room is first-class only, ' +
      'but the SilverKris First lounge lets in any Solitaire PPS Club member... and here is the part nobody mentions: ' +
      'the a la carte dining room in the back serves the same lobster laksa as The Private Room.',
    confidence: 'medium',
    contributor: 'Elite Points & Miles',
    contributorUid: 'mock-admin-uid',
    topicTags: ['singapore', 'changi', 'lounge-hack', 'silverkris'],
    autoTags: { ...emptyAutoTags(), airlines: ['Singapore Airlines'], destinations: ['Singapore'], experienceTypes: ['Lounge Visit'] },
    attachedArticleIds: [],
    exportedToNotebookLM: false,
    transcriptionStatus: 'completed',
    taggingStatus: 'completed',
    noteType: 'personal',
    title: 'The Changi lounge hack nobody talks about',
    category: 'lounge',
    brand: 'EPM',
    accountHandle: '@elitepointsmiles',
    sourceHandle: '@elitepointsmiles',
    engagementMetrics: { views: 812000, likes: 96400, comments: 1203 },
    thumbnailUrl: 'https://picsum.photos/seed/changi-lounge/360/640',
    thumbnailAspect: '9:16',
    caption: 'POV: you know the back dining room at SilverKris First 🦞 #travelhacks #changi',
    aiConfidence: 'Medium',
    createdAt: Timestamp.fromMillis(NOW - 12 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 12 * DAY),
  },
  // 7 — Instagram import: Conrad Maldives
  {
    id: 'exp-ig-conrad-maldives',
    sourcePlatform: 'instagram',
    sourceUrl: 'https://www.instagram.com/reel/CxYzAbC123d/',
    embedHtml: null,
    transcriptText:
      'Overwater villa tour at the Conrad Maldives Rangali Island. This is a standard water villa booked for 95,000 ' +
      'Hilton points a night — the sunset villas run double that but honestly the view from the spa deck at 6pm is ' +
      'the same sunset for free. The seaplane transfer is $590 round trip and there is no way around it.',
    confidence: 'medium',
    contributor: 'Elite Points & Miles',
    contributorUid: 'mock-admin-uid',
    topicTags: ['maldives', 'conrad', 'hilton-points', 'overwater-villa'],
    autoTags: { ...emptyAutoTags(), hotels: ['Conrad'], destinations: ['Maldives'], experienceTypes: ['Hotel Stay'] },
    attachedArticleIds: [],
    exportedToNotebookLM: false,
    transcriptionStatus: 'completed',
    taggingStatus: 'completed',
    noteType: 'editorial',
    title: 'Conrad Maldives overwater villa tour',
    category: 'hotel',
    brand: 'EPM',
    accountHandle: '@elitepointsandmiles',
    sourceHandle: '@elitepointsandmiles',
    engagementMetrics: { views: 194000, likes: 22800, comments: 341 },
    thumbnailUrl: 'https://picsum.photos/seed/conrad-maldives/360/640',
    thumbnailAspect: '9:16',
    caption: '95k Hilton points a night for this 🌊 Worth it? Full breakdown in bio. #maldives #pointstravel',
    aiConfidence: 'Medium',
    createdAt: Timestamp.fromMillis(NOW - 15 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 15 * DAY),
  },
  // 8 — X/Twitter import: JAL award space alert thread
  {
    id: 'exp-x-jal-award-alert',
    sourcePlatform: 'x-twitter',
    sourceUrl: 'https://x.com/elitepointsmiles/status/1734567890123456789',
    embedHtml: null,
    transcriptText:
      'AWARD ALERT 🚨 JAL just dumped First Class space for spring 2027. Seeing 2+ seats HND-SFO/LAX/ORD on most ' +
      'Tuesdays and Wednesdays in March. 80k AA miles or 85k Alaska. Book it before it is gone — these never last 48 hours. ' +
      '(1/4) Thread on routing tricks below.',
    confidence: 'high',
    contributor: 'Elite Points & Miles',
    contributorUid: 'mock-admin-uid',
    topicTags: ['award-alert', 'jal', 'first-class', 'aa-miles'],
    autoTags: { ...emptyAutoTags(), airlines: ['Japan Airlines'], destinations: ['San Francisco'], experienceTypes: ['Award Booking'] },
    attachedArticleIds: [],
    exportedToNotebookLM: false,
    transcriptionStatus: 'completed',
    taggingStatus: 'completed',
    noteType: 'personal',
    title: 'JAL First award space alert — spring 2027',
    category: 'flight',
    brand: 'EPM',
    accountHandle: '@elitepointsmiles',
    sourceHandle: '@elitepointsmiles',
    engagementMetrics: { likes: 1840, retweets: 926, comments: 88 },
    threadCount: 4,
    caption: 'AWARD ALERT 🚨 JAL First spring 2027 — 2+ seats on the West Coast routes. (1/4)',
    aiConfidence: 'High',
    createdAt: Timestamp.fromMillis(NOW - 1 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 1 * DAY),
  },
  // 9 — Voice note: Chase Sapphire Reserve 2026 refresh (card)
  {
    id: 'exp-csr-2026-refresh',
    sourcePlatform: 'dashboard-recording',
    transcriptText:
      'Notes on the Chase Sapphire Reserve 2026 refresh for the benefits article. The $300 travel credit now posts ' +
      'automatically — no more waiting for the statement cycle. The 3x on dining is now 4x, but they quietly removed ' +
      'the DoorDash DashPass extension. Priority Pass is unchanged, still two guests. My take: the annual fee jump to ' +
      '$795 only makes sense if you use the new $500 hotel credit through the Chase portal — and portal pricing was ' +
      'about 8% higher than direct on the three bookings I checked.',
    confidence: 'high',
    contributor: 'Mike Ross',
    contributorUid: 'mock-writer-uid',
    topicTags: ['chase', 'sapphire-reserve', 'credit-cards', 'benefits-refresh'],
    autoTags: { ...emptyAutoTags(), experienceTypes: ['Card Review'], cardKeywords: ['Chase Sapphire Reserve'] },
    attachedArticleIds: ['article-csr-refresh'],
    exportedToNotebookLM: false,
    audioStoragePath: 'experience-notes/exp-csr-2026-refresh/seed-mock-writer-uid.webm',
    duration: 142,
    transcriptionStatus: 'completed',
    taggingStatus: 'completed',
    noteType: 'editorial',
    title: 'CSR 2026 refresh — what actually changed',
    category: 'card',
    brand: 'EPM',
    aiConfidence: 'High',
    createdAt: Timestamp.fromMillis(NOW - 3 * DAY),
    updatedAt: Timestamp.fromMillis(NOW - 3 * DAY),
  },
];

let articles: ArticleDoc[] = [
  {
    id: 'article-jal-review',
    title: 'JAL First Class Review: Tokyo Haneda to San Francisco',
    status: 'Writing',
    assignee: { name: 'Daynis Olman', avatar: 'DA' },
    targetKeyword: 'jal first class review',
    topicTags: ['jal', 'first-class', 'flight-review'],
    attachedExperienceIds: ['exp-jal-first-hnd-sfo'],
    createdAt: Timestamp.fromMillis(NOW - 5 * DAY),
  },
  {
    id: 'article-las-lounges',
    title: 'Best Airport Lounges in Las Vegas (2026 Guide)',
    status: 'Researching',
    assignee: { name: 'Sarah Chen', avatar: 'SC' },
    targetKeyword: 'las vegas airport lounges',
    topicTags: ['las-vegas', 'lounges', 'centurion-lounge'],
    attachedExperienceIds: [],
    createdAt: Timestamp.fromMillis(NOW - 3 * DAY),
  },
  {
    id: 'article-park-hyatt',
    title: 'Park Hyatt Tokyo: Booking with Points in 2026',
    status: 'Writing',
    assignee: { name: 'Daynis Olman', avatar: 'DA' },
    targetKeyword: 'park hyatt tokyo points',
    topicTags: ['park-hyatt', 'tokyo', 'hyatt-points'],
    attachedExperienceIds: [],
    createdAt: Timestamp.fromMillis(NOW - 7 * DAY),
  },
  {
    id: 'article-qsuites',
    title: 'Qatar Qsuites vs Emirates First Class: Which Wins?',
    status: 'Researching',
    assignee: { name: 'Mike Ross', avatar: 'MR' },
    targetKeyword: 'qatar qsuites',
    topicTags: ['qatar', 'qsuites', 'business-class'],
    attachedExperienceIds: [],
    createdAt: Timestamp.fromMillis(NOW - 2 * DAY),
  },
  {
    id: 'article-csr-refresh',
    title: 'Chase Sapphire Reserve 2026 Benefits Refresh: Full Breakdown',
    status: 'Writing',
    assignee: { name: 'Mike Ross', avatar: 'MR' },
    targetKeyword: 'chase sapphire reserve benefits',
    topicTags: ['chase', 'sapphire-reserve', 'credit-cards'],
    attachedExperienceIds: ['exp-csr-2026-refresh'],
    createdAt: Timestamp.fromMillis(NOW - 4 * DAY),
  },
  {
    id: 'article-maldives',
    title: 'Maldives on Points: Overwater Villa Guide',
    status: 'Researching',
    assignee: { name: 'Emma Wilson', avatar: 'EW' },
    targetKeyword: 'maldives on points',
    topicTags: ['maldives', 'conrad', 'overwater-villa'],
    attachedExperienceIds: [],
    createdAt: Timestamp.fromMillis(NOW - 1 * DAY),
  },
  {
    id: 'article-tokyo-dining',
    title: "Tokyo's Best Fine Dining for Points Travelers",
    status: 'Writing',
    assignee: { name: 'Sarah Chen', avatar: 'SC' },
    targetKeyword: 'tokyo fine dining',
    topicTags: ['tokyo', 'dining', 'fine-dining'],
    attachedExperienceIds: [],
    createdAt: Timestamp.fromMillis(NOW - 6 * DAY),
  },
];

// ─── In-memory pub/sub (mimics Firestore onSnapshot) ────────────────────────

type TranscriptListener = (docs: ExperienceDoc[]) => void;
type ArticleListener = (docs: ArticleDoc[]) => void;

const transcriptListeners = new Set<TranscriptListener>();
const articleListeners = new Set<ArticleListener>();

function sortedTranscripts(): ExperienceDoc[] {
  return [...transcripts].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

function emitTranscripts(): void {
  const snapshot = sortedTranscripts();
  for (const listener of [...transcriptListeners]) listener(snapshot);
}

function emitArticles(): void {
  const snapshot = [...articles].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  for (const listener of [...articleListeners]) listener(snapshot);
}

/**
 * Subscribe to the experience-transcripts store.
 * production: onSnapshot(query(collection(db, 'experience-transcripts'), orderBy('createdAt', 'desc')))
 * Emits the full set once (async, like a snapshot) and again after every mutation.
 */
export function subscribeToExperienceDocs(listener: TranscriptListener): () => void {
  transcriptListeners.add(listener);
  const timer = setTimeout(() => {
    if (transcriptListeners.has(listener)) listener(sortedTranscripts());
  }, 200);
  return () => {
    transcriptListeners.delete(listener);
    clearTimeout(timer);
  };
}

export interface ArticleSubscriptionOptions {
  /** production: where('status', 'in', statuses) */
  statusIn?: string[];
  /** production: limit(n) — applied after createdAt desc ordering */
  limit?: number;
}

/**
 * Subscribe to the articles store (picker + articles-needing tabs).
 * production: onSnapshot(query(collection(db, 'articles'), ...))
 */
export function subscribeToArticles(
  listener: ArticleListener,
  options: ArticleSubscriptionOptions = {}
): () => void {
  const filtered = (docs: ArticleDoc[]) => {
    let out = docs;
    if (options.statusIn) out = out.filter((d) => options.statusIn!.includes(d.status));
    out = [...out].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    if (options.limit) out = out.slice(0, options.limit);
    return out;
  };
  const wrapped: ArticleListener = (docs) => listener(filtered(docs));
  articleListeners.add(wrapped);
  const timer = setTimeout(() => {
    if (articleListeners.has(wrapped)) wrapped(articles);
  }, 200);
  return () => {
    articleListeners.delete(wrapped);
    clearTimeout(timer);
  };
}

// ─── Audio storage ───────────────────────────────────────────────────────────

/** Object URLs for blobs "uploaded" this session, keyed by storage path. */
const audioUrlByPath = new Map<string, string>();

/** Builds a tiny silent WAV as a data URI — seeded voice notes have no real
 * audio file in the mock, so playback falls back to this. */
function silentWavDataUri(seconds = 0.4): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * seconds);
  const dataSize = numSamples; // 8-bit mono PCM
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < dataSize; i++) view.setUint8(44 + i, 128); // 8-bit silence = 128
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/**
 * Upload experience audio blob.
 * production: uploadBytes(ref(storage, 'experience-notes/{id}/{ts}-{uid}.webm'), blob)
 * Mock: holds the blob in an object URL so playback works for this session.
 */
export async function uploadExperienceAudio(
  audioBlob: Blob,
  uid: string
): Promise<string> {
  await delay(350);
  const timestamp = Date.now();
  const experienceId = `exp-${timestamp}`;
  const storagePath = `experience-notes/${experienceId}/${timestamp}-${uid}.webm`;
  audioUrlByPath.set(storagePath, URL.createObjectURL(audioBlob));
  return storagePath;
}

/**
 * Get a playable URL for an experience audio file.
 * production: getDownloadURL(ref(storage, storagePath))
 */
export async function getExperienceAudioUrl(storagePath: string): Promise<string> {
  await delay(120);
  return audioUrlByPath.get(storagePath) ?? silentWavDataUri();
}

// ─── Cloud Function mocks ────────────────────────────────────────────────────

const PLATFORM_FROM_HOST: Array<[RegExp, string]> = [
  [/youtu\.?be/i, 'youtube'],
  [/tiktok\.com/i, 'tiktok'],
  [/instagram\.com/i, 'instagram'],
  [/(^|\.)(x|twitter)\.com/i, 'x-twitter'],
  [/linkedin\.com/i, 'linkedin'],
  [/facebook\.com|fb\.watch/i, 'facebook'],
  [/pinterest\./i, 'pinterest'],
];

function platformFromUrl(url: string): string {
  for (const [re, platform] of PLATFORM_FROM_HOST) {
    if (re.test(url)) return platform;
  }
  return 'youtube';
}

/**
 * Import a single social post by URL.
 * production: httpsCallable(functions, 'importSocialPost')
 */
export async function callImportSocialPost(input: {
  url: string;
  transcriptOverride?: string;
  title?: string;
  brand?: string;
  noteType?: 'personal' | 'editorial' | 'refresh';
}): Promise<{
  transcriptId: string;
  platform: string;
  alreadyExisted: boolean;
  transcriptLength: number;
  confidence: string;
  needsManualTranscript: boolean;
}> {
  await delay(700);
  const platform = platformFromUrl(input.url);
  const needsManualTranscript = !input.transcriptOverride && platform === 'pinterest';
  const transcriptText =
    input.transcriptOverride ||
    (needsManualTranscript
      ? ''
      : `Imported ${platform} post — auto-pulled caption and spoken-track transcript for ${input.url}. ` +
        'This mock text stands in for the Zernio pull so the library, filters, and attach flows behave like production.');
  const confidence = input.transcriptOverride ? 'high' : needsManualTranscript ? 'low' : 'medium';

  const existing = transcripts.find((t) => t.sourceUrl === input.url);
  if (existing) {
    existing.transcriptText = transcriptText;
    existing.confidence = confidence;
    existing.updatedAt = Timestamp.now();
    emitTranscripts();
    return {
      transcriptId: existing.id,
      platform,
      alreadyExisted: true,
      transcriptLength: transcriptText.length,
      confidence,
      needsManualTranscript,
    };
  }

  const id = mockId('exp-social');
  const slug = id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  transcripts.unshift({
    id,
    sourcePlatform: platform,
    sourceUrl: input.url,
    embedHtml: null,
    transcriptText,
    confidence,
    contributor: 'Elite Points & Miles',
    contributorUid: 'mock-admin-uid',
    topicTags: [],
    autoTags: emptyAutoTags(),
    attachedArticleIds: [],
    exportedToNotebookLM: false,
    transcriptionStatus: transcriptText ? 'completed' : 'pending',
    taggingStatus: 'pending',
    noteType: input.noteType ?? 'editorial',
    title: input.title || undefined,
    brand: input.brand ?? 'EPM',
    thumbnailUrl: `https://picsum.photos/seed/${slug}/360/640`,
    thumbnailAspect: platform === 'youtube' ? '16:9' : '9:16',
    engagementMetrics: { views: 12500, likes: 940, comments: 37 },
    aiConfidence: confidence.charAt(0).toUpperCase() + confidence.slice(1),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  emitTranscripts();
  return {
    transcriptId: id,
    platform,
    alreadyExisted: false,
    transcriptLength: transcriptText.length,
    confidence,
    needsManualTranscript,
  };
}

/**
 * Backfill a connected handle — refreshes and imports its recent posts.
 * production: httpsCallable(functions, 'backfillSocialHandle', { timeout: 540_000 })
 */
export async function callBackfillSocialHandle(input: {
  platform: 'youtube' | 'tiktok' | 'instagram' | 'x-twitter' | 'linkedin' | 'facebook' | 'pinterest';
  handle?: string;
  brand?: string;
}): Promise<{
  platform: string;
  imported: number;
  skipped: number;
  errors: string[];
  totalUrls: number;
}> {
  await delay(1500);
  const handle = input.handle ?? '@elitepointsmiles';
  const now = Timestamp.now();
  const mk = (n: number): ExperienceDoc => {
    const id = mockId(`exp-${input.platform}`);
    return {
      id,
      sourcePlatform: input.platform,
      sourceUrl: `https://example.com/${input.platform}/${handle.replace(/^@/, '')}/post-${id}`,
      embedHtml: null,
      transcriptText:
        `Backfilled ${input.platform} post #${n} from ${handle} — caption and transcript pulled via Zernio (mock). ` +
        'Travel-hacking content: award availability, lounge access tips, and points-earning strategy.',
      confidence: 'medium',
      contributor: 'Elite Points & Miles',
      contributorUid: 'mock-admin-uid',
      topicTags: [input.platform, 'backfill'],
      autoTags: emptyAutoTags(),
      attachedArticleIds: [],
      exportedToNotebookLM: false,
      transcriptionStatus: 'completed',
      taggingStatus: 'pending',
      noteType: 'editorial',
      title: `${handle} ${input.platform} post #${n}`,
      brand: input.brand ?? 'EPM',
      accountHandle: handle,
      sourceHandle: handle,
      thumbnailUrl: `https://picsum.photos/seed/${id}/360/640`,
      thumbnailAspect: input.platform === 'youtube' ? '16:9' : '9:16',
      engagementMetrics: { views: 5000 + n * 1200, likes: 300 + n * 45, comments: 12 + n * 3 },
      aiConfidence: 'Medium',
      createdAt: now,
      updatedAt: now,
    };
  };
  transcripts.unshift(mk(1), mk(2));
  emitTranscripts();
  return { platform: input.platform, imported: 2, skipped: 1, errors: [], totalUrls: 3 };
}

/**
 * Start a Zernio OAuth connect flow.
 * production: httpsCallable(functions, 'zernioConnectStart')
 * Mock: the "authUrl" is the app's own callback route, so the flow round-trips.
 */
export async function callZernioConnectStart(input: {
  platform: 'youtube' | 'tiktok' | 'instagram' | 'x-twitter' | 'twitter' | 'linkedin' | 'facebook' | 'pinterest';
}): Promise<{ authUrl: string }> {
  await delay(300);
  return { authUrl: `/zernio/callback?platform=${encodeURIComponent(input.platform)}` };
}

export interface ZernioConnectionSyncResult {
  accounts: Array<{
    platform: string;
    accountName: string | null;
    zernioAccountId: string;
    connected: boolean;
    needsReconnection: boolean;
    isNew: boolean;
  }>;
  added: number;
  updated: number;
  stale: number;
}

/**
 * Reconcile settings/socialAccounts with Zernio-connected accounts.
 * production: httpsCallable(functions, 'zernioConnectionSync')
 */
export async function callZernioConnectionSync(): Promise<ZernioConnectionSyncResult> {
  await delay(900);
  return {
    accounts: [
      {
        platform: 'instagram',
        accountName: '@elitepointsandmiles',
        zernioAccountId: 'zrn_mock_ig_001',
        connected: true,
        needsReconnection: false,
        isNew: true,
      },
      {
        platform: 'youtube',
        accountName: '@ElitePointsMiles',
        zernioAccountId: 'zrn_mock_yt_002',
        connected: true,
        needsReconnection: false,
        isNew: false,
      },
    ],
    added: 1,
    updated: 1,
    stale: 0,
  };
}

/**
 * Disconnect one account at Zernio.
 * production: httpsCallable(functions, 'zernioDisconnectAccount')
 */
export async function callZernioDisconnect(input: {
  zernioAccountId: string;
}): Promise<{ disconnected: boolean }> {
  await delay(400);
  void input;
  return { disconnected: true };
}

/**
 * Disconnect a creator handle and delete everything it imported.
 * production: httpsCallable(functions, 'removeSocialHandle', { timeout: 300_000 })
 */
export async function callRemoveSocialHandle(input: {
  platform: string;
  handle: string;
}): Promise<{ deletedCount: number; articlesUpdated: number; errors: string[] }> {
  await delay(1200);
  const normalized = input.handle.toLowerCase().replace(/^@/, '').replace(/\s+/g, '');
  const matches = (t: ExperienceDoc) => {
    const src = t.sourceHandle?.toLowerCase().replace(/^@/, '') === normalized;
    const acct = t.accountHandle?.toLowerCase().replace(/^@/, '') === normalized;
    return (src || acct) && t.sourcePlatform === (input.platform === 'twitter' ? 'x-twitter' : input.platform);
  };
  const doomed = transcripts.filter(matches);
  const affectedArticleIds = new Set(doomed.flatMap((t) => t.attachedArticleIds));
  transcripts = transcripts.filter((t) => !matches(t));
  articles = articles.map((a) =>
    affectedArticleIds.has(a.id)
      ? { ...a, attachedExperienceIds: (a.attachedExperienceIds ?? []).filter((id) => !doomed.some((d) => d.id === id)) }
      : a
  );
  emitTranscripts();
  emitArticles();
  return { deletedCount: doomed.length, articlesUpdated: affectedArticleIds.size, errors: [] };
}

/**
 * Save a new experience note (voice recording or typed text).
 * production: httpsCallable(functions, 'saveExperienceNote')
 */
export async function callSaveExperienceNote(
  input: SaveExperienceNoteInput
): Promise<SaveExperienceNoteOutput> {
  await delay(500);
  const id = mockId('exp-note');
  const now = Timestamp.now();
  const transcriptionStatus = input.mode === 'recorded' ? 'pending' : 'completed';
  transcripts.unshift({
    id,
    sourcePlatform: 'dashboard-recording',
    transcriptText: input.transcript,
    contributor: input.contributor,
    contributorUid: '',
    topicTags: input.topicTags ?? [],
    autoTags: emptyAutoTags(),
    attachedArticleIds: [],
    exportedToNotebookLM: false,
    audioStoragePath: input.audioStoragePath ?? undefined,
    duration: input.duration,
    transcriptionStatus,
    taggingStatus: 'pending',
    noteType: input.noteType,
    title: input.title || undefined,
    category: input.category,
    brand: 'EPM',
    createdAt: now,
    updatedAt: now,
  });
  emitTranscripts();
  return { transcriptId: id, transcriptionStatus };
}

/** Canned transcripts for the mock transcription pass, keyed loosely by category. */
const CANNED_TRANSCRIPTS: Record<string, string> = {
  flight:
    'Transcribed voice note (mock Deepgram pass): walking through the flight experience — cabin, seat, service flow, ' +
    'and whether the redemption was worth the points. Standout moments and issues are called out for the article draft.',
  hotel:
    'Transcribed voice note (mock Deepgram pass): covering the hotel stay — room category booked, upgrade outcome at ' +
    'check-in, elite benefits honoured, breakfast quality, and booking tips for readers.',
  lounge:
    'Transcribed voice note (mock Deepgram pass): lounge visit notes — how access was granted, food and drink selection, ' +
    'crowding by time of day, and the seats worth grabbing.',
  destination:
    'Transcribed voice note (mock Deepgram pass): destination notes — what stood out, what to skip, and the practical ' +
    'tips readers ask about most.',
  card:
    'Transcribed voice note (mock Deepgram pass): card benefits walkthrough — what changed, what is worth using, and ' +
    'the redemption strategy to feature in the piece.',
  general:
    'Transcribed voice note (mock Deepgram pass): experience capture for the library, ready for auto-tagging and ' +
    'attachment to the relevant article.',
};

/**
 * Transcribe a voice recording.
 * production: httpsCallable(functions, 'transcribeExperienceNote') (Deepgram Nova-2)
 * Mock: fills the doc with a canned transcript after a beat.
 */
export async function callTranscribeExperienceNote(
  input: { transcriptId: string; audioStoragePath: string }
): Promise<{ success: boolean; transcript?: string; duration?: number }> {
  await delay(1000);
  const doc = transcripts.find((t) => t.id === input.transcriptId);
  if (!doc) return { success: false };
  const transcript = CANNED_TRANSCRIPTS[doc.category ?? 'general'] ?? CANNED_TRANSCRIPTS.general;
  doc.transcriptText = transcript;
  doc.transcriptionStatus = 'completed';
  doc.updatedAt = Timestamp.now();
  emitTranscripts();
  return { success: true, transcript, duration: doc.duration };
}

/** Keyword dictionaries for the mock auto-tag pass — deterministic "AI". */
const AIRLINE_KEYWORDS = ['jal', 'japan airlines', 'ana', 'singapore airlines', 'qatar', 'emirates', 'cathay', 'delta', 'united', 'american airlines', 'british airways', 'lufthansa'];
const HOTEL_KEYWORDS = ['park hyatt', 'hyatt', 'marriott', 'hilton', 'conrad', 'ritz-carlton', 'st. regis', 'waldorf', 'ihg', 'four seasons'];
const DESTINATION_KEYWORDS = ['tokyo', 'san francisco', 'las vegas', 'london', 'singapore', 'maldives', 'doha', 'sydney', 'paris', 'new york'];
const CARD_KEYWORDS = ['chase sapphire reserve', 'amex platinum', 'amex gold', 'capital one venture x', 'csr'];
const EXPERIENCE_TYPE_KEYWORDS: Array<[string, string]> = [
  ['lounge', 'Lounge Visit'],
  ['flight', 'Flight Review'],
  ['suite', 'Flight Review'],
  ['villa', 'Hotel Stay'],
  ['hotel', 'Hotel Stay'],
  ['dining', 'Dining'],
  ['ramen', 'Dining'],
  ['award', 'Award Booking'],
];

/**
 * Auto-tag a transcript.
 * production: httpsCallable(functions, 'autoTagTranscript') (Claude)
 * Mock: deterministic keyword scan of the transcript text.
 */
export async function callAutoTagTranscript(
  transcriptId: string
): Promise<AutoTagTranscriptOutput> {
  await delay(800);
  const doc = transcripts.find((t) => t.id === transcriptId);
  if (!doc) return { success: false, error: 'Transcript not found' };
  const text = `${doc.title ?? ''} ${doc.transcriptText} ${(doc.topicTags ?? []).join(' ')}`.toLowerCase();
  const find = (keywords: string[]) => keywords.filter((k) => text.includes(k));
  const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  const autoTags: ExperienceAutoTags = {
    airlines: find(AIRLINE_KEYWORDS).map((k) => (k === 'jal' ? 'Japan Airlines' : cap(k))),
    hotels: find(HOTEL_KEYWORDS).map(cap),
    destinations: find(DESTINATION_KEYWORDS).map(cap),
    experienceTypes: EXPERIENCE_TYPE_KEYWORDS.filter(([k]) => text.includes(k)).map(([, label]) => label),
    cardKeywords: find(CARD_KEYWORDS).map((k) => (k === 'csr' ? 'Chase Sapphire Reserve' : cap(k))),
  };
  // De-duplicate within each dimension
  autoTags.airlines = [...new Set(autoTags.airlines)];
  autoTags.hotels = [...new Set(autoTags.hotels)];
  autoTags.destinations = [...new Set(autoTags.destinations)];
  autoTags.experienceTypes = [...new Set(autoTags.experienceTypes)];
  autoTags.cardKeywords = [...new Set(autoTags.cardKeywords)];
  doc.autoTags = autoTags;
  doc.taggingStatus = 'completed';
  doc.updatedAt = Timestamp.now();
  emitTranscripts();
  return { success: true, autoTags };
}

/**
 * Persist manual tag edits from the inline tag editor.
 * production: httpsCallable(functions, 'updateExperienceTags')
 */
export async function callUpdateExperienceTags(
  transcriptId: string,
  taxonomy: import('../types').ExperienceTaxonomy
): Promise<{ success: boolean }> {
  await delay(400);
  const doc = transcripts.find((t) => t.id === transcriptId);
  if (!doc) return { success: false };
  doc.autoTags = {
    ...doc.autoTags,
    airlines: taxonomy.airline ? [taxonomy.airline] : [],
    hotels: taxonomy.hotel ? [taxonomy.hotel] : [],
    destinations: taxonomy.destination ? [taxonomy.destination] : doc.autoTags.destinations,
    experienceTypes: taxonomy.experienceType ? [taxonomy.experienceType] : doc.autoTags.experienceTypes,
    cardKeywords: taxonomy.creditCard ? [taxonomy.creditCard] : doc.autoTags.cardKeywords,
  };
  doc.topicTags = taxonomy.tags;
  doc.updatedAt = Timestamp.now();
  emitTranscripts();
  return { success: true };
}

/**
 * Attach an experience item to an article.
 * production: httpsCallable(functions, 'attachExperienceToArticle')
 */
export async function callAttachToArticle(
  experienceId: string,
  articleId: string
): Promise<AttachExperienceOutput> {
  await delay(350);
  const doc = transcripts.find((t) => t.id === experienceId);
  const article = articles.find((a) => a.id === articleId);
  if (!doc || !article) throw new Error('Experience or article not found');
  if (!doc.attachedArticleIds.includes(articleId)) doc.attachedArticleIds.push(articleId);
  article.attachedExperienceIds = [...new Set([...(article.attachedExperienceIds ?? []), experienceId])];
  doc.updatedAt = Timestamp.now();
  emitTranscripts();
  emitArticles();
  return { success: true, refId: mockId('expref') };
}

/**
 * Detach an experience item from an article.
 * production: httpsCallable(functions, 'detachExperienceFromArticle')
 */
export async function callDetachFromArticle(
  experienceId: string,
  articleId: string
): Promise<DetachExperienceOutput> {
  await delay(350);
  const doc = transcripts.find((t) => t.id === experienceId);
  const article = articles.find((a) => a.id === articleId);
  if (doc) {
    doc.attachedArticleIds = doc.attachedArticleIds.filter((id) => id !== articleId);
    doc.updatedAt = Timestamp.now();
  }
  if (article) {
    article.attachedExperienceIds = (article.attachedExperienceIds ?? []).filter((id) => id !== experienceId);
  }
  emitTranscripts();
  emitArticles();
  return { success: true };
}

/**
 * Export transcripts to NotebookLM.
 * production: httpsCallable(functions, 'exportToNotebookLM')
 * Mock: builds the export file in-browser and returns an object URL for download.
 */
export async function callExportToNotebookLM(
  ids: string[],
  format: 'structured' | 'raw'
): Promise<ExportToNotebookLMOutput> {
  await delay(900);
  const targets = ids.length > 0
    ? transcripts.filter((t) => ids.includes(t.id))
    : transcripts.filter((t) => !t.exportedToNotebookLM);
  const body = targets
    .map((t) => {
      if (format === 'raw') return t.transcriptText;
      const tags = [
        ...t.autoTags.airlines,
        ...t.autoTags.hotels,
        ...t.autoTags.destinations,
        ...t.topicTags,
      ].join(', ');
      return `# ${t.title ?? 'Untitled experience'}\n\n- Source: ${t.sourcePlatform}\n- Contributor: ${t.contributor}\n- Tags: ${tags || 'none'}\n\n${t.transcriptText}`;
    })
    .join('\n\n---\n\n');
  const downloadUrl = URL.createObjectURL(new Blob([body], { type: 'text/markdown' }));
  const now = Timestamp.now();
  for (const t of targets) {
    t.exportedToNotebookLM = true;
    t.exportedAt = now;
    t.updatedAt = now;
  }
  emitTranscripts();
  return { success: true, exportedCount: targets.length, downloadUrl };
}

/**
 * Import YouTube transcripts from connected channels.
 * production: httpsCallable(functions, 'importYouTubeTranscripts')
 */
export async function callImportYouTube(): Promise<ImportResult> {
  await delay(600);
  return { success: true, importedCount: 0 };
}

/**
 * Import TikTok captions from connected accounts.
 * production: httpsCallable(functions, 'importTikTokTranscripts')
 */
export async function callImportTikTok(): Promise<ImportResult> {
  await delay(600);
  return { success: true, importedCount: 0 };
}

/**
 * Import Instagram Reels captions from connected accounts.
 * production: httpsCallable(functions, 'importInstagramTranscripts')
 */
export async function callImportInstagram(): Promise<ImportResult> {
  await delay(600);
  return { success: true, importedCount: 0 };
}
