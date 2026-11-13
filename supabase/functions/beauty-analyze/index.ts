// Supabase Edge Function: Gemini 2.5 Vision skin analysis for the KLOZEVA Beauty kiosk.
// Deploy:  supabase functions deploy beauty-analyze
// Secret:  supabase secrets set GEMINI_API_KEY=your-key
// On any failure the frontend falls back to its built-in colorimetric analysis.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GEMINI_MODEL = 'gemini-2.5-flash'

const PROMPT = `Analyze this portrait photo for cosmetic and beauty product personalisation (non-medical aesthetic guidance only).
Return ONLY valid JSON matching this exact structure:
{
  "skinTone": "Fair" | "Light" | "Medium" | "Tan" | "Deep",
  "undertone": "Warm" | "Cool" | "Neutral" | "Olive",
  "skinType": "Dry" | "Oily" | "Combination" | "Normal",
  "confidence": number between 88 and 98,
  "concerns": ["string", "string", "string"],
  "textureObservations": "concise 1-sentence cosmetic observation",
  "summary": "concise 1-sentence cosmetic profile summary",
  "colorPalette": [
    {"name": "Peach", "hex": "#F4A488", "tip": "short usage tip"},
    {"name": "Coral", "hex": "#E56B5B", "tip": "short usage tip"},
    {"name": "Warm Nude", "hex": "#C78E75", "tip": "short usage tip"},
    {"name": "Terracotta", "hex": "#B45643", "tip": "short usage tip"},
    {"name": "Rose Brown", "hex": "#9E615C", "tip": "short usage tip"}
  ],
  "makeupAnalysis": {
    "foundationFamily": "string",
    "concealerDirection": "string",
    "blushColors": ["string", "string", "string"],
    "lipstickColors": ["string", "string", "string"],
    "eyeshadowPalette": ["string", "string", "string"],
    "colorFamily": "string"
  },
  "skincareAnalysis": {
    "categories": ["string", "string", "string", "string"],
    "cleanser": "string",
    "moisturiser": "string",
    "sunscreen": "string",
    "serum": "string"
  }
}`

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'GEMINI_API_KEY is not configured' }, 503)

  let body: { mimeType?: string; data?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const { mimeType, data } = body
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(mimeType ?? '') || typeof data !== 'string' || !data) {
    return json({ error: 'mimeType and base64 data are required' }, 400)
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: PROMPT }, { inlineData: { mimeType, data } }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    )
    if (!response.ok) throw new Error(`Gemini responded with ${response.status}`)
    const result = await response.json()
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Empty AI response')
    return json({ analysis: JSON.parse(rawText) })
  } catch (err) {
    console.error('Gemini analysis failed:', (err as Error).message)
    return json({ error: 'Gemini analysis failed' }, 502)
  }
})
