import * as jwt from 'jsonwebtoken';

import { IosSessionExchangeService } from 'src/engine/core-modules/auth/services/ios-session-exchange.service';

const SECRET = 'test-ios-session-exchange-secret-that-is-long-enough';
const IOS_WORKSPACE_ID = '6374e4dc-e224-479b-8a3d-3c12df4a5d89';
const TWENTY_WORKSPACE_ID = '97bd8cac-6af7-4c96-93cd-49feae6b0de8';

const buildAssertion = () => {
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      sub: '69e3f162-eed5-47dc-9c97-2c4d9b7e65a2',
      email: 'owner@example.com',
      name: 'IOS Owner',
      ios_workspace_id: IOS_WORKSPACE_ID,
      role: 'owner',
      jti: 'single-use-id',
      iat: now,
      exp: now + 60,
      iss: 'intelligence-os',
      aud: 'twenty-crm',
    },
    SECRET,
    {
      algorithm: 'HS256',
    },
  );
};

const setup = ({
  mappings = { [IOS_WORKSPACE_ID]: TWENTY_WORKSPACE_ID },
} = {}) => {
  const redisSet = jest.fn().mockResolvedValue('OK');
  const workspaceRepository = {
    findOneBy: jest.fn().mockResolvedValue({
      id: TWENTY_WORKSPACE_ID,
      defaultRoleId: 'member-role-id',
    }),
  };
  const userRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: 'twenty-user-id',
      email: 'owner@example.com',
      firstName: 'IOS',
      lastName: 'Owner',
      disabled: false,
    }),
    create: jest.fn(),
    save: jest.fn(),
  };
  const userWorkspaceRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 'user-workspace-id' }),
  };
  const ssoExchangeTokenService = {
    generateSsoExchangeToken: jest.fn().mockResolvedValue({
      token: 'single-use-sso-token',
      expiresAt: new Date('2026-09-04T18:00:00.000Z'),
    }),
  };
  const roleService = {
    getRoleByUniversalIdentifier: jest
      .fn()
      .mockResolvedValue({ id: 'admin-role-id' }),
  };
  const userRoleService = {
    assignRoleToManyUserWorkspace: jest.fn(),
  };
  const userService = {
    loadWorkspaceMember: jest
      .fn()
      .mockResolvedValue({ id: 'workspace-member-id' }),
  };

  const service = new IosSessionExchangeService(
    {
      get: jest.fn((key: string) => {
        if (key === 'IOS_SESSION_EXCHANGE_SECRET') return SECRET;
        if (key === 'IOS_WORKSPACE_MAPPINGS') {
          return JSON.stringify(mappings);
        }
        return undefined;
      }),
    } as never,
    { getClient: () => ({ set: redisSet }) } as never,
    workspaceRepository as never,
    userRepository as never,
    userWorkspaceRepository as never,
    { addUserToWorkspaceIfUserNotInWorkspace: jest.fn() } as never,
    userService as never,
    roleService as never,
    userRoleService as never,
    ssoExchangeTokenService as never,
  );

  return {
    redisSet,
    roleService,
    service,
    ssoExchangeTokenService,
    userRoleService,
    workspaceRepository,
  };
};

describe('IosSessionExchangeService', () => {
  it('consumes the assertion once and returns a Twenty one-time token', async () => {
    const {
      redisSet,
      roleService,
      service,
      ssoExchangeTokenService,
      userRoleService,
      workspaceRepository,
    } = setup();

    await expect(
      service.exchange(`Bearer ${buildAssertion()}`),
    ).resolves.toEqual({
      external_workspace_id: TWENTY_WORKSPACE_ID,
      external_member_id: 'workspace-member-id',
      sso_exchange_token: 'single-use-sso-token',
      expires_at: '2026-09-04T18:00:00.000Z',
    });

    expect(redisSet).toHaveBeenCalledWith(
      'ios:session-exchange:jti:single-use-id',
      '1',
      'EX',
      expect.any(Number),
      'NX',
    );
    expect(workspaceRepository.findOneBy).toHaveBeenCalledWith({
      id: TWENTY_WORKSPACE_ID,
    });
    expect(roleService.getRoleByUniversalIdentifier).toHaveBeenCalled();
    expect(userRoleService.assignRoleToManyUserWorkspace).toHaveBeenCalledWith({
      workspaceId: TWENTY_WORKSPACE_ID,
      userWorkspaceIds: ['user-workspace-id'],
      roleId: 'admin-role-id',
    });
    expect(ssoExchangeTokenService.generateSsoExchangeToken).toHaveBeenCalled();
  });

  it('rejects a replay before issuing a browser token', async () => {
    const { redisSet, service, ssoExchangeTokenService } = setup();

    redisSet.mockResolvedValue(null);

    await expect(
      service.exchange(`Bearer ${buildAssertion()}`),
    ).rejects.toThrow('Invalid or already used IOS session assertion');
    expect(
      ssoExchangeTokenService.generateSsoExchangeToken,
    ).not.toHaveBeenCalled();
  });

  it('rejects a workspace without an explicit IOS-to-Twenty mapping', async () => {
    const { service, workspaceRepository } = setup({ mappings: {} });

    await expect(
      service.exchange(`Bearer ${buildAssertion()}`),
    ).rejects.toThrow('IOS workspace is not mapped to Twenty');
    expect(workspaceRepository.findOneBy).not.toHaveBeenCalled();
  });
});
