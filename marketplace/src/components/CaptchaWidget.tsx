import { useRef, useEffect } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '';

interface Props {
  onVerify: (token: string | null) => void;
  theme?: string;
}

type HcaptchaRender = (container: HTMLElement, opts: {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  theme?: string;
  size?: string;
}) => number;

export default function CaptchaWidget({ onVerify, theme = 'dark' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!SITE_KEY || mountedRef.current) return;
    mountedRef.current = true;

    const render = () => {
      const hc = (window as any).hcaptcha as HcaptchaRender | undefined;
      if (!hc || !containerRef.current) return;
      hc(containerRef.current, {
        sitekey: SITE_KEY,
        size: 'normal',
        theme,
        callback: (t: string) => onVerify(t),
        'expired-callback': () => onVerify(null),
      });
    };

    if ((window as any).hcaptcha) {
      render();
    } else {
      const s = document.createElement('script');
      s.src = 'https://js.hcaptcha.com/1/api.js';
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    }
  }, []);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} style={{ marginBottom: '12px' }} />;
}
