import { useState, useEffect, useMemo } from 'react';
import { transferPartnerService } from '../services/transferPartnerService';
import type { TransferPartnerDocument, TransferPartnerFilters, AllianceGroup, CardProgram, ProgramEntry } from '../types';

interface ActiveBonusEntry {
  partner: TransferPartnerDocument;
  program: CardProgram;
  entry: ProgramEntry;
}

interface UseTransferPartnersResult {
  partners: TransferPartnerDocument[];
  loading: boolean;
  error: Error | null;
  groupedPartners: Record<AllianceGroup, TransferPartnerDocument[]>;
  activeBonus: ActiveBonusEntry[];
  /** Total partners before filtering — used for empty-state vs no-match distinction */
  allCount: number;
}

export function useTransferPartners(filters: TransferPartnerFilters): UseTransferPartnersResult {
  const [allPartners, setAllPartners] = useState<TransferPartnerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = transferPartnerService.subscribeToPartners(
      (partners) => {
        setAllPartners(partners);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const partners = useMemo(() => {
    let result = allPartners;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.loyaltyProgram.toLowerCase().includes(search)
      );
    }

    if (filters.type !== 'all') {
      result = result.filter((p) => p.type === filters.type);
    }

    if (filters.alliance !== 'all') {
      result = result.filter((p) => p.alliance === filters.alliance);
    }

    if (filters.speed !== 'all') {
      result = result.filter((p) =>
        Object.values(p.programs ?? {}).some((entry) => entry?.speed === filters.speed)
      );
    }

    if (filters.bonusesOnly) {
      const now = Date.now();
      result = result.filter((p) =>
        Object.values(p.programs ?? {}).some(
          (entry) =>
            entry?.bonusPercent !== null &&
            entry?.bonusEndDate &&
            (entry.bonusEndDate.toMillis ? entry.bonusEndDate.toMillis() : 0) > now
        )
      );
    }

    return result;
  }, [allPartners, filters]);

  const groupedPartners = useMemo(() => {
    const groups: Partial<Record<AllianceGroup, TransferPartnerDocument[]>> = {};
    for (const partner of partners) {
      if (!groups[partner.alliance]) groups[partner.alliance] = [];
      groups[partner.alliance]!.push(partner);
    }
    return groups as Record<AllianceGroup, TransferPartnerDocument[]>;
  }, [partners]);

  const activeBonus = useMemo(() => {
    const now = Date.now();
    const result: ActiveBonusEntry[] = [];
    for (const partner of allPartners) {
      for (const [program, entry] of Object.entries(partner.programs ?? {})) {
        if (
          entry &&
          entry.bonusPercent !== null &&
          entry.bonusEndDate &&
          (entry.bonusEndDate.toMillis ? entry.bonusEndDate.toMillis() : 0) > now
        ) {
          result.push({ partner, program: program as CardProgram, entry });
        }
      }
    }
    return result;
  }, [allPartners]);

  return { partners, loading, error, groupedPartners, activeBonus, allCount: allPartners.length };
}
