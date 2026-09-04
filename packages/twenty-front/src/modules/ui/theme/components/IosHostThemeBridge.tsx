import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { persistedColorSchemeState } from '@/ui/theme/states/persistedColorSchemeState';
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

// Jotai storage can hydrate after a host message, so update storage and the DOM
// together to keep route transitions on the host-selected scheme.
const applyThemeDomAndStorage = (theme: 'light' | 'dark') => {
  const colorScheme = toTwentyColorScheme(theme);
  try {
    sessionStorage.setItem('iosHostTheme', theme);
    localStorage.setItem(
      'persistedColorSchemeState',
      JSON.stringify(colorScheme),
    );
  } catch {
    // ignore
  }
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
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
  const setPersistedColorScheme = useSetAtomState(persistedColorSchemeState);
  const setCurrentWorkspaceMember = useSetAtomState(
    currentWorkspaceMemberState,
  );
  const applyThemeRef = useRef<(theme: 'light' | 'dark') => void>(() => {});

  applyThemeRef.current = (theme: 'light' | 'dark') => {
    const colorScheme = applyThemeDomAndStorage(theme);
    setPersistedColorScheme((prev) =>
      prev === colorScheme ? prev : colorScheme,
    );
    setCurrentWorkspaceMember((current) => {
      if (!current || current.colorScheme === colorScheme) {
        return current;
      }
      return {
        ...current,
        colorScheme,
      };
    });
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
    };
    // Re-bind when the router replaces the sign-in route after redemption.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  return null;
};
