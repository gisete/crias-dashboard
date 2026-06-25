import type { Metadata } from 'next';
import { Libre_Franklin } from 'next/font/google';
import './globals.css';

const libreFranklin = Libre_Franklin({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Crias na Floresta — Gestão',
  description: 'Dashboard de gestão de inscrições',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={libreFranklin.variable}>
      <body className="min-h-screen bg-background text-on-surface font-body">
        {children}
      </body>
    </html>
  );
}
