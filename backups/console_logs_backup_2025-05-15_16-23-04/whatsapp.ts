import { createClient } from '@/lib/supabase/browser'

// Simplified interface for WhatsApp settings
export interface WhatsappSettings {
  whatsapp_phone: string | null
  whatsapp_enabled: boolean
  whatsapp_connected: boolean
}

// Interface for WhatsApp templates
export interface WhatsappTemplate {
  id?: string
  org_id: string
  template_name: string
  template_content: string
  is_active: boolean
  created_at?: string
}

// Interface for WhatsApp messages
export interface WhatsappMessage {
  id?: string
  org_id: string
  to_phone: string
  message_content: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  booking_id?: string | null
  template_id?: string | null
  created_at?: string
}

/**
 * وظائف التكامل مع واتساب للأعمال
 */

/**
 * Fetches WhatsApp settings for a user
 */
export async function getWhatsappSettings(userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('whatsapp_phone, whatsapp_enabled, whatsapp_connected')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  
  return data as WhatsappSettings
}

/**
 * Updates WhatsApp settings for a user
 */
export async function updateWhatsappSettings(
  userId: string, 
  settings: Partial<WhatsappSettings>
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .update(settings)
    .eq('id', userId)
    .select('whatsapp_phone, whatsapp_enabled, whatsapp_connected')
    .single()
    
  if (error) throw error
  
  return data as WhatsappSettings
}

/**
 * Fetches active WhatsApp templates for an organization
 */
export async function getWhatsappTemplates(orgId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
  
  if (error) throw error
  
  return data as WhatsappTemplate[]
}

/**
 * Updates or inserts a WhatsApp template
 */
export async function updateWhatsappTemplate(template: WhatsappTemplate) {
  const supabase = createClient()
  
  // If template has an ID, update it, otherwise insert it
  const operation = template.id 
    ? supabase.from('whatsapp_templates').update(template).eq('id', template.id)
    : supabase.from('whatsapp_templates').insert(template)
  
  const { data, error } = await operation.select().single()
  
  if (error) throw error
  
  return data as WhatsappTemplate
}

/**
 * Fetches sent WhatsApp messages for an organization
 */
export async function getWhatsappMessages(orgId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select(`
      *,
      service_bookings (
        id,
        customer_name,
        customer_phone,
        status,
        service_date,
        services (name)
      )
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return data as (WhatsappMessage & {
    service_bookings: {
      id: string
      customer_name: string
      customer_phone: string | null
      status: string
      service_date: string
      services: { name: string } | null
    } | null
  })[]
}

/**
 * Formats a phone number for WhatsApp
 * Removes any non-digit characters and ensures it starts with country code
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // If it doesn't start with a '+', add it
  if (!phone.startsWith('+')) {
    // If it starts with a 0, replace it with +966 (Saudi Arabia) as default
    if (digits.startsWith('0')) {
      return '+966' + digits.substring(1)
    }
    // Otherwise just add a + at the beginning
    return '+' + digits
  }
  
  return phone
}

/**
 * FREE VERSION: Sends a WhatsApp message using local server instead of WhatsApp Business API
 */
export async function sendWhatsappMessage(
  orgId: string,
  toPhone: string,
  message: string,
  bookingId?: string,
  templateId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = createClient()
  
  try {
    // Format the phone number
    const formattedPhone = formatPhoneNumber(toPhone)
    
    // In development mode, just log instead of actually sending
    if (import.meta.env.DEV) {
      console.log(`[FREE WHATSAPP] Would send to ${formattedPhone}: ${message}`)
      
      // Insert into whatsapp_messages table to track it
      const { data: messageData, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          org_id: orgId,
          to_phone: formattedPhone,
          message_content: message,
          status: 'sent',
          booking_id: bookingId,
          template_id: templateId
        })
        .select()
        .single()
      
      if (messageError) throw messageError
      
      return { 
        success: true, 
        messageId: messageData?.id 
      }
    }
    
    // In production, connect to local WhatsApp server
    // Use simple fetch to local server that will handle the actual WhatsApp sending
    const localServerUrl = import.meta.env.VITE_LOCAL_WHATSAPP_SERVER || 'http://localhost:3333/send-message'
    
    const response = await fetch(localServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send WhatsApp message')
    }
    
    // Insert into whatsapp_messages table to track it
    const { data: messageData, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        org_id: orgId,
        to_phone: formattedPhone,
        message_content: message,
        status: 'sent',
        booking_id: bookingId,
        template_id: templateId
      })
      .select()
      .single()
    
    if (messageError) throw messageError
    
    return { 
      success: true, 
      messageId: messageData?.id 
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    
    // Still insert into whatsapp_messages table, but mark as failed
    try {
      const { data: messageData } = await supabase
        .from('whatsapp_messages')
        .insert({
          org_id: orgId,
          to_phone: formatPhoneNumber(toPhone),
          message_content: message,
          status: 'failed',
          booking_id: bookingId,
          template_id: templateId
        })
        .select()
        .single()
        
      return { 
        success: false, 
        messageId: messageData?.id,
        error: (error as Error).message
      }
    } catch (insertError) {
      console.error('Error logging failed WhatsApp message:', insertError)
      return { 
        success: false, 
        error: (error as Error).message
      }
    }
  }
} 