import { useState } from 'react';
import { GripVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { IframeTableRow } from '../types';
import { reorderCards, type IframeTypeInfo } from '../utils/iframeTypes';

interface TableConfiguratorProps {
  typeInfo: IframeTypeInfo;
  rows: IframeTableRow[];
  onChange: (rows: IframeTableRow[]) => void;
}

const EMPTY_ROW: IframeTableRow = { label: '', value: '' };

/**
 * Table iFrame configuration: custom label/value rows (the blog "Table"
 * element — e.g. Airline / Route / Seat class / Travel time). Drag to
 * reorder; add as many rows as needed up to the type's max.
 */
export function TableConfigurator({ typeInfo, rows, onChange }: TableConfiguratorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const updateRow = (index: number, patch: Partial<IframeTableRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    if (rows.length < typeInfo.maxRows) onChange([...rows, { ...EMPTY_ROW }]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) onChange(rows.filter((_, i) => i !== index));
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null) return;
    onChange(reorderCards(rows, dragIndex, index));
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverIndex(index);
          }}
          onDragLeave={() => setDragOverIndex((i) => (i === index ? null : i))}
          onDrop={() => handleDrop(index)}
          onDragEnd={() => {
            setDragIndex(null);
            setDragOverIndex(null);
          }}
          className={`flex items-center gap-2 rounded-lg border p-2 bg-background transition-colors ${
            dragOverIndex === index && dragIndex !== null && dragOverIndex !== dragIndex
              ? 'border-primary'
              : 'border-border'
          } ${dragIndex === index ? 'opacity-50' : ''}`}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
          <Input
            value={row.label}
            onChange={(e) => updateRow(index, { label: e.target.value })}
            placeholder="Label (e.g. Airline)"
            maxLength={120}
            className="text-sm w-[34%] shrink-0"
          />
          <Input
            value={row.value}
            onChange={(e) => updateRow(index, { value: e.target.value })}
            placeholder="Value (e.g. Virgin Atlantic)"
            maxLength={300}
            className="text-sm flex-1 min-w-0"
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-muted/60 shrink-0"
              title="Remove this row"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      ))}

      {rows.length < typeInfo.maxRows && (
        <Button type="button" variant="outline" className="w-full border-dashed" onClick={addRow}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add row ({rows.length} of {typeInfo.maxRows})
        </Button>
      )}
    </div>
  );
}
