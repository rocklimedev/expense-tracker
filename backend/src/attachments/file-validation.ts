import { BadRequestException } from '@nestjs/common';

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENTS_PER_EXPENSE = 10;

export interface DetectedFile {
  ext: string;
  mime: string;
}

/** Detects the real type from the file's leading bytes. Client MIME types are not trusted. */
export function detectFileType(buf: Buffer): DetectedFile {
  const head = (n: number) => buf.subarray(0, n);

  if (buf.length >= 3 && head(3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  if (
    buf.length >= 8 &&
    head(8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (
    buf.length >= 12 &&
    head(4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  if (buf.length >= 4 && head(4).toString('ascii') === '%PDF') {
    return { ext: 'pdf', mime: 'application/pdf' };
  }
  throw new BadRequestException('Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF');
}

export function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/^.*[\\/]/, '') // strip any path
      .replace(/[\x00-\x1f\x7f]/g, '') // strip control characters
      .slice(0, 200) || 'file'
  );
}
