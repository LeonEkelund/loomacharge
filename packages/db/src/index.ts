import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createSupabaseClient(url: string, key: string): SupabaseClient {
  if (!url || !key) {
    throw new Error('Supabase URL and key are required')
  }
  return createClient(url, key)
}

export type { SupabaseClient }
