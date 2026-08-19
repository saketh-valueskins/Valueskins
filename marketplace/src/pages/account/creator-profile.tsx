'use client';
import Head from 'next/head';
import CreatorProfile from '@/features/profiles/CreatorProfile';

// Standalone route for the Creator Profile Preferences editor
// (ui-specs/Creator Profile Preferences.md). Inside the app the editor renders
// as a Settings pane; this route exists so direct links and the non-embedded
// Settings hub have somewhere real to land.
export default function CreatorProfilePreferencesPage() {
  return (
    <>
      <Head><title>Creator Profile Preferences · ValueSkins</title></Head>
      <CreatorProfile />
    </>
  );
}
