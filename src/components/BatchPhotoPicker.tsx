import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, Download, ImagePlus, Loader2, X } from 'lucide-react';
import { watermarkPhoto } from '@/lib/watermark';

export interface BatchPhoto {
  id: string;
  blob: Blob;
}

interface BatchPhotoPickerProps {
  photos: BatchPhoto[];
  onChange: Dispatch<SetStateAction<BatchPhoto[]>>;
}

function batchPairLabel(index: number) {
  const pair = Math.floor(index / 2) + 1;
  const role = index % 2 === 0 ? 'Before' : 'After';
  return { pair, role };
}

function batchDownloadName(index: number) {
  const { pair, role } = batchPairLabel(index);
  return `masbling-astar-pair-${pair}-${role.toLowerCase()}.jpg`;
}

const DOWNLOAD_GAP_MS = 350;
const URL_REVOKE_DELAY_MS = 60_000;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), URL_REVOKE_DELAY_MS);
}

function BatchThumb({ blob, alt }: { blob: Blob; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url ? <img src={url} alt={alt} className="w-full h-full object-cover" /> : null;
}

export default function BatchPhotoPicker({ photos, onChange }: BatchPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    setProcessing(true);
    try {
      const added: BatchPhoto[] = [];
      for (const file of files) {
        added.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, blob: await watermarkPhoto(file) });
      }
      onChange(prev => [...prev, ...added]);
    } catch (err) {
      console.error('Batch photo watermarking failed:', err);
      setError('One of the photos could not be prepared. Please select them again.');
    } finally {
      setProcessing(false);
    }
  };

  const move = (index: number, delta: number) => {
    onChange(prev => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (id: string) => onChange(prev => prev.filter(p => p.id !== id));

  const downloadAll = async () => {
    for (let i = 0; i < photos.length; i++) {
      saveBlob(photos[i].blob, batchDownloadName(i));
      await new Promise(resolve => setTimeout(resolve, DOWNLOAD_GAP_MS));
    }
  };

  const pairCount = Math.floor(photos.length / 2);

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-600 hover:border-gold-500/50 py-8 transition-all disabled:opacity-60"
        >
          {processing ? <Loader2 className="w-6 h-6 text-gold-400 animate-spin" /> : <ImagePlus className="w-6 h-6 text-navy-400" />}
          <span className="text-xs font-semibold text-navy-200">Select Multiple Photos in Order</span>
          <span className="text-[10px] text-navy-500">Photo 1 is Before #1, photo 2 is After #1, and so on</span>
        </button>
      ) : (
        <>
          <p className="text-xs text-navy-300">
            {photos.length} photo{photos.length === 1 ? '' : 's'} selected, {pairCount} pair{pairCount === 1 ? '' : 's'}.
            Use the arrows to fix the order if needed.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo, index) => {
              const { pair, role } = batchPairLabel(index);
              const isFirst = index === 0;
              const isLast = index === photos.length - 1;
              return (
                <div key={photo.id} className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900 animate-fade-in">
                  <div className="relative aspect-square bg-navy-950">
                    <BatchThumb blob={photo.blob} alt={`${role} ${pair} photo`} />
                    <span className="absolute left-2 top-2 rounded-md bg-navy-950/85 px-2 py-0.5 text-[10px] font-semibold text-gold-300">
                      {role} {pair}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(photo.id)}
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute right-2 top-2 btn-ghost p-1 bg-navy-950/85"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1 p-1.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={isFirst}
                      aria-label={`Move photo ${index + 1} earlier`}
                      className="btn-ghost p-1.5 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => saveBlob(photo.blob, batchDownloadName(index))}
                      aria-label={`Download photo ${index + 1}`}
                      className="btn-ghost p-1.5"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={isLast}
                      aria-label={`Move photo ${index + 1} later`}
                      className="btn-ghost p-1.5 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={processing}
              className="btn-secondary text-xs disabled:opacity-60"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Add more
            </button>
            <button type="button" onClick={downloadAll} className="btn-secondary text-xs">
              <Download className="w-4 h-4" /> Download All Watermarked Photos
            </button>
          </div>
        </>
      )}

      <p className="text-[10px] text-navy-500">Logo watermark is added automatically to every photo.</p>
      {error && <p className="text-xs text-error-300">{error}</p>}
    </div>
  );
}
