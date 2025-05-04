import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider } from '@/components/AuthProvider';
import dynamic from 'next/dynamic';
import './globals.css';

// استيراد ديناميكي لمكون مؤشر حالة الاتصال (لتجنب مشاكل SSR)
const OfflineStatusIndicator = dynamic(
  () => import('@/components/OfflineStatusIndicator'),
  { ssr: false }
);

const inter = Inter({ subsets: ['latin', 'arabic'] });

export const metadata: Metadata = {
  title: 'stockiha - نظام إدارة المبيعات',
  description: 'نظام متكامل لإدارة المبيعات والمخزون',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
        <Toaster position="bottom-center" />
        <OfflineStatusIndicator />
      </body>
    </html>
  );
} 