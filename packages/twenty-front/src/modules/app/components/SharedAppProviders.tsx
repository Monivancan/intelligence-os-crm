import { type PropsWithChildren } from 'react';

import { ApolloProvider } from '@/apollo/components/ApolloProvider';
import { PendingServerSignOutEffect } from '@/auth/effect-components/PendingServerSignOutEffect';
import { ClientConfigProvider } from '@/client-config/components/ClientConfigProvider';
import { ClientConfigProviderEffect } from '@/client-config/components/ClientConfigProviderEffect';
import { BaseThemeProvider } from '@/ui/theme/components/BaseThemeProvider';
import { IosHostThemeBridge } from '@/ui/theme/components/IosHostThemeBridge';

type SharedAppProvidersProps = PropsWithChildren;

export const SharedAppProviders = ({ children }: SharedAppProvidersProps) => {
  return (
    <ApolloProvider>
      <BaseThemeProvider>
        <IosHostThemeBridge />
        <ClientConfigProviderEffect />
        <PendingServerSignOutEffect />
        <ClientConfigProvider>{children}</ClientConfigProvider>
      </BaseThemeProvider>
    </ApolloProvider>
  );
};
