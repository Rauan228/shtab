import type { ReactNode } from 'react';
import { Providers } from '../components/Providers';
import './globals.css';

export const metadata = {
  title: 'AmanAI · Кабинет владельца',
  description: 'AmanAI — AI-менеджер в WhatsApp. Календарь, объекты, брони.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
