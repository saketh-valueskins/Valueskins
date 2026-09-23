/**
 * @jest-environment node
 *
 * Route-level regression tests for PR-1 (audit C1/C2): identity must come from
 * a validated session, never from `x-user-id` / `x-user-role` headers or the
 * mere presence of a `valueskins_session` cookie.
 */
import { mockReq, mockRes, wireSessionQuery, VALID_TOKEN, SESSION_USER_ID } from './helpers';

// uuid@14 ships ESM only, which Jest's CJS runtime can't load; lib/request-context uses v4().
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }));
// These two modules start module-level setInterval timers that keep Jest alive.
jest.mock('@/lib/rate-limit', () => ({ rateLimit: () => true }));
jest.mock('@/lib/request-context', () => ({
  createRequestContext: () => ({ requestId: 'test' }),
  logRequestEnd: () => {},
}));
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  transaction: jest.fn(),
  getPool: jest.fn(),
}));
jest.mock('@/lib/razorpay', () => ({
  createOrder: jest.fn(),
  createTransfer: jest.fn(),
  verifySignature: jest.fn(),
  createContact: jest.fn(),
  createFundAccount: jest.fn(),
}));
jest.mock('@/lib/escrow', () => ({
  createDeal: jest.fn(),
  fundEscrow: jest.fn(),
  confirmEscrowFunding: jest.fn(),
  submitDeliverable: jest.fn(),
  approveDeliverables: jest.fn(),
  submitAnalytics: jest.fn(),
  approveAnalytics: jest.fn(),
  requestRevision: jest.fn(),
  submitRevision: jest.fn(),
  raiseDispute: jest.fn(),
  resolveDispute: jest.fn(),
  getDealEscrowStatus: jest.fn(),
  getAuditLog: jest.fn(),
  savePayoutAccountReference: jest.fn(),
  logAudit: jest.fn(),
}));
jest.mock('@/lib/backend-client', () => ({
  backendClient: new Proxy({}, { get: () => jest.fn(async () => ({ ok: true })) }),
}));

import { query } from '@/lib/db';
import * as razorpay from '@/lib/razorpay';
import * as escrow from '@/lib/escrow';

import escrowV2 from '@/pages/api/deals/escrow-v2/[[...action]]';
import payoutAccounts from '@/pages/api/deals/payout-accounts';
import onboardPayout from '@/pages/api/deals/onboard-payout';
import runMigrations from '@/pages/api/admin/run-migrations';
import envCheck from '@/pages/api/admin/env-check';
import financialConfig from '@/pages/api/admin/financial-config';
import completeWithRelease from '@/pages/api/deals/complete-with-release';
import legacyEscrow from '@/pages/api/deals/escrow';
import notificationsGet from '@/pages/api/notifications/get';
import notificationsMarkRead from '@/pages/api/notifications/mark-read';
import creatorEarnings from '@/pages/api/creator/earnings';
import arbitration from '@/pages/api/disputes/arbitration';

const queryMock = query as unknown as jest.Mock;
const FORGED = { cookies: { valueskins_session: 'not-a-real-session' }, headers: { 'x-user-id': '1' } };
const VALID = { cookies: { valueskins_session: VALID_TOKEN } };

let errSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  queryMock.mockReset();
  wireSessionQuery(queryMock);
  process.env.ADMIN_IDS = '1';
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

/** Every non-session SQL statement the route issued. */
const businessQueries = () =>
  queryMock.mock.calls.filter(([sql]) => !/auth_sessions/i.test(String(sql)));

describe('escrow-v2', () => {
  it('rejects a forged cookie + x-user-id and never reaches the engine', async () => {
    const res = mockRes();
    await escrowV2(mockReq({ method: 'POST', query: { action: ['approve'] }, body: { dealId: 'd1' }, ...FORGED }), res as any);
    expect(res.statusCode).toBe(401);
    expect(escrow.approveDeliverables).not.toHaveBeenCalled();
  });

  it('acts as the session user, not the header user', async () => {
    const res = mockRes();
    await escrowV2(
      mockReq({ method: 'POST', query: { action: ['approve'] }, body: { dealId: 'd1' }, ...VALID, headers: { 'x-user-id': '1' } }),
      res as any
    );
    expect(res.statusCode).toBe(200);
    expect(escrow.approveDeliverables).toHaveBeenCalledWith('d1', SESSION_USER_ID);
  });
});

describe('payout accounts', () => {
  it('POST with a forged session cannot save a payout account', async () => {
    const res = mockRes();
    await payoutAccounts(
      mockReq({ method: 'POST', body: { paymentProvider: 'razorpay', payoutAccountId: 'acc_ATTACKER', verificationStatus: 'verified' }, ...FORGED }),
      res as any
    );
    expect(res.statusCode).toBe(401);
    expect(escrow.savePayoutAccountReference).not.toHaveBeenCalled();
  });

  it('GET lists the session user\'s accounts even if a header names someone else', async () => {
    const res = mockRes();
    await payoutAccounts(mockReq({ method: 'GET', ...VALID, headers: { 'x-user-id': '999' } }), res as any);
    expect(res.statusCode).toBe(200);
    const [, params] = businessQueries()[0];
    expect(params).toEqual([SESSION_USER_ID]);
  });

  it('onboard-payout rejects a forged session before calling Razorpay', async () => {
    const res = mockRes();
    await onboardPayout(
      mockReq({ method: 'POST', body: { accountHolderName: 'X', accountNumber: '123456789', ifsc: 'HDFC0001234' }, ...FORGED }),
      res as any
    );
    expect(res.statusCode).toBe(401);
    expect(razorpay.createContact).not.toHaveBeenCalled();
  });
});

describe('admin', () => {
  it('run-migrations: an admin id in x-user-id without a session is 401', async () => {
    const res = mockRes();
    await runMigrations(mockReq({ method: 'POST', headers: { 'x-user-id': '1' } }), res as any);
    expect(res.statusCode).toBe(401);
    expect(businessQueries()).toHaveLength(0);
  });

  it('run-migrations: a valid non-admin session is 403', async () => {
    const res = mockRes();
    await runMigrations(mockReq({ method: 'POST', ...VALID }), res as any);
    expect(res.statusCode).toBe(403);
    expect(businessQueries()).toHaveLength(0);
  });

  it('env-check: header-only admin claim is 401', async () => {
    const res = mockRes();
    await envCheck(mockReq({ method: 'GET', headers: { 'x-user-id': '1' } }), res as any);
    expect(res.statusCode).toBe(401);
  });

  it('financial-config: x-user-role: admin does not grant write access', async () => {
    const res = mockRes();
    await financialConfig(mockReq({ method: 'POST', body: {}, ...VALID, headers: { 'x-user-role': 'admin' } }), res as any);
    expect(res.statusCode).toBe(403);
  });

  it('arbitration resolve-dispute: a non-admin session is 403', async () => {
    const res = mockRes();
    await arbitration(
      mockReq({ method: 'POST', body: { action: 'resolve-dispute', dispute_id: 'x', ruling: 'creator' }, ...VALID }),
      res as any
    );
    expect(res.statusCode).toBe(403);
  });
});

describe('cookie presence is not authentication', () => {
  it('complete-with-release: any cookie value no longer releases escrow', async () => {
    const res = mockRes();
    await completeWithRelease(mockReq({ method: 'POST', body: { dealId: 'd1' }, ...FORGED }), res as any);
    expect(res.statusCode).toBe(401);
    expect(razorpay.createTransfer).not.toHaveBeenCalled();
    expect(businessQueries()).toHaveLength(0);
  });

  it('deals/escrow release: any cookie value no longer flips escrow status', async () => {
    const res = mockRes();
    await legacyEscrow(mockReq({ method: 'POST', body: { dealId: 'd1', amount: 1, action: 'release' }, ...FORGED }), res as any);
    expect(res.statusCode).toBe(401);
    expect(businessQueries()).toHaveLength(0);
  });

  it('creator/earnings: header identity without a session is 401', async () => {
    const res = mockRes();
    await creatorEarnings(mockReq({ method: 'GET', headers: { 'x-user-id': '5' } }), res as any);
    expect(res.statusCode).toBe(401);
  });
});

describe('notifications are scoped to the session user', () => {
  it('get ignores ?userId=', async () => {
    const res = mockRes();
    await notificationsGet(mockReq({ method: 'GET', query: { userId: '999' }, ...VALID }), res as any);
    expect(res.statusCode).toBe(200);
    const [, params] = businessQueries()[0];
    expect(params).toEqual([SESSION_USER_ID]);
  });

  it('mark-read only updates the session user\'s notification', async () => {
    const res = mockRes();
    await notificationsMarkRead(mockReq({ method: 'POST', body: { notificationId: 'n1' }, ...VALID }), res as any);
    expect(res.statusCode).toBe(200);
    const [sql, params] = businessQueries()[0];
    expect(sql).toMatch(/AND user_id = \$2/);
    expect(params).toEqual(['n1', SESSION_USER_ID]);
  });
});
