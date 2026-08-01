/**
 * Event Broadcaster
 * Publish events to Firebase Realtime Database
 * Frontend listens via useFirebaseRoom hook
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { DomainEvent } from '@/lib/events/core';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

let firebaseApp: any = null;
let database: any = null;

function initFirebase() {
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    database = getDatabase(firebaseApp);
  }
  return database;
}

export async function broadcastEvent(event: DomainEvent): Promise<void> {
  try {
    const db = initFirebase();
    if (!db) {
      console.warn('[Broadcaster] Firebase not configured');
      return;
    }

    // Write event to Firebase realtime database
    // Path: /realtime/{aggregate_type}/{aggregate_id}/events/{event_id}
    const eventPath = `realtime/${event.aggregate_type}/${event.aggregate_id}/events/${event.event_id}`;

    await set(ref(db, eventPath), {
      event_type: event.event_type,
      actor_id: event.actor_id,
      data: event.data,
      occurred_at: event.occurred_at,
      timestamp: Date.now(),
    });

    console.log('[Broadcaster] Firebase event written:', event.event_type, event.aggregate_type, event.aggregate_id);
  } catch (error) {
    console.error('[Broadcaster] Firebase error:', error);
    // Don't throw - broadcasting is non-critical
  }
}
