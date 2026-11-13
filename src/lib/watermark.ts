export const LOGO_SRC = '/0.png';
const LOGO_OPACITY = 0.15;
const LOGO_WIDTH_RATIO = 0.22;
const MARGIN_RATIO = 0.03;
const OUTPUT_QUALITY = 0.92;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image could not be loaded'));
    img.src = src;
  });
}

export async function watermarkPhoto(file: File): Promise<Blob> {
  const photoUrl = URL.createObjectURL(file);
  try {
    const [photo, logo] = await Promise.all([loadImage(photoUrl), loadImage(LOGO_SRC)]);

    const width = photo.naturalWidth;
    const height = photo.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(photo, 0, 0, width, height);

    const shortSide = Math.min(width, height);
    const logoWidth = Math.round(shortSide * LOGO_WIDTH_RATIO);
    const logoHeight = Math.round((logo.naturalHeight / logo.naturalWidth) * logoWidth);
    const margin = Math.round(shortSide * MARGIN_RATIO);

    ctx.globalAlpha = LOGO_OPACITY;
    ctx.drawImage(logo, width - logoWidth - margin, height - logoHeight - margin, logoWidth, logoHeight);
    ctx.globalAlpha = 1;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Watermarked image could not be created'))),
        'image/jpeg',
        OUTPUT_QUALITY,
      );
    });
  } finally {
    URL.revokeObjectURL(photoUrl);
  }
}
