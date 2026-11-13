import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useData } from '@/lib/data';
import { PROJECT_CITIES, saveProjectPhoto } from '@/lib/project-photos';
import WatermarkedPhotoPicker from '@/components/WatermarkedPhotoPicker';
import BatchPhotoPicker, { type BatchPhoto } from '@/components/BatchPhotoPicker';

type Phase = 'before' | 'after';
type Entry = 'pairs' | 'batch';

interface ProjectPhotoFormProps {
  mode: 'single' | 'pair';
  onSaved?: () => void;
}

interface PhotoPair {
  before: Blob;
  after: Blob;
}

const PHASES: { key: Phase; label: string }[] = [
  { key: 'before', label: 'Before' },
  { key: 'after', label: 'After' },
];

const ENTRIES: { key: Entry; label: string }[] = [
  { key: 'pairs', label: 'Before & after' },
  { key: 'batch', label: 'Select multiple in order' },
];

function toPairs(photos: BatchPhoto[]): PhotoPair[] {
  const pairs: PhotoPair[] = [];
  for (let i = 0; i + 1 < photos.length; i += 2) {
    pairs.push({ before: photos[i].blob, after: photos[i + 1].blob });
  }
  return pairs;
}

export default function ProjectPhotoForm({ mode, onSaved }: ProjectPhotoFormProps) {
  const { services } = useData();
  const activeServices = services.filter(s => s.active);

  const [title, setTitle] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [city, setCity] = useState('');
  const [phase, setPhase] = useState<Phase>('before');
  const [entry, setEntry] = useState<Entry>('pairs');
  const [singlePhoto, setSinglePhoto] = useState<Blob | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<Blob | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<Blob | null>(null);
  const [batch, setBatch] = useState<BatchPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedKey = activeServices.some(s => s.key === serviceKey) ? serviceKey : activeServices[0]?.key ?? '';
  const batchPairCount = Math.floor(batch.length / 2);
  const batchIsEven = batch.length > 0 && batch.length % 2 === 0;
  const usingBatch = mode === 'pair' && entry === 'batch';

  const resetPhotos = () => {
    setTitle('');
    setCity('');
    setSinglePhoto(null);
    setBeforePhoto(null);
    setAfterPhoto(null);
    setBatch([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const service = activeServices.find(s => s.key === selectedKey);
    if (!title.trim() || !service || !city.trim()) {
      setError('Add a project title, service, and city.');
      return;
    }

    let pairs: PhotoPair[] | null = null;
    let singleSlot: { before?: Blob; after?: Blob } | null = null;
    if (mode === 'single') {
      if (!singlePhoto) {
        setError('Add a photo first.');
        return;
      }
      singleSlot = phase === 'before' ? { before: singlePhoto } : { after: singlePhoto };
    } else if (entry === 'batch') {
      if (!batchIsEven) {
        setError('Select an even number of photos, at least two, so every before has an after.');
        return;
      }
      pairs = toPairs(batch);
    } else {
      if (!beforePhoto || !afterPhoto) {
        setError('Add both a before and an after photo.');
        return;
      }
      pairs = [{ before: beforePhoto, after: afterPhoto }];
    }

    const details = { title: title.trim(), serviceLabel: service.label, city: city.trim() };
    setSaving(true);
    let savedCount = 0;
    try {
      if (pairs) {
        // Publish last-to-first: the feed is newest-first, so pair 1 ends up on top.
        for (let i = pairs.length - 1; i >= 0; i--) {
          const projectTitle = pairs.length > 1 ? `${details.title} ${i + 1}` : details.title;
          await saveProjectPhoto({ ...details, title: projectTitle }, pairs[i]);
          savedCount++;
        }
      } else if (singleSlot) {
        await saveProjectPhoto(details, singleSlot);
        savedCount++;
      }
      resetPhotos();
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error('Project photo save failed:', err);
      if (usingBatch && savedCount > 0) {
        const remaining = batch.length - savedCount * 2;
        setBatch(prev => prev.slice(0, remaining));
        setError(`Published ${savedCount} of ${pairs?.length ?? 0} pairs. The remaining photos are still selected; try again.`);
      } else {
        setError('The project could not be saved. Check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const publishLabel = () => {
    if (mode === 'single') return 'Publish to Recent Projects';
    if (!usingBatch) return 'Publish before & after';
    return `Publish ${batchPairCount} before & after ${batchPairCount === 1 ? 'pair' : 'pairs'}`;
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {mode === 'single' && (
        <div>
          <p className="label">Photo type</p>
          <div role="radiogroup" aria-label="Photo type" className="grid grid-cols-2 gap-1 rounded-lg border border-navy-800 bg-navy-900 p-1">
            {PHASES.map(p => (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={phase === p.key}
                onClick={() => setPhase(p.key)}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  phase === p.key ? 'bg-teal-600 text-white' : 'text-navy-300 hover:text-navy-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'pair' && (
        <div>
          <p className="label">Upload method</p>
          <div role="radiogroup" aria-label="Upload method" className="grid grid-cols-2 gap-1 rounded-lg border border-navy-800 bg-navy-900 p-1">
            {ENTRIES.map(en => (
              <button
                key={en.key}
                type="button"
                role="radio"
                aria-checked={entry === en.key}
                onClick={() => setEntry(en.key)}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  entry === en.key ? 'bg-teal-600 text-white' : 'text-navy-300 hover:text-navy-100'
                }`}
              >
                {en.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'single' && (
        <WatermarkedPhotoPicker
          label={phase === 'before' ? 'Before photo' : 'After photo'}
          downloadName={`masbling-astar-${phase}.jpg`}
          photo={singlePhoto}
          onChange={setSinglePhoto}
        />
      )}

      {mode === 'pair' && entry === 'pairs' && (
        <div className="grid gap-4 md:grid-cols-2">
          <WatermarkedPhotoPicker
            label="Before photo"
            downloadName="masbling-astar-before.jpg"
            photo={beforePhoto}
            onChange={setBeforePhoto}
          />
          <WatermarkedPhotoPicker
            label="After photo"
            downloadName="masbling-astar-after.jpg"
            photo={afterPhoto}
            onChange={setAfterPhoto}
          />
        </div>
      )}

      {usingBatch && <BatchPhotoPicker photos={batch} onChange={setBatch} />}

      <div>
        <label className="label" htmlFor="project-title">Project title</label>
        <input
          id="project-title"
          className="input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Smith family gutter clean-out"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="project-service">Service type</label>
          <select id="project-service" className="input" value={selectedKey} onChange={e => setServiceKey(e.target.value)}>
            {activeServices.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="project-city">City</label>
          <input
            id="project-city"
            list="project-cities"
            className="input"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Brampton"
          />
          <datalist id="project-cities">
            {PROJECT_CITIES.map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {error && <p className="text-xs text-error-300">{error}</p>}
      {saved && (
        <p className="flex items-center gap-1.5 text-xs text-success-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Saved. It is now live in Recent Projects.
        </p>
      )}

      <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : publishLabel()}
      </button>
    </form>
  );
}
