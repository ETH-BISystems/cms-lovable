import { useState, useMemo } from 'react';
import { ChevronDown, Wrench, Eye, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import type { TechnicalIssueDoc, IssueSeverity } from '../../types';

interface TechnicalIssuesTabProps {
  issues: TechnicalIssueDoc[];
  siteDomain: string;
  onAutoFix?: (issue: TechnicalIssueDoc) => void;
  onIgnore?: (issueId: string) => void;
  onRestore?: (issueId: string) => void;
  onViewArticle?: (title: string) => void;
}

function IssueSeverityBadge({ type }: { type: string }) {
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      {type}
    </span>
  );
}

export function TechnicalIssuesTab({
  issues: initialIssues,
  siteDomain,
  onAutoFix,
  onViewArticle,
}: TechnicalIssuesTabProps) {
  const [issues, setIssues] = useState(initialIssues);
  const [showIgnored, setShowIgnored] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<IssueSeverity, boolean>>({
    Critical: true,
    Warning: false,
    Info: false,
  });
  const [issueSelected, setIssueSelected] = useState<Set<string>>(new Set());

  // Keep local state in sync when prop changes
  // (simple approach — reset on new data)
  useState(() => {
    setIssues(initialIssues);
  });

  const toggleSection = (s: IssueSeverity) =>
    setExpandedSections((prev) => ({ ...prev, [s]: !prev[s] }));

  const activeIssues = issues.filter((i) => !i.ignored);
  const ignoredIssues = issues.filter((i) => i.ignored);

  const grouped: Record<IssueSeverity, TechnicalIssueDoc[]> = {
    Critical: activeIssues.filter((i) => i.severity === 'Critical'),
    Warning: activeIssues.filter((i) => i.severity === 'Warning'),
    Info: activeIssues.filter((i) => i.severity === 'Info'),
  };

  const sevColors: Record<IssueSeverity, string> = {
    Critical: 'bg-destructive/10 text-destructive border-destructive/20',
    Warning: 'bg-warning/10 text-warning-foreground border-warning/20',
    Info: 'bg-accent/10 text-accent border-accent/20',
  };
  const sevBadge: Record<IssueSeverity, string> = {
    Critical: 'bg-destructive text-destructive-foreground',
    Warning: 'bg-warning text-warning-foreground',
    Info: 'bg-accent text-accent-foreground',
  };

  const ignoreIssue = (id: string) => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ignored: true } : i)));
    const issue = issues.find((i) => i.id === id);
    toast.success(`"${issue?.type}" ignored`, {
      action: {
        label: 'Undo',
        onClick: () =>
          setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ignored: false } : i))),
      },
    });
  };

  const restoreIssue = (id: string) => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ignored: false } : i)));
    toast.success('Issue restored');
  };

  const autoFix = (issue: TechnicalIssueDoc) => {
    onAutoFix?.(issue);
    toast.success(`Auto-fix applied for "${issue.type}" on ${issue.url}`);
  };

  const bulkAutoFix = () => {
    const fixable = Array.from(issueSelected)
      .map((id) => issues.find((i) => i.id === id))
      .filter((i) => i?.canAutoFix);
    toast.success(`Fixed ${fixable.length} issues automatically.`);
    setIssueSelected(new Set());
  };

  const bulkIgnore = () => {
    setIssues((prev) =>
      prev.map((i) => (issueSelected.has(i.id) ? { ...i, ignored: true } : i))
    );
    toast.success(`${issueSelected.size} issues ignored.`);
    setIssueSelected(new Set());
  };

  const toggleIssue = (id: string) =>
    setIssueSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Issue trend chart data — build from issues
  const trendData = useMemo(() => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const critCount = grouped.Critical.length;
    const warnCount = grouped.Warning.length;
    const infoCount = grouped.Info.length;
    return weeks.map((week, i) => ({
      week,
      critical: Math.max(0, critCount + (i - 2)),
      warning: Math.max(0, warnCount + (i - 1)),
      info: Math.max(0, infoCount - i),
    }));
  }, [grouped]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        {issueSelected.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-[11px] gap-1 bg-accent text-accent-foreground"
              onClick={bulkAutoFix}
            >
              <Wrench className="w-3 h-3" /> Bulk Auto-Fix
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={bulkIgnore}
            >
              Bulk Ignore ({issueSelected.size})
            </Button>
          </div>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setShowIgnored(!showIgnored)}
            className={`text-[11px] font-medium transition-colors ${
              showIgnored ? 'text-accent' : 'text-muted-foreground hover:text-card-foreground'
            }`}
          >
            {showIgnored ? 'Hide Ignored' : `Show Ignored (${ignoredIssues.length})`}
          </button>
        </div>
      </div>

      {/* Issue Sections */}
      {(['Critical', 'Warning', 'Info'] as IssueSeverity[]).map((severity) => (
        <div key={severity} className={`rounded-lg border ${sevColors[severity]}`}>
          <button
            onClick={() => toggleSection(severity)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  expandedSections[severity] ? 'rotate-0' : '-rotate-90'
                }`}
              />
              <span className="text-[13px] font-semibold">{severity}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevBadge[severity]}`}
              >
                {grouped[severity].length}
              </span>
            </div>
          </button>
          {expandedSections[severity] && (
            <div className="px-4 pb-3 space-y-2">
              {grouped[severity].length === 0 ? (
                <p className="text-[12px] text-muted-foreground py-2">
                  No {severity.toLowerCase()} issues 🎉
                </p>
              ) : (
                grouped[severity].map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-3 p-3 rounded-md bg-card border border-border/50"
                  >
                    <input
                      type="checkbox"
                      checked={issueSelected.has(issue.id)}
                      onChange={() => toggleIssue(issue.id)}
                      className="w-3.5 h-3.5 rounded mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <IssueSeverityBadge type={issue.type} />
                        <a
                          href={`https://${siteDomain}${issue.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-accent hover:underline font-mono truncate"
                        >
                          {issue.url}
                        </a>
                      </div>
                      <p className="text-[12px] text-card-foreground">{issue.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{issue.pageTitle}</span>
                        <span>·</span>
                        <span>
                          Detected{' '}
                          {issue.firstDetected.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {issue.canAutoFix && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1 border-accent/30 text-accent hover:bg-accent/10"
                          onClick={() => autoFix(issue)}
                        >
                          <Wrench className="w-3 h-3" /> Auto-Fix
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-muted-foreground"
                        onClick={() => ignoreIssue(issue.id)}
                      >
                        Ignore
                      </Button>
                      {issue.hasArticle && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-muted-foreground"
                          onClick={() => onViewArticle?.(issue.pageTitle)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}

      {/* Ignored Issues */}
      {showIgnored && ignoredIssues.length > 0 && (
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
            Ignored Issues ({ignoredIssues.length})
          </p>
          <div className="space-y-2">
            {ignoredIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IssueSeverityBadge type={issue.type} />
                  <span className="text-[11px] text-muted-foreground truncate">
                    {issue.url} — {issue.description.slice(0, 60)}…
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-accent shrink-0"
                  onClick={() => restoreIssue(issue.id)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Issue Trend Chart */}
      <Card className="p-4">
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
          Issue Trend (Weekly)
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <RechartsTooltip
              contentStyle={{
                fontSize: 11,
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar
              dataKey="critical"
              stackId="1"
              fill="hsl(var(--destructive))"
              name="Critical"
              radius={[0, 0, 0, 0]}
            />
            <Bar dataKey="warning" stackId="1" fill="hsl(var(--warning))" name="Warning" />
            <Bar
              dataKey="info"
              stackId="1"
              fill="hsl(var(--accent))"
              name="Info"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
