import { buildContentSecurityPolicy } from 'src/utils/build-content-security-policy.util';

describe('buildContentSecurityPolicy', () => {
  it('allows framing only from Twenty itself and the two exact IOS origins', () => {
    expect(buildContentSecurityPolicy()).toBe(
      'frame-ancestors https://ios.neeyafit.com http://localhost:3001',
    );
  });
});
