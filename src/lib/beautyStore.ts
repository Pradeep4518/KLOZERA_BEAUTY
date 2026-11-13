import { isConfigured, supabase } from './supabase'

// Optional Supabase persistence for the KLOZEVA Beauty database + the Gemini Edge Function.
// Disabled unless VITE_BEAUTY_BACKEND=supabase and the Supabase URL / anon key are set.
// When disabled the app behaves exactly like the original (browser localStorage + colorimetric analysis).
export const isRemoteStoreEnabled = (): boolean =>
  import.meta.env.VITE_BEAUTY_BACKEND === 'supabase' && isConfigured

const TABLE = 'beauty_kiosk_store'
const ROW_ID = 'main'

// Returns the stored database, or null when nothing has been saved yet. Throws when disabled/unreachable.
export const fetchDb = async (): Promise<Record<string, unknown> | null> => {
  if (!isRemoteStoreEnabled()) throw new Error('Supabase store is disabled')
  const { data, error } = await supabase.from(TABLE).select('data').eq('id', ROW_ID).maybeSingle()
  if (error) throw error
  return (data?.data as Record<string, unknown> | undefined) ?? null
}

export const saveDb = async (db: unknown): Promise<void> => {
  if (!isRemoteStoreEnabled()) throw new Error('Supabase store is disabled')
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data: db, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Gemini vision analysis runs server-side (Edge Function `beauty-analyze`) so the API key never reaches the browser.
export const requestGeminiAnalysis = async (mimeType: string, data: string): Promise<Record<string, unknown>> => {
  if (!isRemoteStoreEnabled()) throw new Error('Supabase backend is disabled')
  const { data: result, error } = await supabase.functions.invoke('beauty-analyze', { body: { mimeType, data } })
  if (error) throw error
  if (!result?.analysis) throw new Error('Empty AI response')
  return result.analysis as Record<string, unknown>
}
