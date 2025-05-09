# Testimonials Component Documentation

## Overview
The Testimonials Component is a feature-rich, responsive component for displaying customer testimonials on landing pages. It supports both local storage (in component settings) and database integration for testimonial management.

## Features
- Multiple layout options: grid, carousel, and masonry
- Customizable colors and styles
- Customer avatars and ratings display
- Database integration for centralized testimonial management
- Responsive design for all screen sizes
- Drag and drop reordering in the editor

## Component Structure
The testimonials system consists of several files:

1. **TestimonialsComponent.tsx**: Main component for displaying testimonials
2. **TestimonialsComponentEditor.tsx**: Editor interface for managing testimonials
3. **TestimonialsComponentPreview.tsx**: Preview renderer for the builder
4. **testimonials.css**: Styles for the testimonials component
5. **api/testimonials.ts**: API functions for database operations

## Database Integration
Testimonials are stored in the `customer_testimonials` table with the following structure:

```sql
CREATE TABLE customer_testimonials (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_name TEXT NOT NULL,
  customer_avatar TEXT,
  rating NUMERIC NOT NULL,
  comment TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  purchase_date TIMESTAMP WITH TIME ZONE,
  product_name TEXT,
  product_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

## Settings Interface
The testimonials component supports the following settings:

```typescript
export interface TestimonialsSettings {
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  cardsBackgroundColor: string;
  cardsTextColor: string;
  layout: 'grid' | 'carousel' | 'masonry';
  columns: number;
  showRatings: boolean;
  showAvatars: boolean;
  avatarSize: 'small' | 'medium' | 'large';
  animation: 'none' | 'fade' | 'slide';
  items: TestimonialItem[];
  useDbTestimonials?: boolean;
  organizationId?: string;
}
```

## Database Operations
The component can be configured to load testimonials from the database using the `useDbTestimonials` setting. When enabled, the component will fetch testimonials associated with the organization from the `customer_testimonials` table.

### API Functions
- `getTestimonials`: Fetch testimonials for an organization
- `getTestimonialById`: Get a single testimonial by ID
- `createTestimonial`: Create a new testimonial
- `updateTestimonial`: Update an existing testimonial
- `deleteTestimonial`: Delete a testimonial
- `updateTestimonialActiveStatus`: Update the active status of a testimonial
- `syncTestimonialStatus`: Sync testimonial active status with component settings

## SQL Functions
Several SQL functions have been created to support testimonial operations:

- `upsert_testimonial_component`: Create or update a testimonial component
- `get_testimonials_for_component`: Fetch testimonials for a component
- `sync_testimonial_items`: Sync testimonial items with the database
- `update_testimonial_timestamp`: Update the timestamp when a testimonial is modified

## Usage in Landing Page Builder
Testimonials can be added as a component in the landing page builder. Users can either:
1. Create local testimonials within the component settings
2. Use testimonials from the database by enabling the `useDbTestimonials` option

## Implementation Notes
- The component employs React hooks for state management
- Database operations are performed through Supabase client
- Testimonials can be managed independently in the database or as part of component settings
- The editor provides a drag-and-drop interface for reordering testimonials
- Images are supported through an image uploader component

## Migration Information
To set up the database schema and functions, run the SQL migration script in `sql/migrations/20240301_testimonials_integration.sql`.

## Troubleshooting
- If testimonials aren't displaying, check the `is_active` status in the database
- Verify that the organization ID is set correctly when using database testimonials
- Check browser console for any API errors during testimonial fetching 