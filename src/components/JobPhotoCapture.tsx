import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, X } from 'lucide-react';
import { useData } from '@/lib/data';
import { uploadJobPhoto } from '@/lib/job-photos';
import { watermarkPhoto } from '@/lib/watermark';

type Phase = 'before' | 'after';

const PHASES: { key: Phase; label: string }[] = [
  { key: 'before', label: 'Before' },
  { key: 'after', label: 'After' },
];

interface Preview {
  url: string;
  blob: Blob;
}

export default function JobPhotoCapture({ jobId }: { jobId: string }) {
  const { photos, addJobPhoto } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobPhotos = photos.filter(p => p.job_id === jobId);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setSaved(false);
    setProcessing(true);
    try {
      const blob = await watermarkPhoto(file);
      setPreview({ url: URL.createObjectURL(blob), blob });
      setPhase(null);
    } catch (err) {
      console.error('Photo watermarking failed:', err);
      setError('That photo could not be prepared. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const discardPreview = () => {
    setPreview(null);
    setPhase(null);
  };

  const handleSave = async () => {
    if (!preview || !phase) return;
    setSaving(true);
    setError(null);
    try {
      const url = await uploadJobPhoto(jobId, preview.blob);
      const label = PHASES.find(p => p.key === phase)?.label ?? '';
      await addJobPhoto({ job_id: jobId, photo_url: url, caption: label, phase });
      setPreview(null);
      setPhase(null);
      setSaved(true);
    } catch (err) {
      console.error('Job photo save failed:', err);
      setError('The photo could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-navy-100 flex items-center gap-1.5 mb-3">
        <Camera className="w-4 h-4" /> Job Site Photos
      </h3>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      {preview ? (
        <div className="space-y-3 animate-fade-in">
          <div className="relative rounded-xl overflow-hidden">
            <img src={preview.url} alt="Watermarked job site photo ready to save" className="w-full rounded-xl" />
            <button
              type="button"
              onClick={discardPreview}
              aria-label="Discard photo"
              className="absolute top-2 right-2 btn-ghost p-1.5 bg-navy-950/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-navy-200 mb-1.5">Is this a before or after photo?</p>
            <div role="radiogroup" aria-label="Photo phase" className="grid grid-cols-2 gap-1 rounded-lg border border-navy-800 bg-navy-900 p-1">
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

          <button
            type="button"
            onClick={handleSave}
            disabled={!phase || saving}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save photo to job'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-8 transition-all disabled:opacity-60"
        >
          {processing ? (
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
          ) : (
            <Camera className="w-8 h-8 text-navy-500" />
          )}
          <p className="text-sm text-navy-300">{processing ? 'Preparing photo...' : 'Tap to capture photo'}</p>
          <p className="text-[10px] text-navy-500">Watermarked automatically before saving</p>
        </button>
      )}

      {saved && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-success-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Photo saved to this job
        </p>
      )}
      {error && <p className="mt-3 text-xs text-error-300 text-center">{error}</p>}

      {jobPhotos.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-navy-300 mb-2">Saved photos ({jobPhotos.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {jobPhotos.map(p => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-navy-800">
                <img src={p.photo_url} alt={p.caption || 'Job photo'} loading="lazy" className="w-full h-full object-cover" />
                {p.phase && (
                  <span className="absolute bottom-1 left-1 rounded bg-navy-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-navy-100">
                    {p.phase === 'before' ? 'Before' : 'After'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
