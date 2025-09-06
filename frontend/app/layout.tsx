import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ZKP-Estate - Zero-Knowledge Rental Protocol',
  description: 'Privacy-preserving rental agreements using zero-knowledge proofs',
  keywords: ['zkp', 'zero-knowledge', 'rental', 'estate', 'privacy'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 dark:from-secondary-900 dark:to-secondary-800">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
