import { useEffect, useRef, useState } from 'react';
import { Camera, Download, ImagePlus, Loader2, X } from 'lucide-react';
import { watermarkPhoto } from '@/lib/watermark';

interface WatermarkedPhotoPickerProps {
  label: string;
  downloadName: string;
  photo: Blob | null;
  onChange: (photo: Blob | null) => void;
}

export default function WatermarkedPhotoPicker({ label, downloadName, photo, onChange }: WatermarkedPhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      onChange(await watermarkPhoto(file));
    } catch (err) {
      console.error('Photo watermarking failed:', err);
      setError('That photo could not be prepared. Please try another.');
    } finally {
      setProcessing(false);
    }
  };

  const shownPreview = photo ? previewUrl : null;

  return (
    <div className="space-y-2">
      <p className="label">{label}</p>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {shownPreview ? (
        <div className="space-y-2 animate-fade-in">
          <div className="relative overflow-hidden rounded-xl bg-navy-950">
            <img src={shownPreview} alt={`${label} preview`} className="w-full max-h-72 object-contain" />
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Remove ${label.toLowerCase()} photo`}
              className="absolute top-2 right-2 btn-ghost p-1.5 bg-navy-950/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <a
            href={shownPreview}
            download={downloadName}
            className="btn-secondary w-full text-xs"
          >
            <Download className="w-4 h-4" /> Download Watermarked Photo
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={processing}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-5 transition-all disabled:opacity-60"
          >
            {processing ? <Loader2 className="w-6 h-6 text-gold-400 animate-spin" /> : <Camera className="w-6 h-6 text-navy-400" />}
            <span className="text-xs font-semibold text-navy-200">Take photo</span>
          </button>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            disabled={processing}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-5 transition-all disabled:opacity-60"
          >
            <ImagePlus className="w-6 h-6 text-navy-400" />
            <span className="text-xs font-semibold text-navy-200">From library</span>
          </button>
        </div>
      )}
      <p className="text-[10px] text-navy-500">Logo watermark is added automatically.</p>
      {error && <p className="text-xs text-error-300">{error}</p>}
    </div>
  );
}
