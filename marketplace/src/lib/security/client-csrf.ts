function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken(): string | null {
  return getCookie('csrf_token');
}

export function getCsrfHash(): string | null {
  return getCookie('csrf_hash');
}

export function hasCsrfToken(): boolean {
  return getCsrfToken() !== null;
}
