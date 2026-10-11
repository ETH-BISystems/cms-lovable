import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Info, Loader2, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SEOIssue, SEOCheckResult } from '../types';

interface SEOCheckPanelProps {
  result: SEOCheckResult | null;
  loading: boolean;
  onRunCheck: () => void;
  onProceed: () => void;
}

const SEVERITY_CONFIG = {
  error: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Error' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Warning' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-500/10', label: 'Info' },
};

const CATEGORY_LABELS: Record<string, string> = {
  metadata: 'Metadata',
  headings: 'Headings',
  keywords: 'Keywords',
  images: 'Images',
  schema: 'Schema',
};

export function SEOCheckPanel({ result, loading, onRunCheck, onProceed }: SEOCheckPanelProps) {
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);

  const handleProceed = () => {
    if (result && !result.passed) {
      setWarningDialogOpen(true);
    } else {
      onProceed();
    }
  };

  if (!result && !loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">SEO Verification</h3>
        </div>
        <p className="text-xs text-muted-foreground">Run the SEO check to verify your article against target keywords, metadata, and structure requirements.</p>
        <Button onClick={onRunCheck} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          Run SEO Check
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span className="text-sm text-muted-foreground">Running SEO verification...</span>
      </div>
    );
  }

  if (!result) return null;

  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const infos = result.issues.filter(i => i.severity === 'info');

  const grouped: Record<string, SEOIssue[]> = {};
  result.issues.forEach(issue => {
    if (!grouped[issue.category]) grouped[issue.category] = [];
    grouped[issue.category].push(issue);
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result.passed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <h3 className="text-sm font-semibold text-foreground">
            SEO Check: {result.passed ? 'Passed' : 'Issues Found'}
          </h3>
        </div>
        <div className="flex gap-2">
          {errors.length > 0 && <Badge variant="destructive" className="text-[9px]">{errors.length} errors</Badge>}
          {warnings.length > 0 && <Badge className="text-[9px] bg-amber-500/10 text-amber-700">{warnings.length} warnings</Badge>}
          {infos.length > 0 && <Badge variant="secondary" className="text-[9px]">{infos.length} info</Badge>}
        </div>
      </div>

      {/* Issues by category */}
      {Object.entries(grouped).map(([category, issues]) => (
        <div key={category} className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{CATEGORY_LABELS[category] || category}</p>
          {issues.map((issue, idx) => {
            const config = SEVERITY_CONFIG[issue.severity];
            const Icon = config.icon;
            return (
              <div key={idx} className={cn('flex items-start gap-2 px-3 py-2 rounded-lg', config.bg)}>
                <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', config.color)} />
                <span className="text-xs text-foreground">{issue.message}</span>
              </div>
            );
          })}
        </div>
      ))}

      {result.issues.length === 0 && (
        <div className="text-center py-4">
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-green-700 font-medium">All SEO checks passed!</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onRunCheck}>Re-run Check</Button>
        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleProceed}>
          {result.passed ? 'Proceed to Final Approval' : 'Proceed Anyway'}
        </Button>
      </div>

      {/* Warning popup */}
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              SEO Issues Found
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              The SEO check found {errors.length} error(s) and {warnings.length} warning(s). 
              You can still proceed, but these may affect search rankings.
            </p>
            <ul className="text-xs space-y-1 max-h-[200px] overflow-y-auto">
              {result.issues.filter(i => i.severity !== 'info').map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={issue.severity === 'error' ? 'text-destructive' : 'text-amber-600'}>•</span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningDialogOpen(false)}>Go Back & Fix</Button>
            <Button className="bg-accent text-accent-foreground" onClick={() => { setWarningDialogOpen(false); onProceed(); }}>
              Acknowledge & Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
