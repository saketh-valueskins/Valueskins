import { useRef, useEffect, useCallback } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '';

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, opts: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        'chalexpired-callback'?: () => void;
        'close-callback'?: () => void;
        'error-callback'?: (err: string) => void;
        theme?: string;
        size?: string;
        tabindex?: number;
      }) => number;
      reset: (widgetId: number) => void;
      getResponse: (widgetId: number) => string;
    };
  }
}

export function useCaptcha() {
  const tokenRef = useRef<string | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!SITE_KEY || loadedRef.current) return;
    loadedRef.current = true;

    const init = () => {
      if (!window.hcaptcha || !containerRef.current) return;
      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        size: 'normal',
        callback: (token: string) => { tokenRef.current = token; },
        'expired-callback': () => { tokenRef.current = null; },
      });
    };

    if (window.hcaptcha) {
      init();
    } else {
      const s = document.createElement('script');
      s.src = 'https://js.hcaptcha.com/1/api.js';
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    }
  }, []);

  const getToken = useCallback((): string | null => tokenRef.current, []);

  const reset = useCallback(() => {
    tokenRef.current = null;
    if (widgetIdRef.current !== null && window.hcaptcha) {
      try { window.hcaptcha.reset(widgetIdRef.current); } catch {}
    }
  }, []);

  return { containerRef, getToken, reset, isEnabled: !!SITE_KEY };
}
