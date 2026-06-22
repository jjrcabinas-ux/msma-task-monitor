import type { Metadata } from 'next';
import './globals.css';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Employee task monitoring dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
