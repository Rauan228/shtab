import type { ReactNode } from 'react';
import { Providers } from '../components/Providers';
import './globals.css';

export const metadata = {
  title: 'Shtab · Кабинет владельца',
  description: 'AI-менеджер в WhatsApp — календарь, объекты, брони',
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
