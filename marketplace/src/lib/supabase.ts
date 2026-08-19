/**
 * Supabase stub - functionality moved to Render backend
 * Kept for backward compatibility, but returns no-op stubs
 */

type SupabaseClient = any;

export function getSupabase(): SupabaseClient {
  // Return stub object to prevent crashes in unused code paths
  return {
    rpc: async () => ({ error: null, data: null }),
    channel: () => ({
      subscribe: () => {},
      on: () => {},
      send: async () => {},
      removeChannel: () => {}
    }),
    realtime: { subscribe: () => {}, on: () => {} },
    auth: { getSession: async () => ({ data: { session: null } }) },
    removeChannel: () => {},
  };
}

// Backward-compat alias
export const supabase = new Proxy({} as SupabaseClient, {
  get() {
    return async () => ({ data: null, error: null });
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
