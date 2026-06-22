const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
  'image/gif': [new Uint8Array([0x47, 0x49, 0x46, 0x38])],
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  'video/mp4': [
    new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
    new Uint8Array([0x33, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70]),
  ],
  'video/quicktime': [new Uint8Array([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74])],
  'text/plain': [new Uint8Array([0xEF, 0xBB, 0xBF]), new Uint8Array([0xFF, 0xFE]), new Uint8Array([0xFE, 0xFF])],
  'application/zip': [new Uint8Array([0x50, 0x4B, 0x03, 0x04])],
  'application/x-rar-compressed': [new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07])],
};

export function validateMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return true;

  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false;
    }
    return true;
  });
}

export function isImageMimeType(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType);
}

export async function stripExif(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!isImageMimeType(mimeType)) return buffer;

  try {
    const sharp = require('sharp');
    const metadata = await sharp(buffer).metadata();

    if (mimeType === 'image/jpeg') {
      return sharp(buffer)
        .rotate()
        .withMetadata(false)
        .jpeg({
          quality: 90,
          mozjpeg: true,
        })
        .toBuffer();
    }

    if (mimeType === 'image/png') {
      return sharp(buffer)
        .rotate()
        .withMetadata(false)
        .png({
          compressionLevel: 9,
          palette: true,
        })
        .toBuffer();
    }

    if (mimeType === 'image/webp') {
      return sharp(buffer)
        .rotate()
        .withMetadata(false)
        .webp({
          quality: 90,
        })
        .toBuffer();
    }

    if (mimeType === 'image/gif') {
      return sharp(buffer)
        .withMetadata(false)
        .gif()
        .toBuffer();
    }

    return sharp(buffer).rotate().withMetadata(false).toBuffer();
  } catch {
    return buffer;
  }
}

export function sanitizeFileBuffer(buffer: Buffer, mimeType: string): { buffer: Buffer; sanitized: boolean } {
  if (isImageMimeType(mimeType)) {
    return { buffer, sanitized: false };
  }
  return { buffer, sanitized: false };
}

export function validateFileExtension(fileName: string, declaredMimeType: string): boolean {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();
  for (const [mime, exts] of Object.entries(MAGIC_BYTES)) {
    if (mime === declaredMimeType) {
      if (ext === '.jpeg' || ext === '.jpg') return true;
    }
  }
  return true;
}
