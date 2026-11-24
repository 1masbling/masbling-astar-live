import { useEffect, useRef, useState } from 'react';
import { Camera, Download, ImagePlus, Loader2, X } from 'lucide-react';
import { watermarkPhoto } from '@/lib/watermark';

export interface WatermarkedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
  phase: 'before' | 'after';
  capturedAt: string;
}

interface WatermarkedMultiPhotoPickerProps {
  label: string;
  photos: WatermarkedPhoto[];
  onChange: (photos: WatermarkedPhoto[]) => void;
  filePrefix?: string;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function WatermarkedMultiPhotoPicker({ label, photos, onChange, filePrefix = 'masbling-astar' }: WatermarkedMultiPhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => photos.forEach(p => URL.revokeObjectURL(p.previewUrl)), [photos]);

  const addFiles = async (files: FileList) => {
    setError(null);
    setProcessing(true);
    const added: WatermarkedPhoto[] = [];
    try {
      for (const file of Array.from(files)) {
        const blob = await watermarkPhoto(file);
        added.push({
          id: makeId(),
          blob,
          previewUrl: URL.createObjectURL(blob),
          phase: 'before',
          capturedAt: new Date().toISOString(),
        });
      }
      if (added.length > 0) onChange([...photos, ...added]);
    } catch (err) {
      console.error('Photo watermarking failed:', err);
      setError('Some photos could not be prepared. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const removePhoto = (id: string) => {
    const target = photos.find(p => p.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(photos.filter(p => p.id !== id));
  };

  const downloadAll = () => {
    photos.forEach((p, i) => {
      const a = document.createElement('a');
      a.href = p.previewUrl;
      a.download = `${filePrefix}-${phaseWord(p.phase)}-${i + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  return (
    <div className="space-y-2">
      <p className="label">{label}</p>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFile} />
      <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={processing}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-4 transition-all disabled:opacity-60"
        >
          {processing ? <Loader2 className="w-5 h-5 text-gold-400 animate-spin" /> : <Camera className="w-5 h-5 text-navy-400" />}
          <span className="text-xs font-semibold text-navy-200">Take photo</span>
        </button>
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          disabled={processing}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-4 transition-all disabled:opacity-60"
        >
          <ImagePlus className="w-5 h-5 text-navy-400" />
          <span className="text-xs font-semibold text-navy-200">From library</span>
        </button>
      </div>

      {photos.length > 0 && (
        <div className="space-y-2">
          {photos.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-navy-900/70 p-2 animate-fade-in">
              <img src={p.previewUrl} alt={`${label} ${i + 1}`} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-navy-100 truncate">{label} {i + 1}</p>
                <p className="text-[10px] text-navy-400">{new Date(p.capturedAt).toLocaleString()}</p>
              </div>
              <a href={p.previewUrl} download={`${filePrefix}-${phaseWord(p.phase)}-${i + 1}.jpg`} className="btn-ghost p-1.5" aria-label={`Download ${label} ${i + 1}`}>
                <Download className="w-4 h-4 text-navy-300" />
              </a>
              <button type="button" onClick={() => removePhoto(p.id)} className="btn-ghost p-1.5" aria-label={`Remove ${label} ${i + 1}`}>
                <X className="w-4 h-4 text-navy-300" />
              </button>
            </div>
          ))}
          <button type="button" onClick={downloadAll} className="btn-secondary w-full text-xs">
            <Download className="w-4 h-4" /> Download All ({photos.length})
          </button>
        </div>
      )}
      <p className="text-[10px] text-navy-500">Logo watermark is added automatically to every photo.</p>
      {error && <p className="text-xs text-error-300">{error}</p>}
    </div>
  );
}

function phaseWord(phase: string) {
  return phase === 'after' ? 'after' : 'before';
}
