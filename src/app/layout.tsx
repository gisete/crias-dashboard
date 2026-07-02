import type { Metadata } from 'next';
import { Nunito_Sans } from 'next/font/google';
import './globals.css';

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Crias na Floresta — Gestão',
  description: 'Dashboard de gestão de inscrições',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={nunitoSans.variable}>
      <body className="min-h-screen bg-background text-on-surface font-body">
        {children}
      </body>
    </html>
  );
}
