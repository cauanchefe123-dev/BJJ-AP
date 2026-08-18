/**
 * Utility to compress images (File, Data URL, or Blob) to lightweight Data URLs (~15KB - 40KB JPEG).
 * Prevents localStorage quota errors, Firestore document size limit errors (1MB max), and browser crashes.
 */
export async function compressImage(
  input: File | string,
  maxWidth = 350,
  maxHeight = 350,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    if (!input) {
      resolve('');
      return;
    }

    const processDataUrl = (dataUrl: string) => {
      // If it's already small or an SVG, return directly
      if (!dataUrl || dataUrl.startsWith('data:image/svg+xml') || dataUrl.length < 20000) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl.length > 300000 ? dataUrl.slice(0, 300000) : dataUrl);
            return;
          }

          // Fill white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          console.warn('[imageCompressor] Fallback due to error:', err);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        console.warn('[imageCompressor] Failed to load image element');
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    if (typeof input === 'string') {
      processDataUrl(input);
    } else {
      const reader = new FileReader();
      reader.onerror = () => resolve('');
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          processDataUrl(result);
        } else {
          resolve('');
        }
      };
      reader.readAsDataURL(input);
    }
  });
}
