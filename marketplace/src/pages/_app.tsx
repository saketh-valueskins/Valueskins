import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import SplashIntro from '@/components/SplashIntro';
import { ThemeProvider } from '@/theme/ThemeContext';
import '@/styles/globals.css';

// P2-F2: pages that draw their own VALUESKINS wordmark. The global fixed
// wordmark below must not render on these or the two overlap (the reported
// glitchy doubled wordmark).
const ROUTES_WITH_OWN_WORDMARK = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/onboarding',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/demo/marketplace',
  '/preview',
];

function HomeButton() {
  const router = useRouter();
  const { account, loading } = useAuth();
  const isOnboarding = router.pathname.startsWith('/auth/onboarding')
    || router.pathname === '/auth/verify-email';
  const ownsWordmark = ROUTES_WITH_OWN_WORDMARK.includes(router.pathname);

  const target = loading ? '/'
    : account?.onboarding_stage === 'complete' ? '/demo/marketplace'
    : '/';

  const handleClick = (e: React.MouseEvent) => {
    if (isOnboarding) {
      e.preventDefault();
      if (account && account.onboarding_stage !== 'complete') {
        router.replace(router.pathname);
      }
      return;
    }
    e.preventDefault();
    router.push(target);
  };

  // G1: no wordmark pill anywhere. The black oval/background/border is removed —
  // brand presence in nav is the plain VALUESKINS wordmark as text, no container.
  // Uses currentColor so each page's own text colour keeps it visible in light/dark.
  if (ownsWordmark) return null;

  return (
    <a
      href={target}
      onClick={handleClick}
      aria-label="ValueSkins home"
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        color: 'currentColor',
        mixBlendMode: 'difference',
        textDecoration: 'none',
        fontSize: '15px',
        fontWeight: 700,
        letterSpacing: '0.18em',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        cursor: isOnboarding ? 'default' : 'pointer',
        opacity: isOnboarding ? 0.6 : 1,
      }}
    >
      VALUESKINS
    </a>
  );
}

// The login page ships its own slim footer (login page.md §0b.6) and has to fit
// in a single viewport with no scroll (§3) — the tall global footer breaks that.
const ROUTES_WITHOUT_GLOBAL_FOOTER = ['/auth/login'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const hideFooter = ROUTES_WITHOUT_GLOBAL_FOOTER.includes(router.pathname);

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
      <SplashIntro />
      <HomeButton />
      <Component {...pageProps} />
      {!hideFooter && <Footer />}
      <CookieConsent />
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
