/**
 * AddPartnerDialog — creates a new transfer partner row via the
 * addTransferPartner callable. Opened from the edit-mode "Add Partner"
 * buttons under each alliance group in the matrix.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { transferPartnerService } from '../services/transferPartnerService';
import type { AllianceGroup } from '../types';

const ALLIANCES: AllianceGroup[] = ['Star Alliance', 'Oneworld', 'SkyTeam', 'Non-Alliance', 'Hotels'];

interface AddPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAlliance?: AllianceGroup;
}

export function AddPartnerDialog({ open, onOpenChange, defaultAlliance }: AddPartnerDialogProps) {
  const [name, setName] = useState('');
  const [loyaltyProgram, setLoyaltyProgram] = useState('');
  const [alliance, setAlliance] = useState<AllianceGroup>(defaultAlliance ?? 'Star Alliance');
  const [iataCode, setIataCode] = useState('');
  const [brandColor, setBrandColor] = useState('#475569');
  const [awardReleaseDays, setAwardReleaseDays] = useState('');
  const [awardReleasePattern, setAwardReleasePattern] = useState('Rolling');
  const [awardNotes, setAwardNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && defaultAlliance) setAlliance(defaultAlliance);
  }, [open, defaultAlliance]);

  const handleCreate = async () => {
    if (!name.trim() || !loyaltyProgram.trim()) {
      toast.error('Name and loyalty program are required');
      return;
    }
    setSaving(true);
    try {
      await transferPartnerService.addPartner({
        name: name.trim(),
        type: alliance === 'Hotels' ? 'hotel' : 'airline',
        alliance,
        loyaltyProgram: loyaltyProgram.trim(),
        awardReleaseDays: awardReleaseDays.trim() ? Number(awardReleaseDays) : undefined,
        awardReleasePattern: awardReleasePattern || undefined,
        programs: {},
        sweetSpots: [],
        awardNotes: awardNotes.trim() || undefined,
        isAvios: false,
        isMarriott: false,
        // Extra display fields accepted by the generic update path
        ...({ iataCode: iataCode.trim().toUpperCase() || undefined, brandColor } as Record<string, unknown>),
      });
      toast.success(`${name.trim()} added to ${alliance}`, {
        description: 'Use Edit Mode on any program cell to configure transfer ratios.',
      });
      setName(''); setLoyaltyProgram(''); setIataCode(''); setAwardReleaseDays(''); setAwardNotes('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to add partner', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transfer Partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Partner Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Iberia" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Loyalty Program</Label>
              <Input value={loyaltyProgram} onChange={(e) => setLoyaltyProgram(e.target.value)} placeholder="e.g. Iberia Plus" className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Alliance</Label>
              <Select value={alliance} onValueChange={(v) => setAlliance(v as AllianceGroup)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALLIANCES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo Code</Label>
              <Input value={iataCode} onChange={(e) => setIataCode(e.target.value)} placeholder="IB" maxLength={2} className="h-9 text-sm uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Brand Colour</Label>
              <Input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-9 p-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Award Release (days)</Label>
              <Input value={awardReleaseDays} onChange={(e) => setAwardReleaseDays(e.target.value)} placeholder="e.g. 355" type="number" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Release Pattern</Label>
              <Select value={awardReleasePattern} onValueChange={setAwardReleasePattern}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Rolling', 'Batch', 'Variable', 'Partner differs'].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Award Notes</Label>
            <Textarea value={awardNotes} onChange={(e) => setAwardNotes(e.target.value)} placeholder="Booking quirks, value notes..." className="min-h-[56px] text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim() || !loyaltyProgram.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Partner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
