import { useEffect, useRef, useState } from 'react';
import { Camera, Download, Film, ImagePlus, Loader2, Video, X } from 'lucide-react';
import { watermarkPhoto, LOGO_SRC } from '@/lib/watermark';

export interface WatermarkedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
  phase: 'before' | 'after';
  kind: 'photo' | 'video';
  capturedAt: string;
}

interface WatermarkedMultiPhotoPickerProps {
  label: string;
  photos: WatermarkedPhoto[];
  onChange: (photos: WatermarkedPhoto[]) => void;
  phase?: 'before' | 'after';
  filePrefix?: string;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mediaExt(p: WatermarkedPhoto) {
  if (p.kind === 'video') {
    const sub = p.blob.type.split('/')[1]?.toLowerCase() || 'mp4';
    return sub === 'quicktime' ? 'mov' : sub;
  }
  return 'jpg';
}

export default function WatermarkedMultiPhotoPicker({ label, photos, onChange, phase = 'before', filePrefix = 'masbling-astar' }: WatermarkedMultiPhotoPickerProps) {
  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);
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
        const isVideo = file.type.startsWith('video/');
        const blob = isVideo ? file : await watermarkPhoto(file);
        added.push({
          id: makeId(),
          blob,
          previewUrl: URL.createObjectURL(blob),
          phase,
          kind: isVideo ? 'video' : 'photo',
          capturedAt: new Date().toISOString(),
        });
      }
      if (added.length > 0) onChange([...photos, ...added]);
    } catch (err) {
      console.error('Media preparation failed:', err);
      setError('Some files could not be prepared. Please try again.');
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
      a.download = `${filePrefix}-${phaseWord(p.phase)}-${i + 1}.${mediaExt(p)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  return (
    <div className="space-y-2">
      <p className="label">{label}</p>
      <input ref={cameraPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={cameraVideoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={libraryRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFile} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => cameraPhotoRef.current?.click()}
          disabled={processing}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-4 transition-all disabled:opacity-60"
        >
          {processing ? <Loader2 className="w-5 h-5 text-gold-400 animate-spin" /> : <Camera className="w-5 h-5 text-navy-400" />}
          <span className="text-xs font-semibold text-navy-200">Take Photo</span>
        </button>
        <button
          type="button"
          onClick={() => cameraVideoRef.current?.click()}
          disabled={processing}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-4 transition-all disabled:opacity-60"
        >
          {processing ? <Loader2 className="w-5 h-5 text-gold-400 animate-spin" /> : <Video className="w-5 h-5 text-navy-400" />}
          <span className="text-xs font-semibold text-navy-200">Record Video</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => libraryRef.current?.click()}
        disabled={processing}
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-4 w-full transition-all disabled:opacity-60"
      >
        <ImagePlus className="w-5 h-5 text-navy-400" />
        <span className="text-xs font-semibold text-navy-200">From library</span>
      </button>

      {photos.length > 0 && (
        <div className="space-y-2">
          {photos.map((p, i) => p.kind === 'video' ? (
            <div key={p.id} className="rounded-xl bg-navy-900/70 p-2 space-y-2 animate-fade-in">
              <div className="relative rounded-lg overflow-hidden bg-navy-950">
                <video src={p.previewUrl} controls playsInline preload="metadata" className="w-full aspect-video" />
                <img src={LOGO_SRC} alt="Masbling Astar Services logo" className="absolute top-2 right-2 h-9 w-9 rounded-full bg-navy-950/70 object-contain p-0.5" />
              </div>
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-gold-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-navy-100 truncate">{label} {i + 1} (video)</p>
                  <p className="text-[10px] text-navy-400">{new Date(p.capturedAt).toLocaleString()}</p>
                </div>
                <a href={p.previewUrl} download={`${filePrefix}-${phaseWord(p.phase)}-${i + 1}.${mediaExt(p)}`} className="btn-ghost p-1.5" aria-label={`Download ${label} ${i + 1}`}>
                  <Download className="w-4 h-4 text-navy-300" />
                </a>
                <button type="button" onClick={() => removePhoto(p.id)} className="btn-ghost p-1.5" aria-label={`Remove ${label} ${i + 1}`}>
                  <X className="w-4 h-4 text-navy-300" />
                </button>
              </div>
            </div>
          ) : (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-navy-900/70 p-2 animate-fade-in">
              <img src={p.previewUrl} alt={`${label} ${i + 1}`} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-navy-100 truncate">{label} {i + 1}</p>
                <p className="text-[10px] text-navy-400">{new Date(p.capturedAt).toLocaleString()}</p>
              </div>
              <a href={p.previewUrl} download={`${filePrefix}-${phaseWord(p.phase)}-${i + 1}.${mediaExt(p)}`} className="btn-ghost p-1.5" aria-label={`Download ${label} ${i + 1}`}>
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
      <p className="text-[10px] text-navy-500">Photos get the logo watermark automatically; videos get a logo badge on the preview.</p>
      {error && <p className="text-xs text-error-300">{error}</p>}
    </div>
  );
}

function phaseWord(phase: string) {
  return phase === 'after' ? 'after' : 'before';
}
