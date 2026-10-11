import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useCardCategories } from '../hooks/useCardCategories';

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  /** Hide the "+ add" affordance (e.g. in filter contexts) */
  allowAdd?: boolean;
  className?: string;
}

/**
 * Card category dropdown backed by settings/cardCategories, with an inline
 * "add new category" affordance (the + button). New categories become
 * available in every category dropdown across the Card Data Manager.
 */
export function CategorySelect({ value, onChange, allowAdd = true, className }: CategorySelectProps) {
  const { categories, addCategory } = useCardCategories();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // Keep the current value selectable even if it's not in the managed list
  const options = value && !categories.includes(value) ? [...categories, value] : categories;

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await addCategory(name);
      onChange(name);
      toast.success(`Category "${name}" added`);
      setNewName('');
      setAdding(false);
    } catch (err) {
      toast.error(`Failed to add category: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  if (adding) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
          placeholder="New category name"
          className="h-8 text-sm flex-1"
          autoFocus
          disabled={saving}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newName.trim()}
          className="p-1.5 rounded-md bg-teal-600 text-white disabled:opacity-50 shrink-0"
          title="Add category"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setAdding(false)} className="p-1.5 rounded-md hover:bg-muted shrink-0" title="Cancel">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        className={className ?? 'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {allowAdd && (
        <button
          onClick={() => setAdding(true)}
          className="p-1.5 rounded-md border border-input hover:bg-muted shrink-0"
          title="Add a new category"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
