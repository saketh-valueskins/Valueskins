import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

// Server-side storage client. Uses the service role key when available
// (bypasses storage RLS), otherwise falls back to the anon key.
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_admin) _admin = createClient(url, key);
  return _admin;
}

export async function uploadDealPDF(dealId: string, pdfBuffer: Buffer): Promise<string> {
  const client = getAdmin();
  if (!client) throw new Error('Supabase storage not configured');
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dealId}-${timestamp}.pdf`;
    const filepath = `deals/${dealId}/pdfs/${filename}`;

    const { error } = await client.storage.from('deals').upload(filepath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

    if (error) {
      console.error('Error uploading PDF to Supabase:', error.message);
      throw new Error('Failed to upload PDF');
    }
    return filepath;
  } catch (error) {
    console.error('Error uploading PDF to Supabase:', error);
    throw new Error('Failed to upload PDF');
  }
}

export async function getDealPDFVersions(dealId: string): Promise<Array<{ name: string; path: string; timestamp: string }>> {
  const client = getAdmin();
  if (!client) return [];
  try {
    const { data, error } = await client.storage.from('deals').list(`deals/${dealId}/pdfs`);

    if (error || !data) {
      console.error('Error listing PDFs from Supabase:', error?.message || 'no data');
      return [];
    }

    const versions = data
      .filter((f) => f.name.endsWith('.pdf'))
      .map((f) => {
        const name = f.name;
        const path = `deals/${dealId}/pdfs/${f.name}`;
        // Extract timestamp from filename (format: dealId-YYYY-MM-DDTHH-mm-ss-xxxZ.pdf)
        const matches = name.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
        const timestamp = matches ? matches[0].replace(/T/, ' ').replace(/-/g, ':') : 'Unknown';
        return { name, path, timestamp };
      });

    return versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Error fetching PDF versions from Supabase:', error);
    return [];
  }
}

export async function downloadDealPDF(filepath: string): Promise<Buffer> {
  const client = getAdmin();
  if (!client) throw new Error('Supabase storage not configured');
  try {
    const { data, error } = await client.storage.from('deals').download(filepath);
    if (error || !data) {
      console.error('Error downloading PDF from Supabase:', error?.message || 'no data');
      throw new Error('Failed to download PDF');
    }
    const arrayBuf = await data.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (error) {
    console.error('Error downloading PDF from Supabase:', error);
    throw new Error('Failed to download PDF');
  }
}
