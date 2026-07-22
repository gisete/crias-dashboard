import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crias na Floresta — Gestão',
  description: 'Dashboard de gestão de inscrições',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-background text-on-surface font-body">
        {children}
      </body>
    </html>
  );
}
