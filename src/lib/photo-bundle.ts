import JSZip from 'jszip';

export interface BundledPhoto {
  name: string;
  blob: Blob;
}

export type BundleOutcome = 'shared' | 'downloaded' | 'cancelled';

const URL_REVOKE_DELAY_MS = 60_000;

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), URL_REVOKE_DELAY_MS);
}

export async function fetchPhotoBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Photo request failed (${response.status})`);
  return response.blob();
}

export async function downloadZip(photos: BundledPhoto[], zipName: string) {
  const zip = new JSZip();
  for (const photo of photos) zip.file(photo.name, photo.blob);
  downloadBlob(await zip.generateAsync({ type: 'blob' }), zipName);
}

function canShareFiles(files: File[]): boolean {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

export async function shareOrDownloadZip(photos: BundledPhoto[], zipName: string): Promise<BundleOutcome> {
  const files = photos.map(p => new File([p.blob], p.name, { type: p.blob.type || 'image/jpeg' }));
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title: 'Masbling Astar Services photos' });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      console.error('Native share failed, falling back to ZIP:', err);
    }
  }
  await downloadZip(photos, zipName);
  return 'downloaded';
}
