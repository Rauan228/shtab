'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import { OpsAuthProvider } from '../lib/ops-auth';
import { UiProvider } from '../lib/ui';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <OpsAuthProvider>
        <UiProvider>{children}</UiProvider>
      </OpsAuthProvider>
    </AuthProvider>
  );
}
