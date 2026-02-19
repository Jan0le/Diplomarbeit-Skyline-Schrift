// Supabase Edge Function: Airport Search Proxy
// Bypasses iOS dev-mode fetch hangs by running on server

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const AERODATABOX_API_KEY = Deno.env.get('AERODATABOX_API_KEY')
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, limit = 10 } = await req.json()

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!AERODATABOX_API_KEY) {
      console.error('AERODATABOX_API_KEY not set')
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize query
    const trimmed = query.trim()
    const ascii = trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 \-]/g, '')
      .slice(0, 40)
    const safeQuery = ascii.length >= 2 ? ascii : trimmed
    const clampedLimit = Math.max(1, Math.min(10, Math.floor(limit)))

    console.log(`🔍 Searching for: "${safeQuery}" (limit: ${clampedLimit})`)

    const url = `https://aerodatabox.p.rapidapi.com/airports/search/term?q=${encodeURIComponent(safeQuery)}&limit=${clampedLimit}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-RapidAPI-Key': AERODATABOX_API_KEY,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(3000), // 3s timeout
    })

    if (!response.ok) {
      console.error(`AeroDataBox error: ${response.status}`)
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, results: [] }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])

    // Transform to app format
    const results = items.map((item: any, index: number) => ({
      id: item.iata || item.icao || `airport-${index}`,
      iata: item.iata || null,
      icao: item.icao || null,
      name: item.name,
      city: item.municipalityName || item.location?.city || null,
      country: item.countryCode || item.location?.country || null,
      latitude: item.location?.lat || 0,
      longitude: item.location?.lon || 0,
    }))

    console.log(`✅ Returned ${results.length} results`)

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message, results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

