import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const shouldEnableAppEffectRedirectAtStartup = (
  hash = typeof window === 'undefined' ? '' : window.location.hash,
): boolean =>
  !new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash).has(
    'ssoExchangeToken',
  );

export const isAppEffectRedirectEnabledState = createAtomState<boolean>({
  key: 'isAppEffectRedirectEnabledState',
  // An IOS iframe arrives with a one-time token in the initial URL fragment.
  // Hold global auth redirects before React effects run, otherwise the router
  // can move to /welcome and strand the token inside returnToPath.
  defaultValue: shouldEnableAppEffectRedirectAtStartup(),
});
