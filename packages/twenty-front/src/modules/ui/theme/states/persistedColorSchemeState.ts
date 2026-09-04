import { type ColorScheme } from '@/workspace-member/types/WorkspaceMember';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const persistedColorSchemeState = createAtomState<ColorScheme>({
  key: 'persistedColorSchemeState',
  defaultValue: 'System',
  useLocalStorage: true,
  // Sync read — avoids first paint as System→OS-dark before IosHostThemeBridge
  // (settings islands were landing charcoal after /sign-in-up → /settings/*).
  localStorageOptions: { getOnInit: true },
});
