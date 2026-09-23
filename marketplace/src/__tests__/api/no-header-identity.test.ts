/**
 * @jest-environment node
 *
 * Static guard (audit C1/C2): API routes must not take identity from request
 * headers or treat the presence of the session cookie as authentication.
 * Use requireUser / requireAdmin / getAuthenticatedUserId from
 * '@/lib/auth/require-user' instead.
 */
import fs from 'fs';
import path from 'path';

const API_DIR = path.join(__dirname, '..', '..', 'pages', 'api');

// These four still read the cookie and look it up in a `sessions` table that
// does not exist in the production schema, so they fail closed (500) today.
// Tracked as a follow-up; do not add to this list.
const RAW_COOKIE_ALLOWLIST = new Set([
  'auth/google-calendar-callback.ts',
  'calendar/create-event.ts',
  'deals/accept-and-sync-calendar.ts',
  'deals/my-deals.ts',
]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(t|j)sx?$/.test(e.name) ? [p] : [];
  });
}

const files = walk(API_DIR).map((abs) => ({
  rel: path.relative(API_DIR, abs).split(path.sep).join('/'),
  src: fs.readFileSync(abs, 'utf8'),
}));

it('finds the API routes', () => {
  expect(files.length).toBeGreaterThan(100);
});

it('no API route reads x-user-id / x-user-role headers', () => {
  const offenders = files
    .filter((f) => /headers\s*\[\s*['"`]x-user-(id|role)['"`]\s*\]|headers\.get\(\s*['"`]x-user-(id|role)/i.test(f.src))
    .map((f) => f.rel);
  expect(offenders).toEqual([]);
});

// A route that reads the cookie itself must also validate it against
// auth_sessions (or use the session helpers); reading it alone is the C2 bug.
const VALIDATES_SESSION = /auth_sessions|getSessionUserId|getAccountId|requireUser|requireAdmin|getAuthenticatedUserId/;

it('no API route checks only for the presence of the session cookie', () => {
  const offenders = files
    .filter((f) => !RAW_COOKIE_ALLOWLIST.has(f.rel))
    .filter((f) => /req\.cookies\.valueskins_session|req\.cookies\[\s*['"`]valueskins_session/.test(f.src))
    .filter((f) => !VALIDATES_SESSION.test(f.src))
    .map((f) => f.rel);
  expect(offenders).toEqual([]);
});
