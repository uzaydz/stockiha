import React from 'react';
import { StoreSettings } from './types';

interface StoreFooterProps {
  settings: StoreSettings;
}

export default function StoreFooter({ settings }: StoreFooterProps) {

  return (
    <footer className="bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-md border-t border-border/50 mt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Copyright */}
        <div className="text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} {settings.business_name || 'متجر تحميل الألعاب'}. جميع الحقوق محفوظة.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            مدعوم بتقنيات حديثة لتجربة تسوق مميزة
          </p>
        </div>
      </div>
    </footer>
  );
}
