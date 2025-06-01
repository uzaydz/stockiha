import React from 'react'
import { StoreEditor } from '@/features/store-editor/components/StoreEditor'
import { PageConfig } from '@/features/store-editor/types/editor.types'

const StoreEditorDemo = () => {
  // بيانات تجريبية للصفحة
  const demoPage: PageConfig = {
    id: 'demo-page-1',
    name: 'الصفحة الرئيسية التجريبية',
    slug: 'demo-home',
    elements: [
      {
        id: 'header-1',
        type: 'header',
        name: 'رأس الصفحة',
        properties: {},
        styles: {
          desktop: {
            width: '100%',
            backgroundColor: '#ffffff',
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
          },
          tablet: {},
          mobile: {},
        },
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'hero-1',
        type: 'hero',
        name: 'قسم البطل',
        properties: {
          text: 'مرحباً بكم في متجرنا المميز',
        },
        styles: {
          desktop: {
            width: '100%',
            minHeight: '500px',
            backgroundColor: '#f8fafc',
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem',
          },
          tablet: {},
          mobile: {},
        },
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'text-1',
        type: 'text',
        name: 'نص ترحيبي',
        properties: {
          text: 'اكتشف مجموعتنا الرائعة من المنتجات عالية الجودة بأسعار مناسبة للجميع',
        },
        styles: {
          desktop: {
            width: '100%',
            maxWidth: '800px',
            margin: '2rem auto',
            padding: '0 1rem',
            fontSize: '1.125rem',
            lineHeight: '1.75',
            textAlign: 'center',
            color: '#6b7280',
          },
          tablet: {},
          mobile: {},
        },
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'section-1',
        type: 'section',
        name: 'قسم المنتجات',
        properties: {},
        styles: {
          desktop: {
            width: '100%',
            padding: '4rem 1rem',
            backgroundColor: '#ffffff',
          },
          tablet: {},
          mobile: {},
        },
        order: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'footer-1',
        type: 'footer',
        name: 'تذييل الصفحة',
        properties: {},
        styles: {
          desktop: {
            width: '100%',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            padding: '3rem 1rem',
          },
          tablet: {},
          mobile: {},
        },
        order: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    seoSettings: {
      title: 'متجر تجريبي مميز',
      description: 'اكتشف أفضل المنتجات في متجرنا التجريبي',
      keywords: ['تجارة إلكترونية', 'متجر', 'منتجات'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return (
    <div className="w-full h-screen">
      <StoreEditor initialPage={demoPage} />
    </div>
  )
}

export default StoreEditorDemo 