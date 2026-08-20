/**
 * Supabase stub - functionality moved to Render backend
 * Kept for backward compatibility, but returns no-op stubs.
 *
 * These no-ops must mirror the *shape* of supabase-js, not just its method
 * names. The real client is chainable — `.channel(t).on(...).subscribe(cb)` and
 * `.from(t).select(...).eq(...).maybeSingle()` — so a stub whose methods return
 * undefined crashes the first caller that chains, which is exactly what
 * subscribeSharedState() did. Every method here returns either the chainable
 * self or a settled { data, error } result.
 *
 * subscribe() deliberately never invokes its status callback: realtime is gone,
 * so callers must observe "not connected" rather than a fake SUBSCRIBED.
 */

type SupabaseClient = any;

function stubChannel(): any {
  const channel: any = {
    on: () => channel,
    subscribe: () => channel,
    send: async () => ({ error: null }),
    unsubscribe: async () => ({ error: null }),
  };
  return channel;
}

function stubQuery(): any {
  const result = { data: null, error: null };
  const query: any = {
    select: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    eq: () => query,
    neq: () => query,
    in: () => query,
    order: () => query,
    limit: () => query,
    range: () => query,
    single: async () => result,
    maybeSingle: async () => result,
    // Thenable so `await supabase.from(t).select(...)` resolves like the real client.
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

export function getSupabase(): SupabaseClient {
  // Return stub object to prevent crashes in unused code paths
  return {
    from: () => stubQuery(),
    rpc: async () => ({ error: null, data: null }),
    channel: () => stubChannel(),
    realtime: { subscribe: () => {}, on: () => {} },
    auth: { getSession: async () => ({ data: { session: null } }) },
    removeChannel: () => {},
  };
}

// Backward-compat alias. Delegates to getSupabase() so the alias and the
// factory degrade identically — returning a bare async fn for every property
// broke chained calls like supabase.from(t).insert(rows).
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop as string];
  },
});

export interface InterestSignupRow {
  id?: number;
  instagram_handle: string;
  email: string;
  name: string;
  reason_for_interest: string;
  primary_profession: string;
  target_annual_income_usd: number;
  preferred_platforms: string[];
  has_existing_audience: boolean;
  estimated_follower_count: number;
  status?: 'pending' | 'contacted' | 'converted_user' | 'rejected';
  admin_notes?: string | null;
  contacted_at?: string | null;
  converted_user_id?: number | null;
  created_at?: string;
}
