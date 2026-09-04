import { shouldEnableAppEffectRedirectAtStartup } from '@/app/states/isAppEffectRedirectEnabledState';

describe('shouldEnableAppEffectRedirectAtStartup', () => {
  it('holds navigation while an IOS SSO exchange token is present', () => {
    expect(
      shouldEnableAppEffectRedirectAtStartup(
        '#ssoExchangeToken=one-time&returnToPath=%2Fobjects%2Fpeople',
      ),
    ).toBe(false);
  });

  it('leaves ordinary navigation enabled', () => {
    expect(shouldEnableAppEffectRedirectAtStartup('')).toBe(true);
    expect(shouldEnableAppEffectRedirectAtStartup('#iosTheme=dark')).toBe(true);
  });
});
