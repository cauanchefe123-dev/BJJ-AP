/**
 * Utility to compress images (File, Data URL, or Blob) to lightweight Data URLs (~20KB - 350KB JPEG).
 * Prevents localStorage quota errors, Firestore document size limit errors (1MB max), and browser crashes,
 * while keeping high visual fidelity.
 */
export async function compressImage(
  input: File | Blob | string,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    if (!input) {
      resolve('');
      return;
    }

    const processDataUrl = (dataUrl: string) => {
      if (!dataUrl) {
        resolve('');
        return;
      }

      // If it's an SVG, return directly
      if (dataUrl.startsWith('data:image/svg+xml')) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

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
            resolve(dataUrl);
            return;
          }

          // Fill background to avoid black transparency artifacts
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          console.warn('[imageCompressor] Fallback due to canvas error:', err);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        console.warn('[imageCompressor] Image element failed to load dataUrl');
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    if (typeof input === 'string') {
      if (input.startsWith('data:') || input.startsWith('blob:') || input.startsWith('http')) {
        processDataUrl(input);
      } else {
        resolve(input);
      }
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

