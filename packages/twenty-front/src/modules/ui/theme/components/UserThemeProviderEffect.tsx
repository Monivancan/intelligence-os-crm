import { useContext, useEffect } from 'react';

import { ThemeSchemeContext } from '@/ui/theme/components/BaseThemeProvider';
import { isHostedInIosEmbed } from '@/domain-manager/utils/iosEmbedHost';
import { useColorScheme } from '@/ui/theme/hooks/useColorScheme';

export const UserThemeProviderEffect = () => {
  const { colorScheme } = useColorScheme();
  const setThemeScheme = useContext(ThemeSchemeContext);

  useEffect(() => {
    // When iframed by Intelligence OS, IosHostThemeBridge owns the scheme.
    if (isHostedInIosEmbed()) {
      return;
    }
    setThemeScheme(colorScheme);
  }, [colorScheme, setThemeScheme]);

  return <></>;
};
