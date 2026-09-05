import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { SsoExchangeTokenService } from 'src/engine/core-modules/auth/token/services/sso-exchange-token.service';
import {
  type IosSessionAssertion,
  verifyIosSessionAssertion,
} from 'src/engine/core-modules/auth/utils/verify-ios-session-assertion.util';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { UserService } from 'src/engine/core-modules/user/services/user.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { MEMBER_ROLE_LABEL } from 'src/engine/metadata-modules/permissions/constants/member-role-label.constants';
import { RoleService } from 'src/engine/metadata-modules/role/role.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

@Injectable()
export class IosSessionExchangeService {
  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly redisClientService: RedisClientService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
    private readonly userWorkspaceService: UserWorkspaceService,
    private readonly onboardingService: OnboardingService,
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    private readonly userRoleService: UserRoleService,
    private readonly ssoExchangeTokenService: SsoExchangeTokenService,
  ) {}

  async exchange(authorization: string | undefined) {
    let assertion: IosSessionAssertion;

    try {
      assertion = verifyIosSessionAssertion(
        this.getBearerToken(authorization),
        this.getExchangeSecret(),
      );
    } catch {
      throw new UnauthorizedException('Invalid IOS session assertion');
    }
    const workspaceId = this.getWorkspaceMappings()[assertion.ios_workspace_id];

    if (!isDefined(workspaceId) || !isUUID(workspaceId)) {
      throw new NotFoundException('IOS workspace is not mapped to Twenty');
    }

    await this.consumeAssertionOnce(assertion.jti, assertion.exp);

    const workspace = await this.workspaceRepository.findOneBy({
      id: workspaceId,
    });

    if (!isDefined(workspace)) {
      throw new NotFoundException('IOS workspace is not mapped to Twenty');
    }

    const user = await this.findOrCreateUser(assertion.email, assertion.name);

    if (user.disabled) {
      throw new UnauthorizedException('IOS session is not authorized');
    }

    const roleId = await this.getRoleId({
      workspace,
      isAdmin: assertion.role === 'owner' || assertion.role === 'admin',
    });
    let userWorkspace = await this.userWorkspaceRepository.findOne({
      where: { userId: user.id, workspaceId: workspace.id },
    });

    if (!isDefined(userWorkspace)) {
      await this.userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace(
        user,
        workspace,
        roleId,
      );
      userWorkspace = await this.userWorkspaceRepository.findOneOrFail({
        where: { userId: user.id, workspaceId: workspace.id },
      });
    } else {
      await this.userRoleService.assignRoleToManyUserWorkspace({
        workspaceId: workspace.id,
        userWorkspaceIds: [userWorkspace.id],
        roleId,
      });
    }

    const [firstName, ...lastNameParts] = assertion.name.trim().split(/\s+/);

    await this.onboardingService.completeOnboardingProfileStepIfNameProvided({
      userId: user.id,
      workspaceId: workspace.id,
      firstName,
      lastName: lastNameParts.join(' '),
    });

    // IOS owns the workspace setup flow, so an authenticated IOS member must
    // enter CRM directly instead of repeating Twenty's standalone onboarding.
    await this.onboardingService.setOnboardingConnectAccountPending({
      userId: user.id,
      workspaceId: workspace.id,
      value: false,
    });
    await this.onboardingService.setOnboardingInstallAppsPending({
      userId: user.id,
      workspaceId: workspace.id,
      value: false,
    });
    await this.onboardingService.setOnboardingCreateProfilePending({
      userId: user.id,
      workspaceId: workspace.id,
      value: false,
    });
    await this.onboardingService.setOnboardingInviteTeamPending({
      userId: user.id,
      workspaceId: workspace.id,
      value: false,
    });
    await this.onboardingService.setOnboardingBookCallPending({
      userId: user.id,
      workspaceId: workspace.id,
      value: false,
    });

    const workspaceMember = await this.userService.loadWorkspaceMember(
      user,
      workspace,
    );

    if (!isDefined(workspaceMember)) {
      throw new NotFoundException('Twenty workspace member is unavailable');
    }

    const ssoExchangeToken =
      await this.ssoExchangeTokenService.generateSsoExchangeToken({
        userId: user.id,
        authProvider: AuthProviderEnum.SSO,
        workspaceId: workspace.id,
      });

    return {
      external_workspace_id: workspace.id,
      external_member_id: workspaceMember.id,
      sso_exchange_token: ssoExchangeToken.token,
      expires_at: ssoExchangeToken.expiresAt.toISOString(),
    };
  }

  private getBearerToken(authorization: string | undefined): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid IOS session assertion');
    }

    const token = authorization.slice('Bearer '.length);

    if (token.length === 0) {
      throw new UnauthorizedException('Invalid IOS session assertion');
    }

    return token;
  }

  private getExchangeSecret(): string {
    const secret = this.twentyConfigService.get('IOS_SESSION_EXCHANGE_SECRET');

    if (typeof secret !== 'string' || secret.length < 32) {
      throw new UnauthorizedException('IOS session exchange is not configured');
    }

    return secret;
  }

  private getWorkspaceMappings(): Record<string, string> {
    try {
      const mappings = JSON.parse(
        this.twentyConfigService.get('IOS_WORKSPACE_MAPPINGS'),
      ) as unknown;

      if (typeof mappings !== 'object' || mappings === null) {
        return {};
      }

      return mappings as Record<string, string>;
    } catch {
      return {};
    }
  }

  private async consumeAssertionOnce(jti: string, expiresAt: number) {
    const ttlSeconds = Math.min(
      60,
      Math.max(1, expiresAt - Math.floor(Date.now() / 1000)),
    );
    const result = await this.redisClientService
      .getClient()
      .set(`ios:session-exchange:jti:${jti}`, '1', 'EX', ttlSeconds, 'NX');

    if (result !== 'OK') {
      throw new UnauthorizedException(
        'Invalid or already used IOS session assertion',
      );
    }
  }

  private async findOrCreateUser(email: string, name: string) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (isDefined(existingUser)) {
      return existingUser;
    }

    const [firstName, ...lastNameParts] = name.trim().split(/\s+/);

    return this.userRepository.save(
      this.userRepository.create({
        email: normalizedEmail,
        firstName,
        lastName: lastNameParts.join(' '),
        isEmailVerified: true,
      }),
    );
  }

  private async getRoleId({
    workspace,
    isAdmin,
  }: {
    workspace: WorkspaceEntity;
    isAdmin: boolean;
  }) {
    if (!isAdmin) {
      const memberRole = (
        await this.roleService.getWorkspaceRoles(workspace.id)
      ).find(
        (role) =>
          role.label === MEMBER_ROLE_LABEL &&
          role.universalIdentifier !==
            STANDARD_ROLE.admin.universalIdentifier &&
          role.canBeAssignedToUsers === true &&
          role.canUpdateAllSettings === false,
      );

      if (!isDefined(memberRole)) {
        throw new NotFoundException(
          'Twenty workspace Member role is unavailable',
        );
      }

      return memberRole.id;
    }

    const adminRole = await this.roleService.getRoleByUniversalIdentifier({
      universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
      workspaceId: workspace.id,
    });

    if (!isDefined(adminRole)) {
      throw new NotFoundException('Twenty workspace admin role is unavailable');
    }

    return adminRole.id;
  }
}
