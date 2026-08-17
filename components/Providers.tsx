'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import { OpsAuthProvider } from '../lib/ops-auth';
import { ThemeProvider } from '../lib/theme';
import { UiProvider } from '../lib/ui';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OpsAuthProvider>
          <UiProvider>{children}</UiProvider>
        </OpsAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
