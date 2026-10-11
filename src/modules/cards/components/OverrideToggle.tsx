import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Edit2, Lock } from 'lucide-react';
import { useCardActions } from '../hooks/useCardActions';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types';
import { toast } from 'sonner';
import type { OverrideMetadata } from '../types';

interface OverrideToggleProps {
  cardId: string;
  field: 'annualFee' | 'signupBonus' | 'bonusSpendReq' | 'aprRange';
  scrapedValue: string | number | string[];
  manualValue?: string | number | string[];
  overrideMetadata?: OverrideMetadata;
  multiline?: boolean;
}

function valueToString(v: string | number | string[] | undefined): string {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.join('\n');
  return String(v);
}

export function OverrideToggle({
  cardId,
  field,
  scrapedValue,
  manualValue,
  overrideMetadata,
  multiline = false,
}: OverrideToggleProps) {
  const { setOverride, isLoading } = useCardActions();
  const { role, user } = useAuth();
  const isReadOnly = role === Role.Writer || role === Role.Viewer;
  const isOverriding = overrideMetadata?.isOverridden ?? false;

  const displayValue = isOverriding ? valueToString(manualValue) : valueToString(scrapedValue);
  const [editValue, setEditValue] = useState(displayValue);
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleOn = () => {
    setEditValue(displayValue);
    setIsEditing(true);
  };

  const handleToggleOff = async () => {
    setIsEditing(false);
    try {
      await setOverride({ cardId, field, value: null, isOverriding: false });
      toast.success('Override cleared — reverted to scraped value');
    } catch {
      toast.error('Failed to clear override');
    }
  };

  const handleSave = async () => {
    try {
      const value = multiline
        ? editValue.split('\n').filter((l) => l.trim())
        : editValue;
      await setOverride({ cardId, field, value, isOverriding: true });
      setIsEditing(false);
      toast.success('Override saved');
    } catch {
      toast.error('Failed to save override');
    }
  };

  if (isReadOnly) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{displayValue || '—'}</span>
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    );
  }

  if (isEditing || isOverriding) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-md p-2 space-y-2">
        {multiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={isLoading || !isEditing}
            rows={3}
            className="text-sm"
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={isLoading || !isEditing}
            className="text-sm"
          />
        )}
        {isEditing && (
          <p className="text-xs text-amber-700">Override by {user?.displayName ?? 'you'}</p>
        )}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Override'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleToggleOn} disabled={isLoading}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                Edit Override
              </Button>
              <Button size="sm" variant="ghost" onClick={handleToggleOff} disabled={isLoading}>
                Revert to Scraped
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{displayValue || '—'}</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-xs"
        onClick={handleToggleOn}
        disabled={isLoading}
      >
        <Edit2 className="h-3 w-3 mr-1" />
        Override
      </Button>
    </div>
  );
}
