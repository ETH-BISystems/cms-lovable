/**
 * TaxonomyPicker Component
 *
 * Multi-select pickers for taxonomy fields:
 * - Airlines, hotels, cabin class, experience types, lounges
 * - Destinations (city/country pairs), credit cards, aircraft types
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { AssetTaxonomy } from '../types';

export interface TaxonomyPickerProps {
  taxonomy: AssetTaxonomy;
  onChange: (taxonomy: AssetTaxonomy) => void;
  disabled?: boolean;
}

export function TaxonomyPicker({
  taxonomy,
  onChange,
  disabled = false,
}: TaxonomyPickerProps) {
  const addItem = (field: keyof AssetTaxonomy, value: string) => {
    if (Array.isArray(taxonomy[field])) {
      const current = taxonomy[field] as string[];
      if (!current.includes(value)) {
        onChange({
          ...taxonomy,
          [field]: [...current, value],
        });
      }
    }
  };

  const removeItem = (field: keyof AssetTaxonomy, value: string) => {
    if (Array.isArray(taxonomy[field])) {
      const current = taxonomy[field] as string[];
      onChange({
        ...taxonomy,
        [field]: current.filter((item) => item !== value),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Airlines */}
      <div className="space-y-2">
        <Label>Airlines</Label>
        <Input
          type="text"
          placeholder="Add airline..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              e.preventDefault();
              addItem('airlines', e.currentTarget.value.trim());
              e.currentTarget.value = '';
            }
          }}
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-2">
          {taxonomy.airlines.map((airline) => (
            <Badge key={airline} variant="secondary" className="gap-1">
              {airline}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem('airlines', airline)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* Hotels */}
      <div className="space-y-2">
        <Label>Hotels</Label>
        <Input
          type="text"
          placeholder="Add hotel..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              e.preventDefault();
              addItem('hotels', e.currentTarget.value.trim());
              e.currentTarget.value = '';
            }
          }}
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-2">
          {taxonomy.hotels.map((hotel) => (
            <Badge key={hotel} variant="secondary" className="gap-1">
              {hotel}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem('hotels', hotel)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* Cabin Class */}
      <div className="space-y-2">
        <Label>Cabin Class</Label>
        <Select
          value={taxonomy.cabinClass || 'none'}
          onValueChange={(value) =>
            onChange({
              ...taxonomy,
              cabinClass: value === 'none' ? null : value,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select cabin class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="Economy">Economy</SelectItem>
            <SelectItem value="Premium Economy">Premium Economy</SelectItem>
            <SelectItem value="Business">Business</SelectItem>
            <SelectItem value="First Class">First Class</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Credit Cards */}
      <div className="space-y-2">
        <Label>Credit Cards</Label>
        <Input
          type="text"
          placeholder="Add credit card..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              e.preventDefault();
              addItem('creditCards', e.currentTarget.value.trim());
              e.currentTarget.value = '';
            }
          }}
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-2">
          {taxonomy.creditCards.map((card) => (
            <Badge key={card} variant="secondary" className="gap-1">
              {card}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem('creditCards', card)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
