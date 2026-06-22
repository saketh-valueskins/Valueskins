const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

export function getCaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '';
}

export function isCaptchaEnabled(): boolean {
  return !!getCaptchaSiteKey();
}

interface HcaptchaVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

export async function verifyCaptchaToken(token: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    return { success: false, error: 'CAPTCHA not configured' };
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA token required' };
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const response = await fetch(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data: HcaptchaVerifyResponse = await response.json();

    if (!data.success) {
      return { success: false, error: `CAPTCHA verification failed: ${(data['error-codes'] || []).join(', ')}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'CAPTCHA verification request failed' };
  }
}
