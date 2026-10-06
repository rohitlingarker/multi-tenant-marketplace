import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { IdentityProvider } from '@/lib/identity';
import Header from '@/components/Header';

export const metadata: Metadata = { title: 'Regulated Marketplace' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <IdentityProvider>
          <Header />
          <main>{children}</main>
        </IdentityProvider>
      </body>
    </html>
  );
}
