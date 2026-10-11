import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { KeyRound, RotateCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import { rotateSecret } from '../services/settingsService';

interface CredentialRow {
  secretName: string;
  label: string;
  consumers: string;
}

interface CredentialGroup {
  title: string;
  rows: CredentialRow[];
}

// Mirrors ROTATABLE_SECRETS in functions/src/settings/rotateSecret.ts — the
// callable rejects anything not on the server allowlist.
const CREDENTIAL_GROUPS: CredentialGroup[] = [
  {
    title: 'AI Services',
    rows: [
      { secretName: 'ANTHROPIC_API_KEY', label: 'Claude API Key', consumers: 'Article drafts, card editorial content, card tagging, transcripts' },
      { secretName: 'OPENAI_API_KEY', label: 'OpenAI API Key', consumers: 'AI image generation (applies immediately, no redeploy needed)' },
      { secretName: 'PERPLEXITY_API_KEY', label: 'Perplexity API Key', consumers: 'Deep topic research' },
      { secretName: 'DEEPGRAM_API_KEY', label: 'Deepgram API Key', consumers: 'Voice note transcription' },
    ],
  },
  {
    title: 'SEO',
    rows: [
      { secretName: 'DATAFORSEO_LOGIN', label: 'DataForSEO Login', consumers: 'All SEO analytics, keyword research, backlinks' },
      { secretName: 'DATAFORSEO_PASSWORD', label: 'DataForSEO Password', consumers: 'All SEO analytics, keyword research, backlinks' },
    ],
  },
  {
    title: 'Scraping',
    rows: [
      { secretName: 'TINYFISH_API_KEY', label: 'TinyFish API Key', consumers: 'Card data scraping' },
    ],
  },
  {
    title: 'Social',
    rows: [
      { secretName: 'ZERNIO_API_KEY', label: 'Zernio API Key', consumers: 'Experience Library social imports — TikTok, Instagram, YouTube, Facebook, X, LinkedIn, Pinterest (applies immediately, no redeploy needed)' },
    ],
  },
  {
    title: 'Google Drive',
    rows: [
      { secretName: 'GOOGLE_DRIVE_OAUTH_CLIENT_ID', label: 'OAuth Client ID', consumers: 'Asset Library Google Drive import — from the OAuth 2.0 Web client in the GCP console (applies immediately, no redeploy needed)' },
      { secretName: 'GOOGLE_DRIVE_OAUTH_CLIENT_SECRET', label: 'OAuth Client Secret', consumers: 'Asset Library Google Drive import — from the OAuth 2.0 Web client in the GCP console (applies immediately, no redeploy needed)' },
    ],
  },
  {
    title: 'AI Final Processing',
    rows: [
      { secretName: 'ZEROGPT_API_KEY', label: 'ZeroGPT API Key', consumers: 'AI detection in the AI Final Processing pipeline (applies immediately, no redeploy needed)' },
    ],
  },
  {
    title: 'Publishing',
    rows: [
      { secretName: 'WEBFLOW_API_KEY', label: 'Webflow API Key', consumers: 'Article and card publishing to Webflow' },
      { secretName: 'BEEHIIV_API_KEY', label: 'Beehiiv API Key', consumers: 'Newsletter sends and subscriber sync' },
    ],
  },
  {
    title: 'Alerts',
    rows: [
      { secretName: 'SLACK_WEBHOOK_URL', label: 'Slack Webhook URL', consumers: 'Team notifications' },
    ],
  },
];

export function CredentialsTab() {
  const { isAdmin } = useSettingsPermissions();
  const [values, setValues] = useState<Record<string, string>>({});
  const [rotating, setRotating] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<CredentialRow | null>(null);

  const handleRotate = async (row: CredentialRow) => {
    const value = (values[row.secretName] ?? '').trim();
    setConfirmTarget(null);
    setRotating(row.secretName);
    try {
      const result = await rotateSecret(row.secretName, value);
      setValues(v => ({ ...v, [row.secretName]: '' }));
      toast.success(`${row.label} rotated`, {
        description: result.appliedImmediately
          ? 'The new key is live immediately.'
          : 'A new secret version was stored. Functions pick it up on their next deploy or restart.',
      });
    } catch (err) {
      toast.error(`Failed to rotate ${row.label}`, { description: (err as Error).message });
    } finally {
      setRotating(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-card rounded-lg border border-border px-5 py-8 text-center">
        <ShieldAlert className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-[13px] text-muted-foreground">Only admins can view and rotate API credentials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <KeyRound className="h-4 w-4 text-accent" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[14px] font-semibold text-card-foreground">API Credentials</h3>
            <p className="text-[12px] text-muted-foreground">
              All credentials live in Firebase Secrets (Google Secret Manager) — values are never shown here.
              Rotating a key stores a new secret version for the entire system; Cloud Functions switch to it on
              their next deploy or restart. Make sure the new key is already active with the provider before rotating.
            </p>
          </div>
        </div>
      </div>

      {CREDENTIAL_GROUPS.map(group => (
        <div key={group.title} className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-[14px] font-semibold text-card-foreground">{group.title}</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            {group.rows.map(row => (
              <div key={row.secretName} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-[12px] font-medium text-card-foreground">{row.label}</label>
                  <Badge variant="outline" className="text-[10px] font-mono">{row.secretName}</Badge>
                  <Badge variant="secondary" className="text-[10px]">Managed via Firebase Secrets</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{row.consumers}</p>
                <div className="flex gap-2 max-w-xl">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter new value to rotate…"
                    value={values[row.secretName] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [row.secretName]: e.target.value }))}
                    className="text-[12px] h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] gap-1 shrink-0"
                    disabled={(values[row.secretName] ?? '').trim().length < 8 || rotating !== null}
                    onClick={() => setConfirmTarget(row)}
                  >
                    <RotateCw className={`h-3 w-3 ${rotating === row.secretName ? 'animate-spin' : ''}`} />
                    {rotating === row.secretName ? 'Rotating…' : 'Rotate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate {confirmTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will rotate {confirmTarget?.secretName} in Firebase Secrets for the entire system.
              Everything that uses this credential ({confirmTarget?.consumers.toLowerCase()}) will switch to
              the new value — if the new key is wrong, those features stop working. Cloud Functions apply the
              new version on their next deploy or restart. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmTarget && handleRotate(confirmTarget)}
            >
              Rotate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
