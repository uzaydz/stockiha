import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const StoreNotFound = React.memo(() => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
    <h1 className="text-2xl font-bold mb-4">المتجر غير موجود</h1>
    <p className="text-muted-foreground mb-4 max-w-md">
      لم نتمكن من العثور على المتجر المطلوب. يرجى التحقق من الرابط أو المحاولة لاحقًا.
    </p>
    <Link to="/">
      <Button aria-label="العودة إلى الصفحة الرئيسية">
        العودة إلى الصفحة الرئيسية
      </Button>
    </Link>
  </div>
));

StoreNotFound.displayName = 'StoreNotFound';
