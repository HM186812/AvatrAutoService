import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectUploadMimeFromBytes,
  validateUploadFile,
  STORAGE_BUCKET_MAX_BYTES,
} from '../src/utils/fileValidation';

const JPEG_HEADER = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_HEADER = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP_HEADER = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const PDF_HEADER = new TextEncoder().encode('%PDF-1.7\n%sample');

function makeFile(bytes: Uint8Array, type: string, extraSize = 0): File {
  const parts: BlobPart[] = [bytes];
  if (extraSize > 0) parts.push(new Uint8Array(extraSize));
  return new File(parts, 'upload.bin', { type });
}

test('detectUploadMimeFromBytes identifies JPEG, PNG, WebP, and PDF headers only', () => {
  assert.equal(detectUploadMimeFromBytes(JPEG_HEADER), 'image/jpeg');
  assert.equal(detectUploadMimeFromBytes(PNG_HEADER), 'image/png');
  assert.equal(detectUploadMimeFromBytes(WEBP_HEADER), 'image/webp');
  assert.equal(detectUploadMimeFromBytes(PDF_HEADER), 'application/pdf');
  assert.equal(detectUploadMimeFromBytes(new TextEncoder().encode('<svg></svg>')), null);
  assert.equal(detectUploadMimeFromBytes(new TextEncoder().encode('<html>bad</html>')), null);
});

test('validateUploadFile rejects SVG, HTML disguised as PDF/WebP, and mismatched MIME claims', async () => {
  const fakePdf = makeFile(new TextEncoder().encode('<script>alert(1)</script>'), 'application/pdf');
  await assert.rejects(() => validateUploadFile(fakePdf, { allowedMimes: ['application/pdf'] }), /signature/i);

  const fakeWebp = makeFile(new TextEncoder().encode('<html>spoofed</html>'), 'image/webp');
  await assert.rejects(() => validateUploadFile(fakeWebp, { allowedMimes: ['image/webp'] }), /signature/i);

  const svgFile = makeFile(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml');
  await assert.rejects(() => validateUploadFile(svgFile, { allowedMimes: ['image/png', 'image/webp'] }), /allowed/i);

  const pngClaimingPdf = makeFile(PNG_HEADER, 'application/pdf');
  await assert.rejects(
    () => validateUploadFile(pngClaimingPdf, { allowedMimes: ['image/png', 'application/pdf'] }),
    /binary header/i,
  );
});

test('validateUploadFile enforces 5 MB PDF limit while accepting valid signatures', async () => {
  const validPdf = makeFile(PDF_HEADER, 'application/pdf');
  assert.deepEqual(
    await validateUploadFile(validPdf, { allowedMimes: ['application/pdf'] }),
    { mime: 'application/pdf', extension: 'pdf' },
  );

  const oversizedPdf = makeFile(PDF_HEADER, 'application/pdf', STORAGE_BUCKET_MAX_BYTES);
  await assert.rejects(
    () => validateUploadFile(oversizedPdf, { allowedMimes: ['application/pdf'] }),
    /5 MB/i,
  );

  const validJpg = makeFile(JPEG_HEADER, 'image/jpg');
  assert.deepEqual(
    await validateUploadFile(validJpg, { allowedMimes: ['image/jpeg', 'image/png', 'image/webp'] }),
    { mime: 'image/jpeg', extension: 'jpg' },
  );
});
