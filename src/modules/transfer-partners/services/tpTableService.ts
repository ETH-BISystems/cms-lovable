// MOCK Transfer Partner Tables service — in-memory replacement for the
// production service (settings/tpTableBranding Firestore read +
// tpTableSettingsUpdate callable). Instance create/update/delete/embed stay
// in the iframes module's service, same as production.

import { delay } from '@/services/_delay';

/** Branding used by the public TP-table renderer (logos/icons by URL). */
export interface TpTableBranding {
  programLogos: Record<string, string>;
  allianceIcons: Record<string, string>;
}

// ─── Seed: settings/tpTableBranding ──────────────────────────────────────────
// Program logos render at 168×40 in the table's white logo row; alliance /
// hotel-brand icons at 20×20 next to each partner name. Blank = text fallback.

const branding: TpTableBranding = {
  programLogos: {
    'chase-ur': 'https://picsum.photos/seed/tp-logo-chase-ur/168/40',
    'amex-mr': 'https://picsum.photos/seed/tp-logo-amex-mr/168/40',
    'capital-one': 'https://picsum.photos/seed/tp-logo-capital-one/168/40',
    bilt: 'https://picsum.photos/seed/tp-logo-bilt/168/40',
  },
  allianceIcons: {
    'Star Alliance': 'https://picsum.photos/seed/tp-icon-star-alliance/64/64',
    SkyTeam: 'https://picsum.photos/seed/tp-icon-skyteam/64/64',
    Oneworld: 'https://picsum.photos/seed/tp-icon-oneworld/64/64',
    Hyatt: 'https://picsum.photos/seed/tp-logo-hyatt/64/64',
    Marriott: 'https://picsum.photos/seed/tp-logo-marriott/64/64',
    Hilton: 'https://picsum.photos/seed/tp-logo-hilton/64/64',
  },
};

export const tpTableService = {
  /** production: getDoc(doc(db, 'settings', 'tpTableBranding')) */
  async getBranding(): Promise<TpTableBranding> {
    await delay(250);
    return {
      programLogos: { ...branding.programLogos },
      allianceIcons: { ...branding.allianceIcons },
    };
  },

  /** production: httpsCallable(functions, 'tpTableSettingsUpdate') */
  async updateBranding(input: TpTableBranding): Promise<{ success: boolean }> {
    await delay(400);
    branding.programLogos = { ...input.programLogos };
    branding.allianceIcons = { ...input.allianceIcons };
    return { success: true };
  },
};
