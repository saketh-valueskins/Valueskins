import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import DiagnosticsPanel from '@/components/DiagnosticsPanel';
import { ThemeProvider } from '@/theme/ThemeContext';
import '@/styles/globals.css';

// The login page ships its own slim footer (login page.md §0b.6) and has to fit
// in a single viewport with no scroll (§3) — the tall global footer breaks that.
const ROUTES_WITHOUT_GLOBAL_FOOTER = ['/auth/login'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const hideFooter = ROUTES_WITHOUT_GLOBAL_FOOTER.includes(router.pathname);
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
      <Component {...pageProps} />
      {!hideFooter && <Footer />}
      <CookieConsent />
      {isDev && <DiagnosticsPanel />}
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
