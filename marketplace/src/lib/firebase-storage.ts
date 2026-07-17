import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getBytes, listAll } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

export async function uploadDealPDF(dealId: string, pdfBuffer: Buffer): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dealId}-${timestamp}.pdf`;
    const filepath = `deals/${dealId}/pdfs/${filename}`;

    const storageRef = ref(storage, filepath);
    const metadata = {
      contentType: 'application/pdf',
      customMetadata: {
        dealId,
        generatedAt: new Date().toISOString(),
      },
    };

    await uploadBytes(storageRef, pdfBuffer, metadata);
    return filepath;
  } catch (error) {
    console.error('Error uploading PDF to Firebase:', error);
    throw new Error('Failed to upload PDF');
  }
}

export async function getDealPDFVersions(dealId: string): Promise<Array<{ name: string; path: string; timestamp: string }>> {
  try {
    const folderRef = ref(storage, `deals/${dealId}/pdfs`);
    const result = await listAll(folderRef);

    const versions = result.items.map((item) => {
      const name = item.name;
      const path = item.fullPath;
      // Extract timestamp from filename (format: dealId-YYYY-MM-DDTHH-mm-ss-xxxZ.pdf)
      const matches = name.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      const timestamp = matches ? matches[0].replace(/T/, ' ').replace(/-/g, ':') : 'Unknown';

      return { name, path, timestamp };
    });

    return versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Error fetching PDF versions:', error);
    return [];
  }
}

export async function downloadDealPDF(filepath: string): Promise<Buffer> {
  try {
    const fileRef = ref(storage, filepath);
    const buffer = await getBytes(fileRef);
    return buffer;
  } catch (error) {
    console.error('Error downloading PDF from Firebase:', error);
    throw new Error('Failed to download PDF');
  }
}
