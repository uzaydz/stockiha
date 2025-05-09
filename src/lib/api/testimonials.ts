import { supabase } from '@/lib/supabase-client';
import { v4 as uuidv4 } from 'uuid';

export interface Testimonial {
  id: string;
  organization_id: string;
  customer_name: string;
  customer_avatar?: string;
  rating: number;
  comment: string;
  verified?: boolean;
  purchase_date?: string;
  product_name?: string;
  product_image?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TestimonialFormData {
  customer_name: string;
  customer_avatar?: string;
  rating: number;
  comment: string;
  product_name?: string;
  product_image?: string;
  verified?: boolean;
}

/**
 * Get all testimonials for an organization
 * @param organizationId The organization ID
 * @param options Query options
 * @returns List of testimonials
 */
export const getTestimonials = async (
  organizationId: string,
  options: { 
    active?: boolean;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  } = {}
) => {
  try {
    let query = supabase
      .from('customer_testimonials')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (options.active !== undefined) {
      query = query.eq('is_active', options.active);
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { 
        ascending: options.orderDirection === 'asc' 
      });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    throw error;
  }
};

/**
 * Get a single testimonial by ID
 * @param testimonialId Testimonial ID
 * @returns Testimonial data
 */
export const getTestimonialById = async (testimonialId: string) => {
  try {
    const { data, error } = await supabase
      .from('customer_testimonials')
      .select('*')
      .eq('id', testimonialId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    throw error;
  }
};

/**
 * Create a new testimonial
 * @param organizationId Organization ID
 * @param testimonialData Testimonial data
 * @returns Created testimonial
 */
export const createTestimonial = async (
  organizationId: string,
  testimonialData: TestimonialFormData
) => {
  try {
    const { data, error } = await supabase
      .from('customer_testimonials')
      .insert([{
        id: uuidv4(),
        organization_id: organizationId,
        customer_name: testimonialData.customer_name,
        customer_avatar: testimonialData.customer_avatar || null,
        rating: testimonialData.rating,
        comment: testimonialData.comment,
        product_name: testimonialData.product_name || null,
        product_image: testimonialData.product_image || null,
        verified: testimonialData.verified || false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating testimonial:', error);
    throw error;
  }
};

/**
 * Update an existing testimonial
 * @param testimonialId Testimonial ID
 * @param testimonialData Updated testimonial data
 * @returns Updated testimonial
 */
export const updateTestimonial = async (
  testimonialId: string,
  testimonialData: Partial<TestimonialFormData>
) => {
  try {
    const { data, error } = await supabase
      .from('customer_testimonials')
      .update({
        ...testimonialData,
        updated_at: new Date().toISOString()
      })
      .eq('id', testimonialId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating testimonial:', error);
    throw error;
  }
};

/**
 * Delete a testimonial
 * @param testimonialId Testimonial ID
 * @returns Success status
 */
export const deleteTestimonial = async (testimonialId: string) => {
  try {
    const { error } = await supabase
      .from('customer_testimonials')
      .delete()
      .eq('id', testimonialId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    throw error;
  }
};

/**
 * Update the active status of a testimonial
 * @param testimonialId Testimonial ID
 * @param isActive Active status
 * @returns Updated testimonial
 */
export const updateTestimonialActiveStatus = async (
  testimonialId: string,
  isActive: boolean
) => {
  try {
    const { data, error } = await supabase
      .from('customer_testimonials')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', testimonialId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating testimonial status:', error);
    throw error;
  }
};

/**
 * Sync testimonial active status with component settings
 * @param organizationId Organization ID
 * @param testimonialIds IDs of testimonials to be active
 * @returns Success status
 */
export const syncTestimonialStatus = async (
  organizationId: string,
  testimonialIds: string[]
) => {
  try {
    // Call the database function to sync testimonials
    const { error } = await supabase.rpc(
      'sync_testimonial_items',
      { 
        p_organization_id: organizationId,
        p_testimonial_ids: testimonialIds
      }
    );
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error syncing testimonial status:', error);
    throw error;
  }
}; 