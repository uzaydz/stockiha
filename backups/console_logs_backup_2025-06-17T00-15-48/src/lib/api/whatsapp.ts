import { supabase } from '@/lib/supabase-unified'

// Simplified interface for WhatsApp settings
interface WhatsappSettings {
  api_key?: string;
  webhook_url?: string;
  instance_id?: string;
  is_enabled?: boolean;
}

// Interface for WhatsApp templates
interface WhatsappTemplate {
  id?: string;
  organization_id: string;
  name: string;
  content: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Interface for WhatsApp messages
interface WhatsappMessage {
  id?: string;
  organization_id: string;
  recipient: string;
  content: string;
  template_id?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  created_at?: string;
}

/**
 * وظائف التكامل مع واتساب للأعمال
 */

/**
 * Get WhatsApp settings for a user
 */
export async function getWhatsappSettings(userId: string) {
  const { data, error } = await supabase
    .from('whatsapp_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data || {}
}

/**
 * Update WhatsApp settings for a user
 */
export async function updateWhatsappSettings(
  userId: string,
  settings: Partial<WhatsappSettings>
) {
  const { data, error } = await supabase
    .from('whatsapp_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Get WhatsApp templates for an organization
 */
export async function getWhatsappTemplates(orgId: string) {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Update or create a WhatsApp template
 */
export async function updateWhatsappTemplate(template: WhatsappTemplate) {
  if (template.id) {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .update({
        name: template.name,
        content: template.content,
        is_active: template.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', template.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } else {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .insert(template)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }
}

/**
 * Get WhatsApp messages for an organization
 */
export async function getWhatsappMessages(orgId: string) {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select(`
      *,
      service_bookings (
        id,
        customer_name,
        customer_phone,
        status,
        services (
          name
        )
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Send a WhatsApp message
 */
export async function sendWhatsappMessage(
  organizationId: string,
  recipient: string,
  content: string,
  templateId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Store the message in the database
    const { data: messageData, error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        organization_id: organizationId,
        recipient_phone: recipient,
        message_content: content,
        template_id: templateId,
        status: 'pending',
        sent_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      return { 
        success: false, 
        error: `خطأ في حفظ الرسالة: ${dbError.message}` 
      }
    }

    // Here you would integrate with WhatsApp API
    // For now, we'll just mark it as sent
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({ status: 'sent' })
      .eq('id', messageData.id)

    if (updateError) {
      return { 
        success: false, 
        error: `خطأ في تحديث حالة الرسالة: ${updateError.message}` 
      }
    }

    return { 
      success: true, 
      messageId: messageData.id 
    }
  } catch (error) {
    return { 
      success: false, 
      error: `خطأ غير متوقع: ${error}` 
    }
  }
}

export async function createWhatsAppTemplate(templateData: any): Promise<WhatsAppTemplateResponse> {
  try {
    const supabase = getSupabaseClient()
    // ... existing code ...
  } catch (error) {
    // ... existing code ...
  }
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  try {
    const supabase = getSupabaseClient()
    // ... existing code ...
  } catch (error) {
    // ... existing code ...
  }
}

export async function deleteWhatsAppTemplate(templateId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    // ... existing code ...
  } catch (error) {
    // ... existing code ...
  }
}

export async function updateWhatsAppTemplate(templateId: string, updateData: any): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    // ... existing code ...
  } catch (error) {
    // ... existing code ...
  }
}

export async function sendWhatsAppMessage(messageData: any): Promise<WhatsAppMessageResponse> {
  try {
    const supabase = getSupabaseClient()
    // ... existing code ...
  } catch (error) {
    // ... existing code ...
  }
}
