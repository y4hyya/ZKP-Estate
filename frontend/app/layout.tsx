import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/Providers';

export const metadata: Metadata = {
  title: 'ZKP-Estate - Privacy-Preserving Rental Protocol',
  description: 'Privacy-preserving rental agreements using TLSNotary attestations',
  keywords: ['tlsnotary', 'rental', 'estate', 'privacy', 'ethereum'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 dark:from-secondary-900 dark:to-secondary-800">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
