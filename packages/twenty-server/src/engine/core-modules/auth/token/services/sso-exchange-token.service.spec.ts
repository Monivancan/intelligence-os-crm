import { SsoExchangeTokenService } from 'src/engine/core-modules/auth/token/services/sso-exchange-token.service';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';

describe('SsoExchangeTokenService workspace targeting', () => {
  it('keeps the target workspace in the one-time exchange', async () => {
    const saved = {
      id: 'app-token-id',
      userId: 'user-id',
      workspaceId: 'workspace-id',
      expiresAt: new Date(Date.now() + 60_000),
      context: {
        authProvider: AuthProviderEnum.SSO,
      },
    };
    const repository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockImplementation((value) => {
        Object.assign(saved, value);
        return value;
      }),
      findOneBy: jest.fn().mockResolvedValue(saved),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const service = new SsoExchangeTokenService(
      repository as never,
      {
        get: () => '5m',
      } as never,
    );

    const token = await service.generateSsoExchangeToken({
      userId: 'user-id',
      authProvider: AuthProviderEnum.SSO,
      workspaceId: 'workspace-id',
    });

    await expect(
      service.validateAndConsumeSsoExchangeTokenOrThrow(token.token),
    ).resolves.toEqual({
      userId: 'user-id',
      authProvider: AuthProviderEnum.SSO,
      workspaceId: 'workspace-id',
    });
  });
});
