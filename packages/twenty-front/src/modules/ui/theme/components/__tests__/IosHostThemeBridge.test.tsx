import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { IosHostThemeBridge } from '@/ui/theme/components/IosHostThemeBridge';

const setIosHostColorScheme = jest.fn();

jest.mock('@/ui/utilities/state/jotai/hooks/useSetAtomState', () => ({
  useSetAtomState: () => setIosHostColorScheme,
}));

jest.mock('@/domain-manager/utils/iosEmbedHost', () => ({
  getIosEmbedHostOrigin: () => 'https://ios.neeyafit.com',
  isAllowedIosHostMessage: () => true,
}));

describe('IosHostThemeBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.classList.remove('dark', 'light');
  });

  it('applies an embed theme without changing the standalone preference', () => {
    localStorage.setItem('persistedColorSchemeState', JSON.stringify('Dark'));
    const postMessage = jest
      .spyOn(window.parent, 'postMessage')
      .mockImplementation();
    const { unmount } = render(
      <MemoryRouter>
        <IosHostThemeBridge />
      </MemoryRouter>,
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: 'ios-host', type: 'set-theme', theme: 'light' },
          origin: 'https://ios.neeyafit.com',
          source: window.parent,
        }),
      );
    });

    expect(sessionStorage.getItem('iosHostTheme')).toBe('light');
    expect(document.documentElement).toHaveClass('light');
    expect(localStorage.getItem('persistedColorSchemeState')).toBe(
      JSON.stringify('Dark'),
    );
    expect(setIosHostColorScheme).toHaveBeenCalledWith('Light');

    unmount();
    postMessage.mockRestore();
  });
});
