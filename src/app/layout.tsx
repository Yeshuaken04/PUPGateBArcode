import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PUP Bataan - Automated Gate Pass & Barrier System',
  description: 'Enterprise Automated Vehicle Gate Pass, Turnstile Access, and Campus Security System',
  icons: {
    icon: '/logo200.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
