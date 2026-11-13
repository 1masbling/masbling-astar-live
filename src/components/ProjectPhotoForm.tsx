import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useData } from '@/lib/data';
import { PROJECT_CITIES, saveProjectPhoto } from '@/lib/project-photos';
import WatermarkedPhotoPicker from '@/components/WatermarkedPhotoPicker';

type Phase = 'before' | 'after';

interface ProjectPhotoFormProps {
  mode: 'single' | 'pair';
  onSaved?: () => void;
}

const PHASES: { key: Phase; label: string }[] = [
  { key: 'before', label: 'Before' },
  { key: 'after', label: 'After' },
];

export default function ProjectPhotoForm({ mode, onSaved }: ProjectPhotoFormProps) {
  const { services } = useData();
  const activeServices = services.filter(s => s.active);

  const [title, setTitle] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [city, setCity] = useState('');
  const [phase, setPhase] = useState<Phase>('before');
  const [singlePhoto, setSinglePhoto] = useState<Blob | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<Blob | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedKey = activeServices.some(s => s.key === serviceKey) ? serviceKey : activeServices[0]?.key ?? '';

  const resetPhotos = () => {
    setTitle('');
    setCity('');
    setSinglePhoto(null);
    setBeforePhoto(null);
    setAfterPhoto(null);
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

    let photos: { before?: Blob; after?: Blob };
    if (mode === 'pair') {
      if (!beforePhoto || !afterPhoto) {
        setError('Add both a before and an after photo.');
        return;
      }
      photos = { before: beforePhoto, after: afterPhoto };
    } else {
      if (!singlePhoto) {
        setError('Add a photo first.');
        return;
      }
      photos = phase === 'before' ? { before: singlePhoto } : { after: singlePhoto };
    }

    setSaving(true);
    try {
      await saveProjectPhoto({ title: title.trim(), serviceLabel: service.label, city: city.trim() }, photos);
      resetPhotos();
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error('Project photo save failed:', err);
      setError('The project could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
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

      {mode === 'single' ? (
        <WatermarkedPhotoPicker
          label={phase === 'before' ? 'Before photo' : 'After photo'}
          downloadName={`masbling-astar-${phase}.jpg`}
          photo={singlePhoto}
          onChange={setSinglePhoto}
        />
      ) : (
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
        {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : mode === 'pair' ? 'Publish before & after' : 'Publish to Recent Projects'}
      </button>
    </form>
  );
}
