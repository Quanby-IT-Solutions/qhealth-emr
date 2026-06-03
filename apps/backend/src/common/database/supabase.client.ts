import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/config/env.config"

/**
 * Server-side Supabase client.
 *
 * Used by modules that have been migrated off Drizzle ORM to the Supabase JS
 * client (PostgREST + RPC). It authenticates with the service-role key, so it
 * runs with full privileges and BYPASSES row-level security — every query that
 * needs facility isolation MUST still filter by `facility_id` explicitly.
 *
 * The client is created lazily (no network connection happens until the first
 * query/RPC), so importing this module is side-effect free for tests.
 *
 * @example
 * ```typescript
 * import { supabase, unwrap } from "@/common/database/supabase.client"
 *
 * const rows = unwrap(await supabase.from("blood_units").select("*").eq("id", id))
 * ```
 */
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
	if (client) return client

	if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error(
			"SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the Supabase client"
		)
	}

	client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false },
	})
	return client
}

/**
 * Proxy that resolves the real client on first use. Lets call sites write
 * `supabase.from(...)` while keeping client creation lazy and mockable.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop, receiver) {
		const real = getSupabase()
		return Reflect.get(real, prop, receiver)
	},
})

/**
 * Unwraps a PostgREST/RPC result, throwing on error and returning the data.
 * Centralises error handling so call sites read like normal awaited queries.
 * Use for single-row (`.maybeSingle()`), insert, and `.rpc()` results, where
 * `data` may legitimately be `null`.
 */
export function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
	if (result.error) {
		throw new Error(result.error.message)
	}
	return result.data
}

/**
 * Unwraps a multi-row PostgREST result. On success PostgREST returns an array
 * (never null), so this throws on error and coalesces null to an empty array.
 */
export function unwrapMany<T>(result: { data: T[] | null; error: { message: string } | null }): T[] {
	if (result.error) {
		throw new Error(result.error.message)
	}
	return result.data ?? []
}
