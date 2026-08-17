import type { ReactNode } from 'react';
import { Providers } from '../components/Providers';
import './globals.css';

export const metadata = {
  title: 'AmanAI · Кабинет владельца',
  description: 'AmanAI — AI-менеджер в WhatsApp. Календарь, объекты, брони.',
};

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('amanai-theme');if(t!=='dark'&&t!=='light')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
