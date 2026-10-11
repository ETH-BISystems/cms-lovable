import { useCallback } from 'react';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { EDITOR_WRITABLE_SETTINGS } from '../types';
import type { SettingId } from '../types';

export function useSettingsPermissions() {
  const { role } = useAuth();

  const isAdmin = role === Role.Admin;
  const isEditor = role === Role.Editor;

  const canWrite = useCallback(
    (settingId: SettingId): boolean => {
      if (isAdmin) return true;
      if (isEditor) return EDITOR_WRITABLE_SETTINGS.includes(settingId);
      return false;
    },
    [isAdmin, isEditor]
  );

  return { canWrite, isAdmin, isEditor };
}
