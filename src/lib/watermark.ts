export const LOGO_SRC = '/0.png';
const LOGO_OPACITY = 0.92;
const LOGO_WIDTH_RATIO = 0.22;
const LOGO_MIN_WIDTH_PX = 180;
const LOGO_RIGHT_RATIO = 0.06;
const LOGO_BOTTOM_RATIO = 0.14;
const PILL_PADDING_RATIO = 0.12;
const PILL_FILL = 'rgba(8, 14, 24, 0.45)';
const PILL_BORDER = 'rgba(255, 255, 255, 0.18)';
const PILL_BLUR_RATIO = 0.008;
const MAX_OUTPUT_WIDTH = 1400;
const OUTPUT_QUALITY = 0.80;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image could not be loaded'));
    img.src = src;
  });
}

function tracePill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
}

export async function watermarkPhoto(file: File): Promise<Blob> {
  const photoUrl = URL.createObjectURL(file);
  try {
    const [photo, logo] = await Promise.all([loadImage(photoUrl), loadImage(LOGO_SRC)]);

    const scale = Math.min(1, MAX_OUTPUT_WIDTH / photo.naturalWidth);
    const width = Math.round(photo.naturalWidth * scale);
    const height = Math.round(photo.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(photo, 0, 0, width, height);

    const logoWidth = Math.max(LOGO_MIN_WIDTH_PX, Math.round(width * LOGO_WIDTH_RATIO));
    const logoHeight = Math.round((logo.naturalHeight / logo.naturalWidth) * logoWidth);
    const padding = Math.round(logoWidth * PILL_PADDING_RATIO);
    const pillWidth = logoWidth + padding * 2;
    const pillHeight = logoHeight + padding * 2;
    const pillRight = width - Math.round(width * LOGO_RIGHT_RATIO);
    const pillBottom = height - Math.round(height * LOGO_BOTTOM_RATIO);
    const pillX = Math.max(0, pillRight - pillWidth);
    const pillY = Math.max(0, pillBottom - pillHeight);
    const shortSide = Math.min(width, height);

    ctx.save();
    tracePill(ctx, pillX, pillY, pillWidth, pillHeight);
    ctx.clip();
    ctx.filter = `blur(${Math.max(4, Math.round(shortSide * PILL_BLUR_RATIO))}px)`;
    ctx.drawImage(photo, 0, 0, width, height);
    ctx.filter = 'none';
    ctx.fillStyle = PILL_FILL;
    ctx.fillRect(pillX, pillY, pillWidth, pillHeight);
    ctx.restore();

    tracePill(ctx, pillX, pillY, pillWidth, pillHeight);
    ctx.lineWidth = Math.max(1, Math.round(shortSide * 0.002));
    ctx.strokeStyle = PILL_BORDER;
    ctx.stroke();

    ctx.globalAlpha = LOGO_OPACITY;
    ctx.drawImage(logo, pillX + padding, pillY + padding, logoWidth, logoHeight);
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
