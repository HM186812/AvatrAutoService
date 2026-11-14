export type ValidUploadMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export const STORAGE_BUCKET_MAX_BYTES = 5 * 1024 * 1024;
export const MAX_PRECOMPRESSION_IMAGE_BYTES = 10 * 1024 * 1024;

const MIME_TO_EXTENSION: Record<ValidUploadMime, 'jpg' | 'png' | 'webp' | 'pdf'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function matchesPrefix(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

/** Detect an allowed image or PDF MIME type strictly from its leading magic bytes. */
export function detectUploadMimeFromBytes(bytes: Uint8Array): ValidUploadMime | null {
  if (matchesPrefix(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (matchesPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (
    matchesPrefix(bytes, [0x52, 0x49, 0x46, 0x46], 0) &&
    matchesPrefix(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  if (matchesPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  return null;
}

export function normalizeDeclaredMime(rawType?: string | null): string {
  const normalized = (rawType || '').trim().toLowerCase().split(';')[0];
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

export interface ValidateUploadOptions {
  allowedMimes: readonly ValidUploadMime[];
  maxImageBytes?: number;
  maxPdfBytes?: number;
}

export interface ValidatedUploadInfo {
  mime: ValidUploadMime;
  extension: 'jpg' | 'png' | 'webp' | 'pdf';
}

/**
 * Verify file magic bytes, MIME consistency, and bucket-safe size limits before compression or upload.
 * Rejects spoofed extensions, SVG payloads, and empty/oversized files.
 */
export async function validateUploadFile(
  file: Pick<Blob, 'size' | 'slice'> & { type?: string },
  options: ValidateUploadOptions
): Promise<ValidatedUploadInfo> {
  if (!file || file.size <= 0) {
    throw new Error('Uploaded file is empty.');
  }

  const declared = normalizeDeclaredMime(file.type);
  if (declared && !options.allowedMimes.includes(declared as ValidUploadMime)) {
    throw new Error(
      options.allowedMimes.includes('application/pdf')
        ? 'Only JPG, PNG, WebP, or PDF files are allowed.'
        : 'Only JPG, PNG, or WebP images are allowed.'
    );
  }

  const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectUploadMimeFromBytes(headerBytes);
  if (!detected || !options.allowedMimes.includes(detected)) {
    throw new Error('File contents do not match an allowed JPG, PNG, WebP, or PDF signature.');
  }

  if (declared && declared !== detected) {
    throw new Error('File extension/MIME type does not match its actual binary header.');
  }

  const maxPdfBytes = options.maxPdfBytes ?? STORAGE_BUCKET_MAX_BYTES;
  const maxImageBytes = options.maxImageBytes ?? MAX_PRECOMPRESSION_IMAGE_BYTES;
  if (detected === 'application/pdf' && file.size > maxPdfBytes) {
    throw new Error('PDF payment slips must be 5 MB or smaller.');
  }
  if (detected !== 'application/pdf' && file.size > maxImageBytes) {
    throw new Error('Image files must be 10 MB or smaller before compression.');
  }

  return {
    mime: detected,
    extension: MIME_TO_EXTENSION[detected],
  };
}
