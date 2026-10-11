import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { callAutoTagTranscript } from '../services/experienceService';
import type { ExperienceItem, ExperienceTaxonomy } from '../types';

interface InlineTagEditorProps {
  item: ExperienceItem;
  onSave: (taxonomy: ExperienceTaxonomy) => void;
  onCancel: () => void;
}

const AIRLINE_OPTIONS = ['Japan Airlines', 'ANA', 'Singapore Airlines', 'Cathay Pacific', 'Emirates', 'Qatar Airways', 'Delta', 'United', 'American Airlines', 'Southwest', 'JetBlue', 'Alaska Airlines', 'British Airways', 'Lufthansa'];
const HOTEL_OPTIONS = ['Marriott Bonvoy', 'Hilton Honors', 'World of Hyatt', 'IHG One Rewards', 'Park Hyatt', 'Waldorf Astoria', 'Ritz-Carlton', 'St. Regis', 'W Hotels', 'Conrad'];
const AIRPORT_OPTIONS = ['JFK', 'LAX', 'SFO', 'ORD', 'DFW', 'MIA', 'ATL', 'SEA', 'LHR', 'CDG', 'NRT', 'HND', 'SIN', 'HKG', 'DXB'];
const CREDIT_CARD_OPTIONS = ['Chase Sapphire Reserve', 'Chase Sapphire Preferred', 'Amex Platinum', 'Amex Gold', 'Capital One Venture X', 'Hilton Honors Aspire', 'World of Hyatt Card'];
const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'];
const TRIP_COMPONENTS = ['Outbound Flight', 'Return Flight', 'Hotel Stay', 'Lounge Visit', 'Ground Transport', 'Activity'];

export function InlineTagEditor({ item, onSave, onCancel }: InlineTagEditorProps) {
  const [airline, setAirline] = useState(item.taxonomy.airline || '');
  const [hotel, setHotel] = useState(item.taxonomy.hotel || '');
  const [airport, setAirport] = useState(item.taxonomy.airport || '');
  const [destination, setDestination] = useState(item.taxonomy.destination || '');
  const [cabinClass, setCabinClass] = useState(item.taxonomy.cabinClass || '');
  const [lounge, setLounge] = useState(item.taxonomy.lounge || '');
  const [creditCard, setCreditCard] = useState(item.taxonomy.creditCard || '');
  const [experienceType, setExperienceType] = useState(item.taxonomy.experienceType || '');
  const [tripComponent, setTripComponent] = useState(item.taxonomy.tripComponent || '');
  const [tags, setTags] = useState<string[]>([...item.taxonomy.tags]);
  const [tagInput, setTagInput] = useState('');
  const [smartTagging, setSmartTagging] = useState(false);

  const handleSave = () => {
    onSave({
      airline: airline || undefined,
      hotel: hotel || undefined,
      airport: airport || undefined,
      destination: destination || undefined,
      aircraftType: item.taxonomy.aircraftType,
      cabinClass: cabinClass || undefined,
      lounge: lounge || undefined,
      creditCard: creditCard || undefined,
      experienceType: experienceType || undefined,
      tripComponent: tripComponent || undefined,
      tags,
    });
    toast.success('Tags saved');
  };

  const handleSmartTag = async () => {
    setSmartTagging(true);
    try {
      const result = await callAutoTagTranscript(item.id);
      if (result.success && result.autoTags) {
        if (result.autoTags.airlines?.[0]) setAirline(result.autoTags.airlines[0]);
        if (result.autoTags.hotels?.[0]) setHotel(result.autoTags.hotels[0]);
        if (result.autoTags.destinations?.[0]) setDestination(result.autoTags.destinations[0]);
        if (result.autoTags.experienceTypes?.[0]) setExperienceType(result.autoTags.experienceTypes[0]);
        const newTags = [...result.autoTags.cardKeywords || [], ...result.autoTags.destinations || []];
        setTags(prev => [...new Set([...prev, ...newTags])]);
        toast.success('Smart tags applied');
      }
    } catch {
      toast.error('Auto-tagging failed. Try again.');
    } finally {
      setSmartTagging(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3 animate-in slide-in-from-top-2 duration-200">
      {/* Current tags as pills */}
      <div className="flex flex-wrap gap-1">
        {airline && <TagPill label={airline} onRemove={() => setAirline('')} color="bg-accent/10 text-accent" />}
        {hotel && <TagPill label={hotel} onRemove={() => setHotel('')} color="bg-copper/10 text-copper" />}
        {destination && <TagPill label={destination} onRemove={() => setDestination('')} color="bg-success/10 text-success" />}
        {airport && <TagPill label={airport} onRemove={() => setAirport('')} color="bg-muted text-muted-foreground" />}
        {cabinClass && <TagPill label={cabinClass} onRemove={() => setCabinClass('')} color="bg-primary/10 text-primary" />}
        {creditCard && <TagPill label={creditCard} onRemove={() => setCreditCard('')} color="bg-accent/10 text-accent" />}
        {tags.map(t => <TagPill key={t} label={t} onRemove={() => setTags(tags.filter(x => x !== t))} color="bg-muted text-muted-foreground" />)}
      </div>

      {/* Dropdowns */}
      <div className="grid grid-cols-2 gap-2">
        <SelectField value={airline} onChange={setAirline} placeholder="Airline" options={AIRLINE_OPTIONS} />
        <SelectField value={hotel} onChange={setHotel} placeholder="Hotel / Program" options={HOTEL_OPTIONS} />
        <SelectField value={airport} onChange={setAirport} placeholder="Airport" options={AIRPORT_OPTIONS} />
        <SelectField value={creditCard} onChange={setCreditCard} placeholder="Credit Card" options={CREDIT_CARD_OPTIONS} />
      </div>

      {/* Cabin Class pills */}
      <div className="space-y-1">
        <label className="text-[9px] font-medium text-muted-foreground">Cabin Class</label>
        <div className="flex gap-1">
          {CABIN_CLASSES.map(c => (
            <button key={c} onClick={() => setCabinClass(cabinClass === c ? '' : c)}
              className={cn('px-2 py-0.5 rounded text-[9px] font-medium border transition-colors',
                cabinClass === c ? 'bg-primary/15 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:bg-muted')}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Trip Component pills */}
      <div className="space-y-1">
        <label className="text-[9px] font-medium text-muted-foreground">Trip Component</label>
        <div className="flex gap-1 flex-wrap">
          {TRIP_COMPONENTS.map(tc => (
            <button key={tc} onClick={() => setTripComponent(tripComponent === tc ? '' : tc)}
              className={cn('px-2 py-0.5 rounded text-[9px] font-medium border transition-colors',
                tripComponent === tc ? 'bg-accent/15 text-accent border-accent/30' : 'bg-card text-muted-foreground border-border hover:bg-muted')}>
              {tc}
            </button>
          ))}
        </div>
      </div>

      {/* Free-form tags */}
      <div className="flex gap-1.5">
        <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add tag... (Enter)" className="h-6 text-[10px] flex-1" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-6 text-[10px] gap-1" onClick={handleSmartTag} disabled={smartTagging}>
          <Sparkles className="w-3 h-3" /> {smartTagging ? 'Tagging...' : 'Smart Tag'}
        </Button>
        <div className="ml-auto flex gap-1.5">
          <button onClick={onCancel} className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1">Cancel</button>
          <Button size="sm" className="h-6 text-[10px]" onClick={handleSave}>Save Tags</Button>
        </div>
      </div>
    </div>
  );
}

function TagPill({ label, onRemove, color }: { label: string; onRemove: () => void; color: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]', color)}>
      {label}
      <button onClick={onRemove}><X className="w-2.5 h-2.5" /></button>
    </span>
  );
}

function SelectField({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) {
  return (
    <Select value={value || '_none'} onValueChange={v => onChange(v === '_none' ? '' : v)}>
      <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">None</SelectItem>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
