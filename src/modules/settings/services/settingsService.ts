// MOCK-ONLY — in-memory stand-ins for the settings Cloud Functions.
// Same exported names/signatures as production; production callable names are
// noted in comments above each mock.

import { delay } from '@/services/_delay';
import type { SettingId, ConnectionResult } from '../types';
import { setSettingsDoc, setSecretValue, appendAuditEntry } from './settingsStore';

// ─── Settings CRUD ───────────────────────────────────────────────────────────

// production: httpsCallable(functions, 'settingsUpdate')
export async function saveSettings(settingId: SettingId, data: Record<string, unknown>) {
  await delay(350);
  const changedFields = setSettingsDoc(settingId, data);
  appendAuditEntry({
    userId: 'u_daynis',
    userEmail: 'daynis@elitetravelhackers.com',
    userName: 'Daynis Olman',
    actionType: 'settings.update',
    targetEntity: `settings/${settingId}`,
    settingArea: settingId,
    details: { summary: `Updated ${changedFields.length} field(s)` },
    changedFields,
  });
  return { success: true, settingId, changedFields };
}

// ─── Credential Rotation ─────────────────────────────────────────────────────

export interface RotateSecretResult {
  success: boolean;
  secretName: string;
  versionName: string | null;
  appliedImmediately: boolean;
}

// Secrets that apply at runtime without a function redeploy (mirrors the
// server allowlist behaviour in functions/src/settings/rotateSecret.ts).
const IMMEDIATE_SECRETS = new Set([
  'OPENAI_API_KEY',
  'ZERNIO_API_KEY',
  'GOOGLE_DRIVE_OAUTH_CLIENT_ID',
  'GOOGLE_DRIVE_OAUTH_CLIENT_SECRET',
  'TINYFISH_API_KEY',
]);

// production: httpsCallable(functions, 'settingsRotateSecret')
export async function rotateSecret(secretName: string, value: string): Promise<RotateSecretResult> {
  await delay(600);
  if (!value || value.length < 8) {
    throw new Error('Secret value must be at least 8 characters');
  }
  const versionName = setSecretValue(secretName, value);
  const appliedImmediately = IMMEDIATE_SECRETS.has(secretName);
  appendAuditEntry({
    userId: 'u_daynis',
    userEmail: 'daynis@elitetravelhackers.com',
    userName: 'Daynis Olman',
    actionType: 'secret.rotate',
    targetEntity: `secrets/${secretName}`,
    settingArea: 'credentials',
    details: { secretName, appliedImmediately },
    changedFields: [],
  });
  return { success: true, secretName, versionName, appliedImmediately };
}

// ─── Connection Tests ────────────────────────────────────────────────────────

// production: httpsCallable(functions, 'settingsTestWebflow')
export async function testWebflowConnection(): Promise<ConnectionResult> {
  await delay(900);
  return {
    status: 'connected',
    message: 'Connected to Webflow — site "Elite Points & Miles" (CMS plan).',
    details: { siteName: 'Elite Points & Miles', planTier: 'CMS', rateLimit: '60 req/min' },
  };
}

// production: httpsCallable(functions, 'settingsTestBeehiiv')
export async function testBeehiivConnection(): Promise<ConnectionResult> {
  await delay(800);
  return {
    status: 'connected',
    message: 'Connected to Beehiiv — publication pub_4f2a…5e6f (Scale plan, 18,432 subscribers).',
    details: { publicationId: 'pub_4f2a9c1e-77d3-4e1a-9b2c-1a2b3c4d5e6f', planTier: 'Scale', subscriberCount: 18432 },
  };
}

// production: httpsCallable(functions, 'settingsTestDataForSeo')
export async function testDataForSeoConnection(): Promise<ConnectionResult> {
  await delay(750);
  return {
    status: 'connected',
    message: 'DataForSEO credentials valid — account balance $212.44.',
    details: { accountBalance: 212.44, planBadge: 'Standard' },
  };
}

// production: httpsCallable(functions, 'settingsTestSlack')
export async function testSlackWebhook(channel?: string): Promise<ConnectionResult> {
  await delay(700);
  return {
    status: 'connected',
    message: `Test message delivered to ${channel ?? '#ops-alerts'} in workspace "Elite Travel Hackers".`,
    details: { workspaceName: 'Elite Travel Hackers', channel: channel ?? '#ops-alerts' },
  };
}

// ─── Brand Voice Test ────────────────────────────────────────────────────────

// production: httpsCallable(functions, 'settingsTestBrandVoice')
export async function testBrandVoiceSample(input: {
  topic: string;
  articleType?: string;
  contentType?: 'article' | 'newsletter';
}): Promise<{ success: boolean; sample: string; usedCustomVoice: boolean }> {
  await delay(1200);
  const isNewsletter = input.contentType === 'newsletter';
  const sample = isNewsletter
    ? `This week's ${input.topic} is worth your attention for one reason: the maths finally works. At 1.8c per point, the redemption clears our buy threshold — and if you were already planning the trip, this is the fare to build it around. No hype, just the number.`
    : `The ${input.topic} looks ordinary until you run the numbers. At 1.8c per point, the redemption clears our buy threshold by a wide margin — and the annual fee pays for itself the first time you use the lounge passes. Here's the full breakdown.`;
  return { success: true, sample, usedCustomVoice: true };
}

// ─── API Usage ───────────────────────────────────────────────────────────────

// production: httpsCallable(functions, 'settingsGetApiUsageStats')
export async function getApiUsageStats() {
  await delay(500);
  const day = 864e5;
  const daily = (avg: number, seed: number) =>
    Array.from({ length: 14 }, (_, d) => ({
      date: new Date(Date.now() - (13 - d) * day).toISOString().slice(0, 10),
      cost: Math.round(avg * (0.72 + (((d * 7 + seed) % 11) / 18)) * 100) / 100,
    }));
  return {
    monthlyBudget: 800,
    currentSpend: 482.17,
    projectedSpend: 731.5,
    daysRemaining: 19,
    services: [
      { name: 'Claude (Anthropic)', thisMonth: 214.6, lastMonth: 248.9, changePercent: -13.8, dailyAvg: 17.88, usageMetric: '14.2M tokens', budget: 350, dailyCosts: daily(17.88, 3) },
      { name: 'DataForSEO', thisMonth: 206.4, lastMonth: 188.2, changePercent: 9.7, dailyAvg: 17.2, usageMetric: '27.5k requests', budget: 260, dailyCosts: daily(17.2, 5) },
      { name: 'OpenAI (images)', thisMonth: 47.3, lastMonth: 52.1, changePercent: -9.2, dailyAvg: 3.94, usageMetric: '412 images', budget: 120, dailyCosts: daily(3.94, 1) },
      { name: 'Perplexity', thisMonth: 9.2, lastMonth: 11.4, changePercent: -19.3, dailyAvg: 0.77, usageMetric: '1,240 requests', budget: 40, dailyCosts: daily(0.77, 7) },
      { name: 'Deepgram', thisMonth: 4.67, lastMonth: 6.02, changePercent: -22.4, dailyAvg: 0.39, usageMetric: '9.6 hrs audio', budget: 30, dailyCosts: daily(0.39, 9) },
    ],
  };
}
