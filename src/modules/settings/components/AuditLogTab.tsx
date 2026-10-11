import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Filter, ChevronDown, Loader2 } from 'lucide-react';
import { useAuditLog } from '../hooks/useAuditLog';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { AuditLogFilters } from '../types';

export function AuditLogTab() {
  const { isAdmin } = useSettingsPermissions();
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters: AuditLogFilters = useMemo(() => ({
    userId: userFilter || undefined,
    actionType: actionFilter || undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  }), [userFilter, actionFilter, dateFrom, dateTo]);

  const { entries, loading, hasMore, loadMore } = useAuditLog(filters);

  if (!isAdmin) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <p className="text-[13px] text-muted-foreground">Audit log is only accessible to administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[14px] font-semibold text-card-foreground">Filters</h3>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">User ID</label>
              <Input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="text-[12px] h-8"
                placeholder="Filter by user..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="text-[12px] h-8 rounded-md border border-input bg-background px-3 w-full"
              >
                <option value="">All Actions</option>
                <option value="settings_update">Settings Update</option>
                <option value="user_created">User Created</option>
                <option value="user_role_changed">Role Changed</option>
                <option value="user_disabled">User Disabled</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-[12px] h-8"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-[12px] h-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Audit Log</h3>
          <Badge variant="outline" className="text-[10px]">{entries.length} entries</Badge>
        </div>
        <div className="px-5 py-4">
          {loading && entries.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-8">No audit log entries found matching your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Timestamp</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">User</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Action</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Target</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-2 text-muted-foreground text-[11px] whitespace-nowrap">
                        {entry.timestamp ? new Date(entry.timestamp as unknown as string).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 px-2">
                        <div>
                          <p className="font-medium text-[11px]">{entry.userName || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.userEmail}</p>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-[10px]">{entry.actionType}</Badge>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground text-[11px]">{entry.targetEntity}</td>
                      <td className="py-2 px-2">
                        {entry.changedFields && entry.changedFields.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.changedFields.slice(0, 3).map(field => (
                              <Badge key={field} variant="secondary" className="text-[9px]">{field}</Badge>
                            ))}
                            {entry.changedFields.length > 3 && (
                              <Badge variant="secondary" className="text-[9px]">+{entry.changedFields.length - 3}</Badge>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More */}
          {hasMore && entries.length > 0 && (
            <div className="text-center pt-4">
              <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={loadMore} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
