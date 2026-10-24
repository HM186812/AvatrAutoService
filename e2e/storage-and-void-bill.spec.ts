import { test, expect } from '@playwright/test';

test.describe('Storage Strategy Plan 3 & Void Bill Soft-Delete', () => {
  test('compressImageToWebP compresses images to WebP <= 300KB in browser', async ({ page }) => {
    await page.goto('/');

    // Evaluate compression directly in browser environment where canvas API exists
    const result = await page.evaluate(async () => {
      // Create a test 2000x2000 large canvas to generate a heavy PNG
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 2000;
      const ctx = canvas.getContext('2d')!;
      // Draw gradient and noise to produce non-trivial payload
      const grad = ctx.createLinearGradient(0, 0, 2000, 2000);
      grad.addColorStop(0, '#ff0055');
      grad.addColorStop(0.5, '#00ffff');
      grad.addColorStop(1, '#ffaa00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2000, 2000);

      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
      const largeFile = new File([blob], 'heavy-car-photo.png', { type: 'image/png' });

      // Import compressor module dynamically in browser
      const { compressImageToWebP } = await import('/src/utils/imageCompressor.ts');
      const compressed = await compressImageToWebP(largeFile, {
        maxDimension: 1200,
        quality: 0.8,
        maxSizeBytes: 300 * 1024,
      });

      return {
        originalSize: largeFile.size,
        originalType: largeFile.type,
        compressedSize: compressed.size,
        compressedType: compressed.type,
        compressedName: compressed.name,
      };
    });

    expect(result.originalSize).toBeGreaterThan(100 * 1024);
    expect(result.compressedType).toBe('image/webp');
    expect(result.compressedName).toBe('heavy-car-photo.webp');
    // Ensure WebP is under 300 KB budget
    expect(result.compressedSize).toBeLessThanOrEqual(300 * 1024);
  });

  test('non-image files pass through compressImageToWebP untouched', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const pdfBlob = new Blob(['%PDF-1.4 test stream content'], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'sample-contract.pdf', { type: 'application/pdf' });

      const { compressImageToWebP } = await import('/src/utils/imageCompressor.ts');
      const processed = await compressImageToWebP(pdfFile);

      return {
        size: processed.size,
        type: processed.type,
        name: processed.name,
      };
    });

    expect(result.type).toBe('application/pdf');
    expect(result.name).toBe('sample-contract.pdf');
  });
});
