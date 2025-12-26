/**
 * Supabase Edge Function: manage-domains
 *
 * إدارة النطاقات المخصصة عبر Vercel API بشكل آمن
 * الـ Token محفوظ في Server-side ولا يُكشف للمستخدم
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Vercel API Configuration
const VERCEL_API_BASE = 'https://api.vercel.com'
const VERCEL_IP = '76.76.21.21'
const VERCEL_CNAME = 'cname.vercel-dns.com'

// Types
interface VercelDomain {
  name: string
  apexName: string
  projectId: string
  verified: boolean
  verification?: Array<{
    type: string
    domain: string
    value: string
    reason: string
  }>
  gitBranch?: string | null
  createdAt: number
  updatedAt: number
}

interface VercelDomainConfig {
  configuredBy: 'CNAME' | 'A' | 'http' | null
  misconfigured: boolean
  conflicts?: Array<{
    name: string
    type: string
    value: string
    reason: string
  }>
}

// Helper: Make Vercel API request
async function vercelFetch(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string>
): Promise<Response> {
  const vercelToken = Deno.env.get('VERCEL_TOKEN')
  const teamId = Deno.env.get('VERCEL_TEAM_ID')

  if (!vercelToken) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const url = new URL(path, VERCEL_API_BASE)

  if (teamId) {
    url.searchParams.set('teamId', teamId)
  }

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return fetch(url.toString(), {
    ...options,
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

// Action Handlers
async function addDomain(projectId: string, domain: string) {
  const response = await vercelFetch(
    `/v10/projects/${projectId}/domains`,
    {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `Failed to add domain: ${response.status}`)
  }

  return data
}

async function removeDomain(projectId: string, domain: string) {
  const response = await vercelFetch(
    `/v9/projects/${projectId}/domains/${domain}`,
    { method: 'DELETE' }
  )

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error?.message || `Failed to remove domain: ${response.status}`)
  }

  return { success: true }
}

async function getDomain(projectId: string, domain: string): Promise<VercelDomain | null> {
  const response = await vercelFetch(
    `/v9/projects/${projectId}/domains/${domain}`
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data.domain || data
}

async function verifyDomain(projectId: string, domain: string) {
  const response = await vercelFetch(
    `/v9/projects/${projectId}/domains/${domain}/verify`,
    { method: 'POST' }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `Failed to verify domain: ${response.status}`)
  }

  return data.domain || data
}

async function checkDomainConfig(projectId: string, domain: string): Promise<VercelDomainConfig | null> {
  const response = await vercelFetch(
    `/v6/domains/${domain}/config`,
    {},
    { projectId }
  )

  if (!response.ok) {
    return null
  }

  return await response.json()
}

async function listDomains(projectId: string) {
  const response = await vercelFetch(
    `/v9/projects/${projectId}/domains`
  )

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error?.message || `Failed to list domains: ${response.status}`)
  }

  return await response.json()
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get store project ID from environment
    const storeProjectId = Deno.env.get('VERCEL_STORE_PROJECT_ID')
    if (!storeProjectId) {
      return new Response(
        JSON.stringify({ error: 'VERCEL_STORE_PROJECT_ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const { action, domain, organizationId } = await req.json()

    // Verify user has access to the organization
    const { data: orgAccess, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, owner_id')
      .eq('id', organizationId)
      .single()

    if (orgError || !orgAccess) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is owner or admin
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('role, organization_id')
      .eq('auth_user_id', user.id)
      .single()

    const isOwner = orgAccess.owner_id === user.id
    const isOrgAdmin = userRecord?.organization_id === organizationId &&
                       (userRecord?.role === 'admin' || userRecord?.role === 'owner')

    if (!isOwner && !isOrgAdmin) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean domain
    const cleanDomain = domain?.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')

    let result: any

    switch (action) {
      case 'setup': {
        // Add both apex and www domains
        const apexDomain = cleanDomain
        const wwwDomain = `www.${cleanDomain}`

        const [apexResult, wwwResult] = await Promise.allSettled([
          addDomain(storeProjectId, apexDomain),
          addDomain(storeProjectId, wwwDomain)
        ])

        // Save to database
        const now = new Date().toISOString()
        await supabaseAdmin
          .from('organizations')
          .update({ domain: apexDomain, updated_at: now })
          .eq('id', organizationId)

        await supabaseAdmin
          .from('domain_verifications')
          .upsert({
            organization_id: organizationId,
            domain: apexDomain,
            status: 'pending',
            updated_at: now
          }, { onConflict: 'organization_id,domain' })

        result = {
          success: true,
          apex: apexResult.status === 'fulfilled' ? apexResult.value : { error: (apexResult as PromiseRejectedResult).reason?.message },
          www: wwwResult.status === 'fulfilled' ? wwwResult.value : { error: (wwwResult as PromiseRejectedResult).reason?.message },
          dnsInstructions: {
            apex: { type: 'A', name: '@', value: VERCEL_IP },
            www: { type: 'CNAME', name: 'www', value: VERCEL_CNAME }
          }
        }
        break
      }

      case 'remove': {
        const apexDomain = cleanDomain
        const wwwDomain = `www.${cleanDomain}`

        await Promise.allSettled([
          removeDomain(storeProjectId, apexDomain),
          removeDomain(storeProjectId, wwwDomain)
        ])

        // Remove from database
        const now = new Date().toISOString()
        await supabaseAdmin
          .from('organizations')
          .update({ domain: null, updated_at: now })
          .eq('id', organizationId)

        await supabaseAdmin
          .from('domain_verifications')
          .delete()
          .eq('organization_id', organizationId)

        result = { success: true }
        break
      }

      case 'verify': {
        const apexDomain = cleanDomain
        const wwwDomain = `www.${cleanDomain}`

        const [apexVerify, wwwVerify] = await Promise.allSettled([
          verifyDomain(storeProjectId, apexDomain),
          verifyDomain(storeProjectId, wwwDomain)
        ])

        const apexVerified = apexVerify.status === 'fulfilled' && apexVerify.value?.verified
        const wwwVerified = wwwVerify.status === 'fulfilled' && wwwVerify.value?.verified

        // Update database if verified
        if (apexVerified && wwwVerified) {
          const now = new Date().toISOString()
          await supabaseAdmin
            .from('domain_verifications')
            .update({
              status: 'verified',
              verified_at: now,
              updated_at: now
            })
            .eq('organization_id', organizationId)
        }

        result = {
          success: true,
          apex: {
            verified: apexVerified,
            data: apexVerify.status === 'fulfilled' ? apexVerify.value : null
          },
          www: {
            verified: wwwVerified,
            data: wwwVerify.status === 'fulfilled' ? wwwVerify.value : null
          },
          allVerified: apexVerified && wwwVerified
        }
        break
      }

      case 'status': {
        const apexDomain = cleanDomain
        const wwwDomain = `www.${cleanDomain}`

        const [apexInfo, wwwInfo, apexConfig, wwwConfig] = await Promise.all([
          getDomain(storeProjectId, apexDomain),
          getDomain(storeProjectId, wwwDomain),
          checkDomainConfig(storeProjectId, apexDomain),
          checkDomainConfig(storeProjectId, wwwDomain)
        ])

        result = {
          success: true,
          apex: {
            exists: !!apexInfo,
            verified: apexInfo?.verified || false,
            configured: apexConfig?.configuredBy !== null,
            configuredBy: apexConfig?.configuredBy || null,
            misconfigured: apexConfig?.misconfigured || false,
            conflicts: apexConfig?.conflicts || []
          },
          www: {
            exists: !!wwwInfo,
            verified: wwwInfo?.verified || false,
            configured: wwwConfig?.configuredBy !== null,
            configuredBy: wwwConfig?.configuredBy || null,
            misconfigured: wwwConfig?.misconfigured || false,
            conflicts: wwwConfig?.conflicts || []
          },
          dnsInstructions: {
            apex: { type: 'A', name: '@', value: VERCEL_IP },
            www: { type: 'CNAME', name: 'www', value: VERCEL_CNAME }
          }
        }
        break
      }

      case 'list': {
        result = await listDomains(storeProjectId)
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
