/**
 * Server-side event system initialization
 * Only runs on API route startup (Node.js environment)
 * NOT called from browser code
 */

import { setupEventSystem } from './setup';

let isInitialized = false;

export function initializeEventSystemOnce(): void {
  if (isInitialized) return;

  try {
    setupEventSystem();
    isInitialized = true;
    console.log('[Events] System initialized');
  } catch (error) {
    console.error('[Events] Initialization failed:', error);
    // Don't throw - allow app to continue without event system
  }
}
