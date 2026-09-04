import * as jwt from 'jsonwebtoken';

import { verifyIosSessionAssertion } from 'src/engine/core-modules/auth/utils/verify-ios-session-assertion.util';

const SECRET = 'test-ios-session-exchange-secret-that-is-long-enough';
const NOW = 1_788_480_000;

const signAssertion = (
  overrides: Record<string, unknown> = {},
  options: jwt.SignOptions = {},
) =>
  jwt.sign(
    {
      sub: '69e3f162-eed5-47dc-9c97-2c4d9b7e65a2',
      email: 'owner@example.com',
      name: 'IOS Owner',
      ios_workspace_id: '6374e4dc-e224-479b-8a3d-3c12df4a5d89',
      role: 'owner',
      jti: 'single-use-id',
      iat: NOW,
      exp: NOW + 60,
      iss: 'intelligence-os',
      aud: 'twenty-crm',
      ...overrides,
    },
    SECRET,
    {
      algorithm: 'HS256',
      ...options,
    },
  );

describe('verifyIosSessionAssertion', () => {
  it('accepts the exact IOS issuer, audience, algorithm and claims', () => {
    expect(verifyIosSessionAssertion(signAssertion(), SECRET, NOW)).toEqual({
      sub: '69e3f162-eed5-47dc-9c97-2c4d9b7e65a2',
      email: 'owner@example.com',
      name: 'IOS Owner',
      ios_workspace_id: '6374e4dc-e224-479b-8a3d-3c12df4a5d89',
      role: 'owner',
      jti: 'single-use-id',
      iat: NOW,
      exp: NOW + 60,
    });
  });

  it.each([
    ['issuer', { iss: 'other-app' }],
    ['audience', { aud: 'other-service' }],
    ['role', { role: 'super-admin' }],
    ['lifetime', { exp: NOW + 61 }],
    ['workspace id', { ios_workspace_id: 'not-a-uuid' }],
  ])('rejects an invalid %s', (_label, overrides) => {
    expect(() =>
      verifyIosSessionAssertion(signAssertion(overrides), SECRET, NOW),
    ).toThrow('Invalid IOS session assertion');
  });

  it('rejects any algorithm except HS256', () => {
    const token = jwt.sign(
      {
        sub: '69e3f162-eed5-47dc-9c97-2c4d9b7e65a2',
        email: 'owner@example.com',
        name: 'IOS Owner',
        ios_workspace_id: '6374e4dc-e224-479b-8a3d-3c12df4a5d89',
        role: 'owner',
        jti: 'single-use-id',
        iat: NOW,
        exp: NOW + 60,
        iss: 'intelligence-os',
        aud: 'twenty-crm',
      },
      SECRET,
      {
        algorithm: 'HS384',
      },
    );

    expect(() => verifyIosSessionAssertion(token, SECRET, NOW)).toThrow(
      'Invalid IOS session assertion',
    );
  });
});
