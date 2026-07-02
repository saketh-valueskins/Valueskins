// Strict input validation for all API endpoints

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain number');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain special character');

  return { valid: errors.length === 0, errors };
}

export function validateHandle(handle: string): boolean {
  if (!handle || handle.length < 3 || handle.length > 30) return false;
  if (!/^[a-zA-Z0-9_-]+$/.test(handle)) return false;
  if (/^[_-]|[_-]$/.test(handle)) return false;
  return true;
}

export function sanitizeString(str: string, maxLength: number = 1000): string {
  if (!str) return '';
  return str
    .substring(0, maxLength)
    .trim()
    .replace(/[<>]/g, ''); // Remove HTML brackets
}

export function validateJsonPayload(data: any, schema: Record<string, 'string' | 'number' | 'boolean' | 'object'>): boolean {
  if (!data || typeof data !== 'object') return false;

  for (const [key, type] of Object.entries(schema)) {
    if (!(key in data)) return false;
    if (typeof data[key] !== type) return false;
  }

  // Reject unknown fields
  for (const key of Object.keys(data)) {
    if (!(key in schema)) return false;
  }

  return true;
}

export function validateNumberRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

export function sanitizeHtml(html: string): string {
  // Strip dangerous tags and attributes
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '');
}
