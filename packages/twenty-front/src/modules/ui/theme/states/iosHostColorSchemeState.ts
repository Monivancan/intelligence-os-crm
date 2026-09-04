import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { type ColorScheme } from '@/workspace-member/types/WorkspaceMember';

export const iosHostColorSchemeState = createAtomState<ColorScheme | null>({
  key: 'iosHostColorSchemeState',
  defaultValue: null,
});
