import { useEffect, useMemo, useState } from 'react';
import { Loader2, Play, Plus, Trash2 } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { seoIntelService } from '../../services/seoIntelService';
import type { AiTrackedPrompt, AiVisibilityRun } from '../../types/intel';
import { ChartCard } from '../analytics/ChartCard';
import { CHART_AXIS_STROKE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE, SERIES_COLORS } from '../analytics/chartTheme';

const PROVIDER_LABELS: Record<string, string> = {
  chat_gpt: 'ChatGPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  claude: 'Claude',
};

/**
 * Weekly tracked AI visibility: the saved prompt portfolio, a run-now button,
 * and the citation-rate trend per AI model. Gaps flow into the Priority Queue
 * as ai_gap recommendations automatically.
 */
export function TrackedPromptsPanel() {
  const [prompts, setPrompts] = useState<AiTrackedPrompt[]>([]);
  const [runs, setRuns] = useState<AiVisibilityRun[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => seoIntelService.subscribeToPrompts(setPrompts, err => toast.error(err.message)), []);
  useEffect(() => seoIntelService.subscribeToAiRuns(setRuns, err => toast.error(err.message)), []);

  const trend = useMemo(() => {
    const byWeek = new Map<string, Map<string, { cited: number; total: number }>>();
    for (const run of runs) {
      if (run.status !== 'ok') continue;
      if (!byWeek.has(run.week)) byWeek.set(run.week, new Map());
      const providers = byWeek.get(run.week)!;
      if (!providers.has(run.provider)) providers.set(run.provider, { cited: 0, total: 0 });
      const stats = providers.get(run.provider)!;
      stats.total += 1;
      if (run.cited) stats.cited += 1;
    }
    return [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, providers]) => {
        const point: Record<string, string | number> = { week };
        for (const [provider, stats] of providers) {
          point[provider] = Math.round((stats.cited / stats.total) * 100);
        }
        return point;
      });
  }, [runs]);

  const providersInTrend = useMemo(
    () => [...new Set(runs.filter(r => r.status === 'ok').map(r => r.provider))],
    [runs],
  );
  const latestWeek = trend.length > 0 ? String(trend[trend.length - 1].week) : null;

  const addPrompt = async () => {
    if (!newPrompt.trim()) return;
    setBusy('add');
    try {
      await seoIntelService.managePrompt({ action: 'create', prompt: newPrompt.trim(), topic: newTopic.trim() || undefined });
      setNewPrompt('');
      setNewTopic('');
      toast.success('Prompt added to the weekly portfolio');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add prompt');
    } finally {
      setBusy(null);
    }
  };

  const runNow = async () => {
    setBusy('run');
    try {
      const result = await seoIntelService.runAiVisibility();
      toast.success(`Checked ${result.prompts} prompts — ${result.gaps} AI visibility gap${result.gaps === 1 ? '' : 's'} found`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI visibility check failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ChartCard
      title="Tracked prompts (weekly)"
      description="These prompts are re-asked to every AI model each Tuesday. Prompts where competitors are cited and you aren't become recommendations."
      actions={
        <Button variant="outline" size="sm" disabled={busy !== null || prompts.filter(p => p.active).length === 0} onClick={runNow}>
          {busy === 'run' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          {busy === 'run' ? 'Checking…' : 'Run check now'}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={newPrompt}
            onChange={e => setNewPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPrompt()}
            placeholder="Add a prompt your audience asks AI, e.g. best credit card for lounge access"
            className="min-w-64 flex-1"
          />
          <Input
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            placeholder="Topic keyword (optional)"
            className="w-52"
          />
          <Button onClick={addPrompt} disabled={busy !== null || !newPrompt.trim()}>
            {busy === 'add' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add
          </Button>
        </div>

        {prompts.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prompt</TableHead>
                <TableHead className="w-40">Topic</TableHead>
                <TableHead className="w-36">Latest result</TableHead>
                <TableHead className="w-20">Active</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map(prompt => {
                const latest = latestWeek
                  ? runs.filter(r => r.promptId === prompt.id && r.week === latestWeek && r.status === 'ok')
                  : [];
                const citedCount = latest.filter(r => r.cited).length;
                return (
                  <TableRow key={prompt.id}>
                    <TableCell className="max-w-[360px] truncate font-medium">{prompt.prompt}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{prompt.topic ?? '—'}</TableCell>
                    <TableCell>
                      {latest.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Not checked yet</span>
                      ) : citedCount > 0 ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Cited by {citedCount}/{latest.length}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Not cited</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={prompt.active}
                        onCheckedChange={async checked => {
                          try {
                            await seoIntelService.managePrompt({ action: 'update', promptId: prompt.id, active: checked });
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Update failed');
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          try {
                            await seoIntelService.managePrompt({ action: 'delete', promptId: prompt.id });
                            toast.success('Prompt removed');
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Delete failed');
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {trend.length >= 2 && (
          <div>
            <p className="mb-2 text-sm font-medium">Citation rate over time (% of prompts where you're cited)</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="week" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => `${value}%`} />
                  <Legend />
                  {providersInTrend.map((provider, i) => (
                    <Line
                      key={provider}
                      type="monotone"
                      dataKey={provider}
                      name={PROVIDER_LABELS[provider] ?? provider}
                      stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
