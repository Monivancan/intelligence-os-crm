import { type JSX, createContext } from 'react';

import { UI_SCALE_MULTIPLIERS } from '@/ui/theme/constants/UiScaleMultipliers';
import { useSystemColorScheme } from '@/ui/theme/hooks/useSystemColorScheme';
import { isHostedInIosEmbed } from '@/domain-manager/utils/iosEmbedHost';
import { persistedColorSchemeState } from '@/ui/theme/states/persistedColorSchemeState';
import { persistedUiScaleStepState } from '@/ui/theme/states/persistedUiScaleStepState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type ColorScheme } from 'twenty-ui/input';
import { ThemeProvider } from 'twenty-ui/theme-constants';

type BaseThemeProviderProps = {
  children: JSX.Element | JSX.Element[];
};

export const ThemeSchemeContext = createContext<(theme: ColorScheme) => void>(
  () => {},
);

// The trusted IOS host theme wins over System/OS while embedded.
const readIframeHostColorScheme = (): ColorScheme | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    if (!isHostedInIosEmbed()) {
      return null;
    }
    const theme = sessionStorage.getItem('iosHostTheme');
    if (theme === 'light') {
      return 'Light';
    }
    if (theme === 'dark') {
      return 'Dark';
    }
  } catch {
    // ignore
  }
  return null;
};

export const BaseThemeProvider = ({ children }: BaseThemeProviderProps) => {
  const [persistedColorScheme, setPersistedColorScheme] = useAtomState(
    persistedColorSchemeState,
  );
  const persistedUiScaleStep = useAtomStateValue(persistedUiScaleStepState);
  const systemColorScheme = useSystemColorScheme();
  const iframeHostScheme = readIframeHostColorScheme();
  const effectiveColorScheme =
    iframeHostScheme ??
    (persistedColorScheme === 'System'
      ? systemColorScheme
      : persistedColorScheme);

  return (
    <ThemeSchemeContext.Provider value={setPersistedColorScheme}>
      <ThemeProvider
        colorScheme={effectiveColorScheme === 'Dark' ? 'dark' : 'light'}
        scale={UI_SCALE_MULTIPLIERS[persistedUiScaleStep]}
      >
        {children}
      </ThemeProvider>
    </ThemeSchemeContext.Provider>
  );
};
