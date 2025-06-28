import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-id, x-api-token, token, key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const provider = url.searchParams.get('provider')
    const endpoint = url.searchParams.get('endpoint')
    
    if (!provider || !endpoint) {
      return new Response(JSON.stringify({ error: 'Missing provider or endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get headers from the request
    const headers: HeadersInit = {}
    
    // Provider-specific configurations
    let targetUrl = ''
    
    switch (provider) {
      case 'yalidine':
        targetUrl = `https://api.yalidine.app/v1/${endpoint}`
        headers['X-API-ID'] = req.headers.get('x-api-id') || ''
        headers['X-API-TOKEN'] = req.headers.get('x-api-token') || ''
        headers['Content-Type'] = 'application/json'
        headers['Accept'] = 'application/json'
        break
        
      case 'zrexpress':
        targetUrl = `https://procolis.com/api_v1/${endpoint}`
        headers['token'] = req.headers.get('token') || ''
        headers['key'] = req.headers.get('key') || ''
        headers['Content-Type'] = 'application/json'
        headers['Accept'] = 'application/json'
        break
        
      default:
        // For Ecotrack providers
        const ecotrackProviders: Record<string, string> = {
          'anderson_delivery': 'https://anderson.ecotrack.dz',
          'areex': 'https://areex.ecotrack.dz',
          'ba_consult': 'https://baconsult.ecotrack.dz',
          'conexlog': 'https://conexlog.ecotrack.dz',
          'coyote_express': 'https://coyote.ecotrack.dz',
          'dhd': 'https://dhd.ecotrack.dz',
          'distazero': 'https://distazero.ecotrack.dz',
          'e48hr_livraison': 'https://e48hr.ecotrack.dz',
          'fretdirect': 'https://fretdirect.ecotrack.dz',
          'golivri': 'https://golivri.ecotrack.dz',
          'mono_hub': 'https://monohub.ecotrack.dz',
          'msm_go': 'https://msmgo.ecotrack.dz',
          'imir_express': 'https://imir.ecotrack.dz',
          'packers': 'https://packers.ecotrack.dz',
          'prest': 'https://prest.ecotrack.dz',
          'rb_livraison': 'https://rb.ecotrack.dz',
          'rex_livraison': 'https://rex.ecotrack.dz',
          'rocket_delivery': 'https://rocket.ecotrack.dz',
          'salva_delivery': 'https://salva.ecotrack.dz',
          'speed_delivery': 'https://speed.ecotrack.dz',
          'tsl_express': 'https://tsl.ecotrack.dz',
          'worldexpress': 'https://worldexpress.ecotrack.dz',
          'ecotrack': 'https://api.ecotrack.dz'
        }
        
        const baseUrl = ecotrackProviders[provider]
        if (!baseUrl) {
          return new Response(JSON.stringify({ error: 'Unknown provider' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        targetUrl = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
        const authHeader = req.headers.get('authorization')
        if (authHeader) {
          headers['Authorization'] = authHeader
        }
        headers['Content-Type'] = 'application/json'
        headers['Accept'] = 'application/json'
    }

    // Forward the request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined
    })

    const responseData = await response.text()
    
    // Log response for debugging
    
    // Return the response with CORS headers
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json'
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
