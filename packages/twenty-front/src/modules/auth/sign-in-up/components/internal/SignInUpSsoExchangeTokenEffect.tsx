import { useRedeemSsoExchangeToken } from '@/auth/hooks/useRedeemSsoExchangeToken';
import { isValidReturnToPath } from '@/auth/utils/isValidReturnToPath';
import { isHostedInIosEmbed } from '@/domain-manager/utils/iosEmbedHost';
import { useLayoutEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';

type SignInUpSsoExchangeTokenEffectProps = {
  onFailure?: () => void;
};

export const SignInUpSsoExchangeTokenEffect = ({
  onFailure,
}: SignInUpSsoExchangeTokenEffectProps) => {
  const { redeemSsoExchangeToken } = useRedeemSsoExchangeToken();

  useLayoutEffect(() => {
    const fragmentParams = new URLSearchParams(
      window.location.hash.substring(1),
    );
    const ssoExchangeToken = fragmentParams.get('ssoExchangeToken');

    if (!isDefined(ssoExchangeToken)) {
      return;
    }

    // Stripping synchronously through window.history rather than the router
    // (whose data-router navigations defer the replace) latches re-invoked and
    // remounted effects out: they re-read window.location and find no token
    const searchParams = new URLSearchParams(window.location.search);
    const returnToPath = fragmentParams.get('returnToPath');
    const iosTheme = fragmentParams.get('iosTheme');

    if (isDefined(returnToPath) && isValidReturnToPath(returnToPath)) {
      searchParams.set('returnToPath', returnToPath);
    }

    const search = searchParams.toString();

    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + (search ? `?${search}` : ''),
    );

    if (isHostedInIosEmbed() && (iosTheme === 'light' || iosTheme === 'dark')) {
      try {
        sessionStorage.setItem('iosHostTheme', iosTheme);
      } catch {
        // Storage can be denied in hardened iframes; authentication still proceeds.
      }
    }

    void redeemSsoExchangeToken(ssoExchangeToken).then((didRedeem) => {
      if (!didRedeem) {
        onFailure?.();
      }
    });
  }, [onFailure, redeemSsoExchangeToken]);

  return <></>;
};
