import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Cpu, Zap, Eye, EyeOff, Loader2, Sparkles, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import { useConnectionTest } from '../hooks/useConnectionTest';
import type { AIConfigSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

const CLAUDE_MODELS = ['claude-sonnet-4', 'claude-opus-4'];
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash'];
const STOCK_PROVIDERS = ['Adobe Stock', 'Unsplash', 'Shutterstock', 'Pexels', 'None'];

const IMAGE_TIERS = [
  { id: 'standard' as const, label: 'Standard', model: 'gemini-2.5-flash-image', cost: '~$0.02/image', res: '1K resolution' },
  { id: 'fast' as const, label: 'Fast', model: 'gemini-3.1-flash-image-preview', cost: '~$0.05/image', res: 'up to 4K' },
  { id: 'pro' as const, label: 'Pro', model: 'gemini-3-pro-image-preview', cost: '~$0.13–$0.24/image', res: 'best for text/logos' },
];

const DEFAULT_AGENTS = [
  { agentId: 'article-writing', agentName: 'Article Writing Agent', model: 'Claude', tier: 1 as const, overrideEnabled: false },
  { agentId: 'research-verification', agentName: 'Research Verification Agent', model: 'Claude', tier: 1 as const, overrideEnabled: false },
  { agentId: 'newsletter-writing', agentName: 'Newsletter Writing Agent', model: 'Claude', tier: 1 as const, overrideEnabled: false },
  { agentId: 'analytics', agentName: 'Analytics Agent', model: 'Claude', tier: 1 as const, overrideEnabled: false },
  { agentId: 'quality-scoring', agentName: 'Quality Scoring Agent', model: 'Claude', tier: 1 as const, overrideEnabled: false },
  { agentId: 'metadata', agentName: 'Metadata Agent', model: 'Claude', tier: 1 as const, overrideEnabled: false },
  { agentId: 'rss-tagging', agentName: 'RSS Auto-Tagging', model: 'Gemini Flash', tier: 2 as const, overrideEnabled: false },
  { agentId: 'transcript-tagging', agentName: 'Transcript Auto-Tagging', model: 'Gemini Flash', tier: 2 as const, overrideEnabled: false },
  { agentId: 'content-classification', agentName: 'Content Classification', model: 'Gemini Flash', tier: 2 as const, overrideEnabled: false },
  { agentId: 'keyword-scoring', agentName: 'Keyword Scoring', model: 'Gemini Flash', tier: 2 as const, overrideEnabled: false },
  { agentId: 'notification-summaries', agentName: 'Notification Summaries', model: 'Gemini Flash', tier: 2 as const, overrideEnabled: false },
];

export function AIConfigTab() {
  const { data, loading, error, save } = useSettings<AIConfigSettings>('aiConfig');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('aiConfig');

  // Connection test hooks — used for Claude/Perplexity test buttons
  // These call the backend connection test functions
  const claudeConnection = useConnectionTest('webflow'); // Placeholder — no dedicated Claude test endpoint
  const perplexityConnection = useConnectionTest('webflow'); // Placeholder — no dedicated Perplexity test endpoint

  // Local state for model selectors
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showPerplexityKey, setShowPerplexityKey] = useState(false);
  const [showStockKey, setShowStockKey] = useState(false);
  const [claudeTesting, setClaudeTesting] = useState(false);
  const [claudeConnected, setClaudeConnected] = useState(true);
  const [perplexityTesting, setPerplexityTesting] = useState(false);
  const [perplexityConnected, setPerplexityConnected] = useState(true);
  const [stockProvider, setStockProvider] = useState('');
  const [stockTesting, setStockTesting] = useState(false);

  // Image generation local state
  const [imageTier, setImageTier] = useState<'standard' | 'fast' | 'pro'>('fast');
  const [imageBudget, setImageBudget] = useState(50);
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [disableOnBudget, setDisableOnBudget] = useState(true);

  // Agent overrides
  const [agentOverrides, setAgentOverrides] = useState<Record<string, boolean>>({});

  // Test Any Agent state
  const [testAgent, setTestAgent] = useState('Article Writing Agent');
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (data) {
      setClaudeModel(data.tier1?.model || 'claude-sonnet-4');
      setGeminiModel(data.tier2?.model || 'gemini-2.0-flash');
      setStockProvider(data.stockPhotoProvider?.provider || '');
      setImageTier(data.imageGeneration?.tier || 'fast');
      setImageBudget(data.imageGeneration?.monthlyBudget || 50);
      setWarningThreshold(data.imageGeneration?.warningThreshold || 80);
      setDisableOnBudget(data.imageGeneration?.disableOnBudgetExceeded ?? true);
      // Set agent overrides from data
      const overrides: Record<string, boolean> = {};
      (data.agentAssignments || []).forEach(a => { overrides[a.agentName] = a.overrideEnabled; });
      setAgentOverrides(overrides);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const agents = data?.agentAssignments && data.agentAssignments.length > 0
    ? data.agentAssignments
    : DEFAULT_AGENTS;

  const currentSpend = data?.imageGeneration?.currentSpend || 0;
  const budgetPercent = imageBudget > 0 ? Math.min(100, (currentSpend / imageBudget) * 100) : 0;

  const handleTestClaude = () => {
    setClaudeTesting(true);
    setTimeout(() => {
      setClaudeTesting(false);
      setClaudeConnected(true);
    }, 1200);
  };

  const handleTestPerplexity = () => {
    setPerplexityTesting(true);
    setTimeout(() => {
      setPerplexityTesting(false);
      setPerplexityConnected(true);
    }, 1200);
  };

  const handleTestStock = () => {
    setStockTesting(true);
    setTimeout(() => {
      setStockTesting(false);
    }, 1200);
  };

  const handleRunTest = () => {
    if (!testInput) return;
    setTesting(true);
    // In production this would call a Cloud Function
    setTimeout(() => {
      setTestOutput('');
      setTesting(false);
    }, 2000);
  };

  return (
    <NotYetAvailable note="AI model configuration is not yet active — models, tiers, and budgets are currently fixed in the Cloud Functions, and API keys are managed via Firebase Secrets (firebase functions:secrets:set), not through this UI.">
    <div className="space-y-6">
      {/* LLM Model Configuration */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">LLM Model Configuration</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-[12px] text-muted-foreground">The platform uses a tiered AI strategy. Claude handles premium content tasks. Gemini Flash handles high-volume utility tasks.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tier 1 - Claude */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-accent" />
                <span className="text-[13px] font-semibold text-card-foreground">Tier 1: Claude (Premium Content)</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Model</label>
                <select
                  value={claudeModel}
                  onChange={e => setClaudeModel(e.target.value)}
                  disabled={readOnly}
                  className="w-full text-[12px] h-8 rounded-md border border-input bg-background px-2"
                >
                  {CLAUDE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Anthropic API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showClaudeKey ? 'text' : 'password'}
                      value="••••••••••••••••"
                      disabled
                      className="pr-9 text-[12px] h-8 font-mono"
                    />
                    <button
                      onClick={() => setShowClaudeKey(!showClaudeKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showClaudeKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestClaude}
                    disabled={claudeTesting || readOnly}
                    className="text-[11px] h-8"
                  >
                    {claudeTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
                  </Button>
                </div>
                <Badge variant="outline" className="text-[10px]">Managed via Firebase Secrets</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', claudeConnected ? 'bg-green-500' : 'bg-destructive')} />
                <span className="text-[11px] text-muted-foreground">{claudeConnected ? 'Connected' : 'Not Connected'}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {data?.tier1?.monthlyTokenUsage?.toLocaleString() || '0'} / 500K tokens used this month
              </div>
            </div>

            {/* Tier 2 - Gemini Flash */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-[13px] font-semibold text-card-foreground">Tier 2: Gemini Flash (Utility Tasks)</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Model</label>
                <select
                  value={geminiModel}
                  onChange={e => setGeminiModel(e.target.value)}
                  disabled={readOnly}
                  className="w-full text-[12px] h-8 rounded-md border border-input bg-background px-2"
                >
                  {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground italic">Accessed natively via Firebase Gen AI Toolkit — no API key required</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[11px] text-muted-foreground">Connected</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {data?.tier2?.monthlyRequestCount?.toLocaleString() || '0'} requests this month
              </div>
            </div>
          </div>

          {/* Agent Assignment Table */}
          <div className="mt-4">
            <h4 className="text-[12px] font-semibold text-card-foreground mb-2">Agent Assignment</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_60px_60px] gap-2 px-4 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <span>Agent Name</span><span>Current Model</span><span>Tier</span><span>Override</span>
              </div>
              {agents.map(agent => (
                <div key={agent.agentId || agent.agentName} className="grid grid-cols-[1fr_120px_60px_60px] gap-2 px-4 py-2 border-t border-border items-center">
                  <span className="text-[12px] text-card-foreground">{agent.agentName}</span>
                  <span className={cn('text-[11px] font-medium', agent.tier === 1 ? 'text-accent' : 'text-orange-500')}>{agent.model}</span>
                  <span className="text-[11px] text-muted-foreground">Tier {agent.tier}</span>
                  <Switch
                    checked={agentOverrides[agent.agentName] ?? agent.overrideEnabled}
                    onCheckedChange={v => setAgentOverrides({ ...agentOverrides, [agent.agentName]: v })}
                    disabled={readOnly}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Perplexity */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Perplexity API</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Input
                type={showPerplexityKey ? 'text' : 'password'}
                value="••••••••••••••••"
                disabled
                className="pr-9 text-[12px] h-9 font-mono"
              />
              <button
                onClick={() => setShowPerplexityKey(!showPerplexityKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPerplexityKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPerplexity}
              disabled={perplexityTesting || readOnly}
              className="text-[12px]"
            >
              {perplexityTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Test Connection'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">Managed via Firebase Secrets</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', perplexityConnected ? 'bg-green-500' : 'bg-destructive')} />
            <span className="text-[11px] text-muted-foreground">
              {perplexityConnected ? 'Connected' : 'Not Connected'} · {data?.perplexity?.monthlyRequestCount?.toLocaleString() || '0'} requests this month
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Used for deep topic research. Falls back to Claude-only research if unavailable.</p>
        </div>
      </div>

      {/* Stock Photo Provider */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Stock Photo Provider</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <select
            value={stockProvider}
            onChange={e => setStockProvider(e.target.value)}
            disabled={readOnly}
            className="text-[12px] h-9 rounded-md border border-input bg-background px-3 w-48"
          >
            <option value="">Select provider...</option>
            {STOCK_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {stockProvider && stockProvider !== 'None' && (
            <div className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Input
                  type={showStockKey ? 'text' : 'password'}
                  value="••••••••••••••••"
                  disabled
                  className="pr-9 text-[12px] h-9 font-mono"
                />
                <button
                  onClick={() => setShowStockKey(!showStockKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showStockKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestStock}
                disabled={stockTesting || readOnly}
                className="text-[12px]"
              >
                {stockTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Test'}
              </Button>
            </div>
          )}
          <Badge variant="outline" className="text-[10px]">Managed via Firebase Secrets</Badge>
          <p className="text-[10px] text-muted-foreground">Controls the Stock Photos tab in the Asset Library. Adobe Stock recommended for premium travel imagery.</p>
        </div>
      </div>

      {/* Image Generation */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground flex items-center gap-2">
            <Image className="h-4 w-4 text-accent" />Image Generation (Nano Banana / Gemini)
          </h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {IMAGE_TIERS.map(tier => (
              <button
                key={tier.id}
                onClick={() => { if (!readOnly) setImageTier(tier.id); }}
                disabled={readOnly}
                className={cn(
                  'text-left p-3 rounded-lg border transition-colors',
                  imageTier === tier.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                )}
              >
                <div className="text-[12px] font-semibold text-card-foreground">{tier.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{tier.model}</div>
                <div className="text-[11px] text-accent font-medium mt-1">{tier.cost}</div>
                <div className="text-[10px] text-muted-foreground">{tier.res}</div>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <h4 className="text-[12px] font-medium text-card-foreground">Monthly Image Generation Budget</h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[12px] text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={imageBudget}
                  onChange={e => setImageBudget(Number(e.target.value))}
                  disabled={readOnly}
                  className="w-24 text-[12px] h-8"
                />
              </div>
              <span className="text-[12px] text-muted-foreground">
                ${currentSpend.toFixed(2)} / ${imageBudget}.00 used
              </span>
            </div>
            <div className="max-w-sm">
              <Progress
                value={budgetPercent}
                className={cn(
                  'h-1.5',
                  budgetPercent > 90 ? '[&>div]:bg-destructive' : budgetPercent > 70 ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'
                )}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground">Warning at</label>
                <Input
                  type="number"
                  value={warningThreshold}
                  onChange={e => setWarningThreshold(Number(e.target.value))}
                  disabled={readOnly}
                  className="w-16 text-[12px] h-7"
                />
                <span className="text-[11px] text-muted-foreground">%</span>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={disableOnBudget}
                  onChange={e => setDisableOnBudget(e.target.checked)}
                  disabled={readOnly}
                  className="rounded border-input"
                />
                Disable when budget exceeded
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Test Any Agent */}
      <div className="bg-card rounded-lg border-l-4 border-l-accent border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />Test Any Agent
          </h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <select
            value={testAgent}
            onChange={e => setTestAgent(e.target.value)}
            className="text-[12px] h-9 rounded-md border border-input bg-background px-3 w-64"
          >
            {agents.map(a => <option key={a.agentId || a.agentName} value={a.agentName}>{a.agentName}</option>)}
          </select>
          <Textarea
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            placeholder="Enter test input for this agent..."
            rows={3}
            className="text-[12px]"
          />
          <Button
            onClick={handleRunTest}
            disabled={testing || !testInput}
            className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 text-[12px]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {testing ? 'Running...' : 'Run Test'}
          </Button>
          {testOutput && (
            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              <p className="text-[13px] text-card-foreground leading-relaxed">{testOutput}</p>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span>Input: — tokens / Output: — tokens</span>
                <span>Estimated cost: —</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </NotYetAvailable>
  );
}
