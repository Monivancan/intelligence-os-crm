import {
  getIosEmbedHostOrigin,
  isAllowedIosHostMessage,
} from '@/domain-manager/utils/iosEmbedHost';

describe('IOS embed host boundary', () => {
  it.each([
    ['https://ios.neeyafit.com/crm', 'https://ios.neeyafit.com'],
    ['http://localhost:3001/crm', 'http://localhost:3001'],
  ])('accepts the exact allowed referrer %s', (referrer, origin) => {
    expect(getIosEmbedHostOrigin(referrer)).toBe(origin);
  });

  it.each([
    'https://evil.example/crm',
    'https://ios.neeyafit.com.evil.example/crm',
    'http://localhost:3002/crm',
    '',
  ])('rejects the referrer %s', (referrer) => {
    expect(getIosEmbedHostOrigin(referrer)).toBeNull();
  });

  it('requires both the exact origin and the parent window source', () => {
    const parent = {} as Window;

    expect(
      isAllowedIosHostMessage(
        { origin: 'https://ios.neeyafit.com', source: parent },
        parent,
      ),
    ).toBe(true);
    expect(
      isAllowedIosHostMessage(
        { origin: 'https://ios.neeyafit.com', source: {} as Window },
        parent,
      ),
    ).toBe(false);
    expect(
      isAllowedIosHostMessage(
        { origin: 'https://evil.example', source: parent },
        parent,
      ),
    ).toBe(false);
  });
});
