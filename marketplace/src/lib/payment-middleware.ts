import { NextApiRequest, NextApiResponse } from 'next';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePaymentEnvironment(): ValidationResult {
  const errors: string[] = [];

  if (!process.env.RAZORPAY_KEY_ID) {
    errors.push('RAZORPAY_KEY_ID not configured');
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    errors.push('RAZORPAY_KEY_SECRET not configured');
  }

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL not configured');
  }

  if (!process.env.GMAIL_USER) {
    errors.push('GMAIL_USER not configured');
  }

  if (!process.env.GMAIL_PASSWORD) {
    errors.push('GMAIL_PASSWORD not configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function restricPaymentEndpoints(
  req: NextApiRequest,
  allowedEndpoints: string[]
): boolean {
  const path = req.url?.split('?')[0] || '';

  // Allow webhooks on all paths
  if (path.includes('/webhooks/')) {
    return true;
  }

  // Restrict API calls to specific endpoints
  for (const endpoint of allowedEndpoints) {
    if (path.includes(endpoint)) {
      return true;
    }
  }

  return false;
}

export function logPaymentRequest(
  req: NextApiRequest,
  action: string,
  details: Record<string, any>
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    path: req.url,
    action,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    details,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[PAYMENT]', JSON.stringify(logEntry));
  }

  // TODO: Send to structured logging service (Datadog, CloudWatch, etc.)
}

export function withPaymentValidation(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Validate environment on first request
    const validation = validatePaymentEnvironment();
    if (!validation.isValid) {
      logPaymentRequest(req, 'ENV_VALIDATION_FAILED', {
        errors: validation.errors,
      });

      return res.status(500).json({
        error: 'Payment service not configured',
        details: validation.errors,
      });
    }

    // Call handler
    return handler(req, res);
  };
}
