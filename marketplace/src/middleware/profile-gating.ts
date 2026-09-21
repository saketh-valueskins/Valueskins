import { NextApiRequest, NextApiResponse } from 'next';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    account_type: 'creator' | 'brand';
    onboarding_stage: 'incomplete' | 'bank_details' | 'completed';
  };
}

/**
 * Middleware to enforce profile completion before marketplace access
 * Must be called after authentication
 */
export async function requireCompleteProfile(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.onboarding_stage !== 'completed') {
    return res.status(403).json({
      error: 'Profile incomplete',
      redirect: `/profile/complete-profile?type=${req.user.account_type}`,
      message:
        req.user.account_type === 'creator'
          ? 'Please complete your creator profile before accessing the marketplace'
          : 'Please complete your brand profile before creating campaigns',
    });
  }

  next();
}

/**
 * Client-side redirect for profile gating (use in _app.tsx or layout)
 */
export async function enforceProfileGating(userId: string, accountType: string) {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;

    const user = await res.json();

    if (user.onboarding_stage !== 'completed') {
      window.location.href = `/profile/complete-profile?type=${accountType}`;
    }
  } catch (error) {
    console.error('Profile gating error:', error);
  }
}

export default requireCompleteProfile;
