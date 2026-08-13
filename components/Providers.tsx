'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import { UiProvider } from '../lib/ui';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UiProvider>{children}</UiProvider>
    </AuthProvider>
  );
}
