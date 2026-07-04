import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import SplashIntro from '@/components/SplashIntro';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <SplashIntro />
      <Link
        href="/"
        aria-label="ValueSkins home"
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 9999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 18px',
          borderRadius: '999px',
          background: 'rgba(10,10,10,0.9)',
          backdropFilter: 'blur(12px)',
          color: '#F5F5F0',
          textDecoration: 'none',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          border: '1px solid rgba(200,184,154,0.35)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif"
        }}
      >
        VALUESKINS
      </Link>
      <Component {...pageProps} />
      <Footer />
      <CookieConsent />
    </AuthProvider>
    </ErrorBoundary>
  );
}
