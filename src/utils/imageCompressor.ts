/**
 * Image compression utility to convert images to WebP format with capped dimension and size.
 * Aligned with Storage Optimization Plan 3:
 * - Formats: Convert JPG, PNG, WebP to compressed WebP (quality ~0.8, maxDimension 1200px)
 * - Size target: <= 300 KB
 * - Non-images or PDFs are bypassed safely.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  maxSizeBytes?: number;
}

export async function compressImageToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxDimension = 1200,
    quality = 0.8,
    maxSizeBytes = 300 * 1024, // 300 KB
  } = options;

  // Bypass non-images, SVG, or PDF
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  // If environment does not support canvas or Image (e.g. Node tests without DOM), return original
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  // If already WebP and smaller than maxSizeBytes, no compression needed
  if (file.type === 'image/webp' && file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let { width, height } = img;

        // Downscale while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // If compressed blob is larger than original file and original was already webp/jpeg, keep original
            if (blob.size >= file.size && ['image/webp', 'image/jpeg'].includes(file.type)) {
              resolve(file);
              return;
            }

            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newFileName = `${baseName}.webp`;
            const compressedFile = new File([blob], newFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
