'use client';

/**
 * Shrink a photo in the browser before upload. iPhone photos are 5–15MB
 * (often HEIC); uploading them raw over cellular can blow the server's time
 * budget and lose the message. Re-encoding via <canvas> to a bounded-size
 * JPEG makes the upload tiny AND converts HEIC → JPEG (Safari decodes HEIC
 * natively into the <img>, and we export JPEG), which Gemini reads reliably.
 *
 * Best-effort: if anything fails (decode error, no canvas), the original file
 * is returned so the send still goes through.
 */
export async function downscaleImage(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode failed'));
      img.src = url;
    });

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1, maxDim / longest);
    // Already small and modestly sized? Leave it be.
    if (scale === 1 && file.size < 1_000_000) return file;

    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
