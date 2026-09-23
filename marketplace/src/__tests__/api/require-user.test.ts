/**
 * @jest-environment node
 */
import { mockReq, mockRes, wireSessionQuery, VALID_TOKEN, SESSION_USER_ID } from './helpers';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  transaction: jest.fn(),
  getPool: jest.fn(),
}));

import { query } from '@/lib/db';
import {
  getAuthenticatedUserId,
  requireUser,
  requireAdmin,
  isAdminUserId,
} from '@/lib/auth/require-user';
import { getSessionUserId } from '@/lib/session';

const queryMock = query as unknown as jest.Mock;

beforeEach(() => {
  queryMock.mockReset();
  wireSessionQuery(queryMock);
  delete process.env.ADMIN_IDS;
});

describe('getAuthenticatedUserId', () => {
  it('returns null with no session cookie', async () => {
    expect(await getAuthenticatedUserId(mockReq())).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns null for a cookie that is not an active session', async () => {
    expect(await getAuthenticatedUserId(mockReq({ cookies: { valueskins_session: 'forged' } }))).toBeNull();
  });

  it('returns the session user id for a valid session', async () => {
    expect(await getAuthenticatedUserId(mockReq({ cookies: { valueskins_session: VALID_TOKEN } }))).toBe(SESSION_USER_ID);
  });

  it('ignores an x-user-id header entirely', async () => {
    const req = mockReq({ headers: { 'x-user-id': '1' } });
    expect(await getAuthenticatedUserId(req)).toBeNull();
    const withSession = mockReq({ cookies: { valueskins_session: VALID_TOKEN }, headers: { 'x-user-id': '1' } });
    expect(await getAuthenticatedUserId(withSession)).toBe(SESSION_USER_ID);
  });
});

describe('getSessionUserId cookie parsing', () => {
  it('does not match a cookie whose name merely ends in valueskins_session', async () => {
    expect(await getSessionUserId(`xvalueskins_session=${VALID_TOKEN}`)).toBeNull();
  });
  it('matches the cookie among others', async () => {
    expect(String(await getSessionUserId(`a=1; valueskins_session=${VALID_TOKEN}; b=2`))).toBe(SESSION_USER_ID);
  });
});

describe('requireUser', () => {
  it('sends 401 and returns null without a valid session', async () => {
    const res = mockRes();
    expect(await requireUser(mockReq({ cookies: { valueskins_session: 'anything' } }), res as any)).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  it('sends 503 when the session store errors', async () => {
    queryMock.mockRejectedValueOnce(new Error('db down'));
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(await requireUser(mockReq({ cookies: { valueskins_session: VALID_TOKEN } }), res as any)).toBeNull();
    spy.mockRestore();
    expect(res.statusCode).toBe(503);
  });

  it('returns the id and does not touch the response for a valid session', async () => {
    const res = mockRes();
    expect(await requireUser(mockReq({ cookies: { valueskins_session: VALID_TOKEN } }), res as any)).toBe(SESSION_USER_ID);
    expect(res.ended).toBe(false);
  });
});

describe('admin', () => {
  it('has no admins when ADMIN_IDS is unset or blank', () => {
    expect(isAdminUserId('1')).toBe(false);
    process.env.ADMIN_IDS = ' , ';
    expect(isAdminUserId('')).toBe(false);
  });

  it('requireAdmin: 403 for a valid non-admin session', async () => {
    process.env.ADMIN_IDS = '7,8';
    const res = mockRes();
    expect(await requireAdmin(mockReq({ cookies: { valueskins_session: VALID_TOKEN } }), res as any)).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  it('requireAdmin: 401 for an admin id claimed only via header', async () => {
    process.env.ADMIN_IDS = SESSION_USER_ID;
    const res = mockRes();
    expect(await requireAdmin(mockReq({ headers: { 'x-user-id': SESSION_USER_ID } }), res as any)).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  it('requireAdmin: passes for a session user listed in ADMIN_IDS', async () => {
    process.env.ADMIN_IDS = `3, ${SESSION_USER_ID}`;
    const res = mockRes();
    expect(await requireAdmin(mockReq({ cookies: { valueskins_session: VALID_TOKEN } }), res as any)).toBe(SESSION_USER_ID);
  });
});
