import type { ReactNode } from 'react';
import { StoreProvider } from '../lib/store';
import './globals.css';

export const metadata = {
  title: 'Brand · Кабинет владельца',
  description: 'AI-менеджер в WhatsApp — календарь, объекты, брони',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
