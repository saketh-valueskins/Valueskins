import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import SplashIntro from '@/components/SplashIntro';
import '@/styles/globals.css';

function HomeButton() {
  const router = useRouter();
  const { account, loading } = useAuth();
  const isOnboarding = router.pathname.startsWith('/auth/onboarding')
    || router.pathname === '/auth/verify-email';
  const isLoginOrSignup = router.pathname.startsWith('/auth/login')
    || router.pathname.startsWith('/auth/signup');

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
        display: isLoginOrSignup ? 'none' : 'inline-flex',
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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <SplashIntro />
      <HomeButton />
      <Component {...pageProps} />
      <Footer />
      <CookieConsent />
    </AuthProvider>
    </ErrorBoundary>
  );
}
