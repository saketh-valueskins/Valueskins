/**
 * Minimal NextApiRequest / NextApiResponse doubles for route tests.
 * Not a test file itself (no `.test.` in the name).
 */
export interface MockRes {
  statusCode: number;
  body: any;
  headers: Record<string, any>;
  ended: boolean;
  status(code: number): MockRes;
  json(body: any): MockRes;
  send(body: any): MockRes;
  end(body?: any): MockRes;
  setHeader(name: string, value: any): MockRes;
  getHeader(name: string): any;
  redirect(a: any, b?: any): MockRes;
}

export function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    headers: {},
    ended: false,
    status(code) { res.statusCode = code; return res; },
    json(body) { res.body = body; res.ended = true; return res; },
    send(body) { res.body = body; res.ended = true; return res; },
    end(body) { if (body !== undefined) res.body = body; res.ended = true; return res; },
    setHeader(name, value) { res.headers[name.toLowerCase()] = value; return res; },
    getHeader(name) { return res.headers[name.toLowerCase()]; },
    redirect(a, b) { res.statusCode = typeof a === 'number' ? a : 307; res.body = typeof a === 'number' ? b : a; res.ended = true; return res; },
  };
  return res;
}

export function mockReq(opts: {
  method?: string;
  url?: string;
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}): any {
  const cookies = opts.cookies || {};
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (cookieHeader && !headers.cookie) headers.cookie = cookieHeader;
  return {
    method: opts.method || 'GET',
    url: opts.url || '/api/test',
    query: opts.query || {},
    body: opts.body || {},
    headers,
    cookies,
    socket: { remoteAddress: '127.0.0.1' },
  };
}

export const VALID_TOKEN = 'valid-session-token';
export const SESSION_USER_ID = '42';

/**
 * Wire a mocked `query` so that the auth_sessions lookup for VALID_TOKEN
 * resolves to SESSION_USER_ID and every other token resolves to no rows.
 * Any other SQL is delegated to `other` (default: empty result).
 */
export function wireSessionQuery(
  queryMock: jest.Mock,
  other: (sql: string, params?: any[]) => any = () => ({ rows: [] })
) {
  queryMock.mockImplementation(async (sql: string, params?: any[]) => {
    if (/FROM auth_sessions/i.test(sql) && /SELECT user_id/i.test(sql)) {
      return params && params[0] === VALID_TOKEN
        ? { rows: [{ user_id: Number(SESSION_USER_ID) }] }
        : { rows: [] };
    }
    if (/UPDATE auth_sessions/i.test(sql)) return { rows: [] };
    return other(sql, params);
  });
}
