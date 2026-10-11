/**
 * CategoryFilter Component
 *
 * Dropdown filter for asset categories.
 * Shows all available categories with count (if provided).
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AssetCategory } from '../types';

export interface CategoryFilterProps {
  value: AssetCategory | 'all';
  onChange: (category: AssetCategory | 'all') => void;
  categories?: AssetCategory[];
}

const DEFAULT_CATEGORIES: AssetCategory[] = [
  'Photo',
  'Screenshot',
  'Infographic',
  'Card Art',
  'Issuer Logo',
  'Airline Logo',
  'Hotel Logo',
  'Alliance Logo',
  'Program Logo',
  'Team Photo',
];

export function CategoryFilter({
  value,
  onChange,
  categories = DEFAULT_CATEGORIES,
}: CategoryFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AssetCategory | 'all')}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All Categories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
