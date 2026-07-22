'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

// There is ONE store, and it lives inside the app on the Store tab
// (MarketplaceDemoPage, activeView === 'store'). This route used to render a
// second, separate store that could not actually complete a purchase — it was
// reachable from Settings > Profile & Skins > Manage ValueSkins.
//
// Kept as a redirect so old links and bookmarks still land somewhere correct.
export default function StoreRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/demo/marketplace?view=store');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A0A',
        color: '#8A867E',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      Opening the Store…
    </div>
  );
}
