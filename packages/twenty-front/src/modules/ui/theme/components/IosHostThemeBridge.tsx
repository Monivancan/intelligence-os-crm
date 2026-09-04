import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { iosHostColorSchemeState } from '@/ui/theme/states/iosHostColorSchemeState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { type ColorScheme } from '@/workspace-member/types/WorkspaceMember';
import {
  getIosEmbedHostOrigin,
  isAllowedIosHostMessage,
} from '@/domain-manager/utils/iosEmbedHost';

type IosHostSetThemeMessage = {
  source: 'ios-host';
  type: 'set-theme';
  theme: 'light' | 'dark';
};

const isIosHostSetThemeMessage = (
  data: unknown,
): data is IosHostSetThemeMessage => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const message = data as Record<string, unknown>;
  return (
    message.source === 'ios-host' &&
    message.type === 'set-theme' &&
    (message.theme === 'light' || message.theme === 'dark')
  );
};

const toTwentyColorScheme = (theme: 'light' | 'dark'): ColorScheme =>
  theme === 'dark' ? 'Dark' : 'Light';

const readSeededIosTheme = (): 'light' | 'dark' | null => {
  try {
    const fromSession = sessionStorage.getItem('iosHostTheme');
    if (fromSession === 'light' || fromSession === 'dark') {
      return fromSession;
    }
  } catch {
    // ignore
  }
  return null;
};

const applyThemeDomAndSession = (theme: 'light' | 'dark') => {
  const colorScheme = toTwentyColorScheme(theme);
  try {
    sessionStorage.setItem('iosHostTheme', theme);
  } catch {
    // ignore
  }
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  return colorScheme;
};

const announceThemeReady = (hostOrigin: string) => {
  window.parent.postMessage(
    { source: 'twenty-iframe', type: 'theme-ready' },
    hostOrigin,
  );
};

export const IosHostThemeBridge = () => {
  const location = useLocation();
  const setIosHostColorScheme = useSetAtomState(iosHostColorSchemeState);
  const applyThemeRef = useRef<(theme: 'light' | 'dark') => void>(() => {});

  applyThemeRef.current = (theme: 'light' | 'dark') => {
    setIosHostColorScheme(applyThemeDomAndSession(theme));
  };

  useLayoutEffect(() => {
    const hostOrigin = getIosEmbedHostOrigin();

    if (window.self === window.top || hostOrigin === null) {
      return;
    }

    const applyTheme = (theme: 'light' | 'dark') => {
      applyThemeRef.current(theme);
    };

    const seeded = readSeededIosTheme();
    if (seeded) {
      applyTheme(seeded);
    }

    const onMessage = (event: MessageEvent) => {
      if (
        !isAllowedIosHostMessage(event, window.parent) ||
        !isIosHostSetThemeMessage(event.data)
      ) {
        return;
      }
      applyTheme(event.data.theme);
    };

    window.addEventListener('message', onMessage);

    announceThemeReady(hostOrigin);
    const retry1 = window.setTimeout(() => announceThemeReady(hostOrigin), 400);
    const retry2 = window.setTimeout(
      () => announceThemeReady(hostOrigin),
      1500,
    );

    return () => {
      window.clearTimeout(retry1);
      window.clearTimeout(retry2);
      window.removeEventListener('message', onMessage);
      setIosHostColorScheme(null);
    };
    // Re-bind when the router replaces the sign-in route after redemption.
  }, [location.pathname, location.search, setIosHostColorScheme]);

  return null;
};
