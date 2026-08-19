/**
 * Render Persistent Disk Storage
 * Stores files on Render's persistent /app/uploads directory
 * Backend handles all file I/O
 */

export interface StorageFile {
  path: string;
  size: number;
  created_at: string;
  updated_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

/**
 * Upload file to Render backend storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  fileData: Buffer | Blob,
  metadata?: Record<string, any>
): Promise<{ path: string; url: string }> {
  try {
    const formData = new FormData();
    formData.append('file', fileData instanceof Buffer ? new Blob([fileData]) : fileData);
    formData.append('path', path);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${API_BASE}/api/storage/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${typeof window === 'undefined' ? process.env.JWT_SECRET : ''}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[RenderStorage] Upload error:', error);
    throw error;
  }
}

/**
 * Download file from Render backend storage
 */
export async function downloadFile(path: string): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE}/api/storage/download?path=${encodeURIComponent(path)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${typeof window === 'undefined' ? process.env.JWT_SECRET : ''}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('[RenderStorage] Download error:', error);
    throw error;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(path: string): Promise<StorageFile | null> {
  try {
    const response = await fetch(`${API_BASE}/api/storage/metadata?path=${encodeURIComponent(path)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${typeof window === 'undefined' ? process.env.JWT_SECRET : ''}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[RenderStorage] Metadata error:', error);
    return null;
  }
}

/**
 * List files in directory
 */
export async function listFiles(directory: string): Promise<StorageFile[]> {
  try {
    const response = await fetch(`${API_BASE}/api/storage/list?dir=${encodeURIComponent(directory)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${typeof window === 'undefined' ? process.env.JWT_SECRET : ''}`,
      },
    });

    if (!response.ok) {
      throw new Error(`List failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[RenderStorage] List error:', error);
    return [];
  }
}

/**
 * Delete file
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/storage/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${typeof window === 'undefined' ? process.env.JWT_SECRET : ''}`,
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[RenderStorage] Delete error:', error);
    throw error;
  }
}

/**
 * Upload deal PDF (convenience wrapper)
 */
export async function uploadDealPDF(dealId: number, pdfBuffer: Buffer, fileName: string): Promise<string> {
  const path = `deals/${dealId}/${fileName}`;
  const result = await uploadFile('pdfs', path, pdfBuffer, {
    deal_id: dealId,
    original_filename: fileName,
    uploaded_at: new Date().toISOString(),
  });
  return result.path;
}

/**
 * Get deal PDF versions (convenience wrapper)
 */
export async function getDealPDFVersions(dealId: number): Promise<StorageFile[]> {
  return listFiles(`deals/${dealId}`);
}

/**
 * Download deal PDF (convenience wrapper)
 */
export async function downloadDealPDF(path: string): Promise<Blob> {
  return downloadFile(path);
}
