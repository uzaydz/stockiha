import React from 'react';

export function FullBleedPage({
  children,
  dir = 'rtl',
  role,
}: {
  children: React.ReactNode;
  dir?: 'rtl' | 'ltr';
  role?: string;
}) {
  return (
    <section className="guide-page guide-page--full overflow-hidden" dir={dir} data-guide-role={role}>
      {children}
    </section>
  );
}
