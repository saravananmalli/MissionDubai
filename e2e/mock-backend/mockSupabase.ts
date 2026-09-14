import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page, Route } from '@playwright/test';

// Read as plain text rather than `import ... from './seedData.json'`: Node's
// ESM loader now requires an explicit `with { type: 'json' }` import
// attribute for JSON imports, which is finicky and version-sensitive across
// the Node versions this might run under. Plain fs avoids that entirely.
interface SeedTables {
  trips: unknown[];
  flights: unknown[];
  visas: unknown[];
  accommodations: unknown[];
  applications: unknown[];
  company_visits: unknown[];
  visit_photos: unknown[];
  interviews: unknown[];
  budgets: unknown[];
  expenses: unknown[];
  offers: unknown[];
  application_events: unknown[];
  follow_ups: unknown[];
}

const seedDataPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seedData.json');
const seedData: SeedTables = JSON.parse(readFileSync(seedDataPath, 'utf-8')) as SeedTables;

/**
 * A local, in-memory fake of just the Supabase Auth + PostgREST endpoints
 * MissionDubai actually calls — installed via Playwright's page.route() so
 * the real app code (AuthProvider, each domain's api.ts) runs completely
 * unmodified and never knows it isn't talking to real Supabase. Lets E2E
 * tests verify UI/flow behavior with zero network dependency and zero risk
 * of tripping Supabase's signup rate limit. Complements, not replaces, the
 * real-backend tests in travel.spec.ts / rls.test.ts — those still verify
 * actual Supabase + RLS integration.
 *
 * Deliberately narrow: only the exact call shapes our app makes (see
 * domains/travel/api.ts, lib/trips.ts, app/AuthProvider.tsx) are handled.
 */

type Row = Record<string, unknown>;
type TableName = keyof SeedTables;

// Mirrors two things every real Postgres/PostgREST response guarantees but a
// naive "spread whatever the client sent" mock insert does not:
//   1. `not null default ...` columns get filled in when the client omits them
//      (e.g. interviews.outcome defaults to 'pending').
//   2. Every selected column is present in the row, `null` if empty — not
//      simply absent. A JS object doesn't distinguish "key omitted" from
//      "key set to undefined", and JSON.stringify drops undefined properties,
//      so an omitted nullable column here would come back as `undefined`,
//      not `null`. That's a real difference: e.g. `accommodation.lat !== null`
//      is true when lat is undefined, so code written against the real
//      contract (always null or a number) breaks against this mock unless
//      every nullable column is explicitly defaulted to null below.
const TABLE_DEFAULTS: Partial<Record<TableName, Row>> = {
  trips: { status: 'planning', target_end_date: null },
  flights: { seat_number: null, booking_reference: null },
  visas: { status: 'pending', duration_days: 60 },
  accommodations: { check_out_date: null, lat: null, lng: null },
  applications: {
    location: null,
    status: 'applied',
    source_name: null,
    final_outcome: null,
    salary_status: 'will_update_later',
    visa_sponsorship: 'need_to_ask',
    salary_min_aed: null,
    salary_max_aed: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    resume_status: 'not_submitted',
    resume_version: null,
    resume_submitted_date: null,
    cover_letter_submitted: false,
    application_url: null,
    notes: null,
  },
  company_visits: { notes: null, lat: null, lng: null },
  visit_photos: { caption: null },
  interviews: {
    round_number: 1,
    interview_status: 'scheduled',
    round_result: 'pending',
    outcome: 'pending',
    reminder_24h: true,
    reminder_1h: true,
    reminder_15min: false,
    reminder_daily_until: false,
    interviewer_name: null,
    interviewer_role: null,
    meeting_link: null,
    confidence_rating: null,
    feedback_notes: null,
    prep_notes: null,
  },
  application_events: { metadata: null },
  follow_ups: { status: 'pending', notes: null, completed_at: null },
  offers: {
    status: 'pending',
    visa_sponsorship: false,
    bonus_percent: null,
    leave_days: null,
    visa_cost_responsibility: null,
    location: null,
    growth_rating: null,
  },
  expenses: { description: null, receipt_photo_path: null, location: null, payment_method: null },
};

function base64url(input: string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeFakeAccessToken(userId: string): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  return `${header}.${payload}.mock-signature`;
}

function makeAuthUser(id: string, email: string) {
  const now = new Date().toISOString();
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: now,
    updated_at: now,
  };
}

function makeAuthSession(id: string, email: string) {
  return {
    access_token: makeFakeAccessToken(id),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `mock-refresh-${id}`,
    user: makeAuthUser(id, email),
  };
}

function applyQuery(rows: Row[], searchParams: URLSearchParams): Row[] {
  let result = rows;
  for (const [key, value] of searchParams.entries()) {
    if (key === 'select' || key === 'order' || key === 'limit') continue;

    const eqMatch = /^eq\.(.*)$/.exec(value);
    if (eqMatch) {
      result = result.filter((row) => String(row[key]) === eqMatch[1]);
      continue;
    }
    // ilike without % wildcards (the only form this app uses) is just a
    // case-insensitive exact match.
    const ilikeMatch = /^ilike\.(.*)$/.exec(value);
    if (ilikeMatch) {
      const needle = ilikeMatch[1]!.toLowerCase();
      result = result.filter((row) => String(row[key]).toLowerCase() === needle);
      continue;
    }
    const inMatch = /^in\.\((.*)\)$/.exec(value);
    if (inMatch) {
      const values = inMatch[1]!.split(',');
      result = result.filter((row) => values.includes(String(row[key])));
    }
  }
  const order = searchParams.get('order');
  if (order) {
    const [column, direction] = order.split('.');
    result = [...result].sort((a, b) => {
      const av = String(a[column!]);
      const bv = String(b[column!]);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return direction === 'desc' ? -cmp : cmp;
    });
  }
  const limit = searchParams.get('limit');
  if (limit) {
    result = result.slice(0, Number(limit));
  }
  return result;
}

export async function installMockSupabase(page: Page): Promise<void> {
  let user: { id: string; email: string; password: string } | null = null;
  // Fresh copy of the seed per install (each test gets its own page/route set),
  // since the seed file is the shared on-disk schema reference, not shared state.
  const tables: Record<TableName, Row[]> = structuredClone(seedData) as Record<TableName, Row[]>;

  await page.route('**/auth/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname.endsWith('/auth/v1/signup') && method === 'POST') {
      const body = request.postDataJSON() as { email: string; password: string };
      user = { id: randomUUID(), email: body.email, password: body.password };
      return json(200, makeAuthSession(user.id, user.email));
    }

    if (url.pathname.endsWith('/auth/v1/token') && method === 'POST') {
      const body = request.postDataJSON() as { email: string; password: string };
      if (!user || user.email !== body.email || user.password !== body.password) {
        return json(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      return json(200, makeAuthSession(user.id, user.email));
    }

    if (url.pathname.endsWith('/auth/v1/logout')) {
      return route.fulfill({ status: 204, body: '' });
    }

    if (url.pathname.endsWith('/auth/v1/user') && method === 'GET') {
      if (!user) return json(401, { msg: 'not authenticated' });
      return json(200, makeAuthUser(user.id, user.email));
    }

    return route.continue();
  });

  await page.route('**/rest/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const tableMatch = /\/rest\/v1\/([a-z_]+)/.exec(url.pathname);
    const tableName = tableMatch?.[1] as TableName | undefined;

    if (!tableName || !(tableName in tables)) {
      return route.continue();
    }

    const acceptHeader = await request.headerValue('accept');
    const wantsSingleObject = (acceptHeader ?? '').includes('vnd.pgrst.object');
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (method === 'GET') {
      const rows = applyQuery(tables[tableName], url.searchParams);
      return json(200, rows);
    }

    if (method === 'POST') {
      const payload = request.postDataJSON() as Row | Row[];
      const inserted = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
        id: randomUUID(),
        user_id: user?.id,
        created_at: new Date().toISOString(),
        // `application_events` uses `occurred_at`, not `created_at`, as its timestamp column.
        ...(tableName === 'application_events' ? { occurred_at: new Date().toISOString() } : {}),
        ...(TABLE_DEFAULTS[tableName] ?? {}),
        ...row,
      }));
      tables[tableName].push(...inserted);
      return json(201, wantsSingleObject ? inserted[0] : inserted);
    }

    if (method === 'PATCH') {
      const patch = request.postDataJSON() as Row;
      const matched = applyQuery(tables[tableName], url.searchParams);
      const matchedIds = new Set(matched.map((row) => row.id));
      tables[tableName] = tables[tableName].map((row) => (matchedIds.has(row.id) ? { ...row, ...patch } : row));
      const updated = tables[tableName].filter((row) => matchedIds.has(row.id));
      return json(200, wantsSingleObject ? updated[0] : updated);
    }

    if (method === 'DELETE') {
      tables[tableName] = [];
      return json(200, []);
    }

    return route.continue();
  });

  await page.route('**/storage/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname.includes('/storage/v1/object/sign/') && method === 'POST') {
      return json(200, { signedURL: `${url.pathname.replace('/sign', '')}?token=mock-token` });
    }

    if (url.pathname.includes('/storage/v1/object/') && method === 'POST') {
      return json(200, { Key: url.pathname.replace('/storage/v1/object/', '') });
    }

    return route.continue();
  });
}
