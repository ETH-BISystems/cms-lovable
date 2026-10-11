import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCardsContext } from '../context/CardsContext';
import { useCards } from '../hooks/useCards';
import { useCardCategories } from '../hooks/useCardCategories';

const ISSUERS = [
  'American Express', 'Bank of America', 'Barclays', 'Capital One', 'Chase',
  'Citi', 'Discover', 'US Bank', 'Wells Fargo',
];

const STATUSES = ['current', 'changed', 'outdated', 'new'];

export function CardFilters() {
  const { filters, setFilters, resetFilters } = useCardsContext();
  const { loading } = useCards();
  const { categories: CATEGORIES } = useCardCategories();

  const hasActiveFilters =
    filters.issuer !== '' || filters.category !== '' || filters.status !== '' || filters.search !== '';

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Text search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search cards..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="pl-9 h-9 text-[13px]"
          disabled={loading}
        />
      </div>

      {/* Issuer filter */}
      <Select
        value={filters.issuer || 'all'}
        onValueChange={(v) => setFilters({ issuer: v === 'all' ? '' : v })}
        disabled={loading}
      >
        <SelectTrigger className="w-[160px] h-9 text-[13px]">
          <SelectValue placeholder="All Issuers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Issuers</SelectItem>
          {ISSUERS.map((issuer) => (
            <SelectItem key={issuer} value={issuer}>
              {issuer}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category filter */}
      <Select
        value={filters.category || 'all'}
        onValueChange={(v) => setFilters({ category: v === 'all' ? '' : (v as typeof filters.category) })}
        disabled={loading}
      >
        <SelectTrigger className="w-[150px] h-9 text-[13px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(v) => setFilters({ status: v === 'all' ? '' : (v as typeof filters.status) })}
        disabled={loading}
      >
        <SelectTrigger className="w-[140px] h-9 text-[13px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} disabled={loading} className="text-[13px] text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
