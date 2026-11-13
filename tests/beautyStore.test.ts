import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.doUnmock('../src/lib/supabase')
})

describe('beautyStore (disabled by default)', () => {
  it('is off without VITE_BEAUTY_BACKEND, so the app keeps using localStorage like the original', async () => {
    const store = await import('../src/lib/beautyStore')
    expect(store.isRemoteStoreEnabled()).toBe(false)
    await expect(store.fetchDb()).rejects.toThrow()
    await expect(store.saveDb({})).rejects.toThrow()
    await expect(store.requestGeminiAnalysis('image/png', 'abc')).rejects.toThrow()
  })
})

describe('beautyStore (supabase enabled)', () => {
  const setup = async (client: unknown) => {
    vi.stubEnv('VITE_BEAUTY_BACKEND', 'supabase')
    vi.doMock('../src/lib/supabase', () => ({ isConfigured: true, supabase: client }))
    return import('../src/lib/beautyStore')
  }

  it('loads the stored database document', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { data: { customers: [] } }, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const store = await setup({ from })
    expect(await store.fetchDb()).toEqual({ customers: [] })
    expect(from).toHaveBeenCalledWith('beauty_kiosk_store')
    expect(eq).toHaveBeenCalledWith('id', 'main')
  })

  it('returns null when nothing is stored yet', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const store = await setup({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) })
    expect(await store.fetchDb()).toBeNull()
  })

  it('upserts the whole database into the single row', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const store = await setup({ from: () => ({ upsert }) })
    await store.saveDb({ customers: [1] })
    expect(upsert).toHaveBeenCalledTimes(1)
    const row = upsert.mock.calls[0][0]
    expect(row.id).toBe('main')
    expect(row.data).toEqual({ customers: [1] })
  })

  it('surfaces Supabase errors so the app can fall back to its local cache', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: new Error('boom') })
    const store = await setup({ from: () => ({ upsert }) })
    await expect(store.saveDb({})).rejects.toThrow('boom')
  })

  it('calls the beauty-analyze Edge Function for Gemini analysis', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { analysis: { skinTone: 'Medium' } }, error: null })
    const store = await setup({ functions: { invoke } })
    expect(await store.requestGeminiAnalysis('image/jpeg', 'b64')).toEqual({ skinTone: 'Medium' })
    expect(invoke).toHaveBeenCalledWith('beauty-analyze', { body: { mimeType: 'image/jpeg', data: 'b64' } })
  })

  it('rejects an empty analysis so the colorimetric fallback is used', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: {}, error: null })
    const store = await setup({ functions: { invoke } })
    await expect(store.requestGeminiAnalysis('image/jpeg', 'b64')).rejects.toThrow()
  })
})
