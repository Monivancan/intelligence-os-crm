import * as jwt from 'jsonwebtoken';

import { IosSessionExchangeService } from 'src/engine/core-modules/auth/services/ios-session-exchange.service';

const SECRET = 'test-ios-session-exchange-secret-that-is-long-enough';
const IOS_WORKSPACE_ID = '6374e4dc-e224-479b-8a3d-3c12df4a5d89';
const TWENTY_WORKSPACE_ID = '97bd8cac-6af7-4c96-93cd-49feae6b0de8';

const buildAssertion = (overrides: Record<string, unknown> = {}) => {
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
      ...overrides,
    },
    SECRET,
    {
      algorithm: 'HS256',
    },
  );
};

const setup = ({
  mappings = { [IOS_WORKSPACE_ID]: TWENTY_WORKSPACE_ID },
  existingMembership = true,
  workspaceDefaultRoleId = 'member-role-id',
} = {}) => {
  const redisSet = jest.fn().mockResolvedValue('OK');
  const workspaceRepository = {
    findOneBy: jest.fn().mockResolvedValue({
      id: TWENTY_WORKSPACE_ID,
      defaultRoleId: workspaceDefaultRoleId,
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
    findOne: jest
      .fn()
      .mockResolvedValueOnce(
        existingMembership ? { id: 'user-workspace-id' } : null,
      )
      .mockResolvedValue({ id: 'user-workspace-id' }),
    findOneOrFail: jest.fn().mockResolvedValue({ id: 'user-workspace-id' }),
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
    getWorkspaceRoles: jest.fn().mockResolvedValue([
      {
        id: 'admin-role-id',
        label: 'Admin',
        universalIdentifier: '20202020-02c2-43f2-b94d-cab1f2b532eb',
        canBeAssignedToUsers: true,
        canUpdateAllSettings: true,
      },
      {
        id: 'member-role-id',
        label: 'Member',
        universalIdentifier: 'member-role-universal-id',
        canBeAssignedToUsers: true,
        canUpdateAllSettings: false,
      },
    ]),
  };
  const userRoleService = {
    assignRoleToManyUserWorkspace: jest.fn(),
  };
  const userService = {
    loadWorkspaceMember: jest
      .fn()
      .mockResolvedValue({ id: 'workspace-member-id' }),
  };
  const userWorkspaceService = {
    addUserToWorkspaceIfUserNotInWorkspace: jest.fn(),
  };
  let isProfileCreationPending = true;
  const onboardingService = {
    completeOnboardingProfileStepIfNameProvided: jest.fn(() => {
      isProfileCreationPending = false;
    }),
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
    userWorkspaceService as never,
    onboardingService as never,
    userService as never,
    roleService as never,
    userRoleService as never,
    ssoExchangeTokenService as never,
  );

  return {
    redisSet,
    isProfileCreationPending: () => isProfileCreationPending,
    onboardingService,
    roleService,
    service,
    ssoExchangeTokenService,
    userRoleService,
    userWorkspaceService,
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

  it('adds a first-time member with the canonical Member role and completes profile onboarding', async () => {
    const { onboardingService, service, userWorkspaceService } = setup({
      existingMembership: false,
      workspaceDefaultRoleId: 'admin-role-id',
    });

    await expect(
      service.exchange(`Bearer ${buildAssertion({ role: 'member' })}`),
    ).resolves.toMatchObject({
      external_workspace_id: TWENTY_WORKSPACE_ID,
      external_member_id: 'workspace-member-id',
    });

    expect(
      userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'twenty-user-id' }),
      expect.objectContaining({ id: TWENTY_WORKSPACE_ID }),
      'member-role-id',
    );
    expect(
      onboardingService.completeOnboardingProfileStepIfNameProvided,
    ).toHaveBeenCalledWith({
      userId: 'twenty-user-id',
      workspaceId: TWENTY_WORKSPACE_ID,
      firstName: 'IOS',
      lastName: 'Owner',
    });
  });

  it('completes profile onboarding for an existing membership left pending by an interrupted exchange', async () => {
    const { isProfileCreationPending, service } = setup({
      existingMembership: true,
    });

    await service.exchange(`Bearer ${buildAssertion({ role: 'member' })}`);

    expect(isProfileCreationPending()).toBe(false);
  });

  it('fails closed when the canonical non-admin Member role is unavailable', async () => {
    const { roleService, service, userWorkspaceService } = setup({
      existingMembership: false,
      workspaceDefaultRoleId: 'admin-role-id',
    });

    roleService.getWorkspaceRoles.mockResolvedValue([
      {
        id: 'admin-role-id',
        label: 'Member',
        universalIdentifier: '20202020-02c2-43f2-b94d-cab1f2b532eb',
        canBeAssignedToUsers: true,
        canUpdateAllSettings: true,
      },
    ]);

    await expect(
      service.exchange(`Bearer ${buildAssertion({ role: 'member' })}`),
    ).rejects.toThrow('Twenty workspace Member role is unavailable');
    expect(
      userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace,
    ).not.toHaveBeenCalled();
  });
});
