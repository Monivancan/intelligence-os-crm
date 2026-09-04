import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { BrowserRouter, useSearchParams } from 'react-router-dom';

import { SignInUpSsoExchangeTokenEffect } from '@/auth/sign-in-up/components/internal/SignInUpSsoExchangeTokenEffect';

const redeemSsoExchangeTokenMock = jest.fn();

jest.mock('@/auth/hooks/useRedeemSsoExchangeToken', () => ({
  useRedeemSsoExchangeToken: () => ({
    redeemSsoExchangeToken: redeemSsoExchangeTokenMock,
  }),
}));

jest.mock('@/domain-manager/utils/iosEmbedHost', () => ({
  isHostedInIosEmbed: () => true,
}));

const SearchParamsProbe = () => {
  const [searchParams] = useSearchParams();

  return <div data-testid="search-params">{searchParams.toString()}</div>;
};

// BrowserRouter because the effect reads and strips window.location, which
// MemoryRouter never touches
const renderEffect = (initialUrl: string, onFailure?: () => void) => {
  window.history.replaceState(null, '', initialUrl);

  return render(
    <StrictMode>
      <BrowserRouter>
        <SignInUpSsoExchangeTokenEffect onFailure={onFailure} />
        <SearchParamsProbe />
      </BrowserRouter>
    </StrictMode>,
  );
};

const getSearchParams = () => screen.getByTestId('search-params').textContent;

describe('SignInUpSsoExchangeTokenEffect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redeemSsoExchangeTokenMock.mockResolvedValue(true);
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redeems the single use token at most once', async () => {
    renderEffect('/sign-in-up#ssoExchangeToken=sso-exchange-token');

    await waitFor(() => {
      expect(redeemSsoExchangeTokenMock).toHaveBeenCalledWith(
        'sso-exchange-token',
      );
    });
    expect(redeemSsoExchangeTokenMock).toHaveBeenCalledTimes(1);
  });

  it('strips the full embed fragment while preserving its safe return path', async () => {
    renderEffect(
      '/sign-in-up#ssoExchangeToken=sso-exchange-token&returnToPath=%2Fobjects%2Fpeople&iosTheme=dark',
    );

    await waitFor(() => {
      expect(window.location.hash).toBe('');
    });
    expect(window.location.search).toBe('?returnToPath=%2Fobjects%2Fpeople');
    expect(sessionStorage.getItem('iosHostTheme')).toBe('dark');
    expect(redeemSsoExchangeTokenMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the url carries no token', () => {
    renderEffect('/sign-in-up');

    expect(redeemSsoExchangeTokenMock).not.toHaveBeenCalled();
    expect(getSearchParams()).toBe('');
  });

  it('shows the embed session-expired state when redemption fails', async () => {
    const onFailure = jest.fn();

    redeemSsoExchangeTokenMock.mockResolvedValue(false);
    renderEffect('/sign-in-up#ssoExchangeToken=sso-exchange-token', onFailure);

    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(1));
  });

  it('clears the token before denied theme storage and still redeems', async () => {
    const setItem = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        expect(window.location.hash).toBe('');
        throw new DOMException('Storage denied', 'SecurityError');
      });

    renderEffect(
      '/sign-in-up#ssoExchangeToken=sso-exchange-token&iosTheme=dark',
    );

    await waitFor(() => {
      expect(redeemSsoExchangeTokenMock).toHaveBeenCalledWith(
        'sso-exchange-token',
      );
    });
    expect(window.location.hash).toBe('');
    expect(setItem).toHaveBeenCalledWith('iosHostTheme', 'dark');
  });
});
