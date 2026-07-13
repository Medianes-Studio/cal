import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { MembershipRole } from "@calcom/prisma/enums";

export type PermissionCheckInput = {
  userId: number;
  teamId: number;
  /**
   * Granular PBAC permissions (custom Role/RolePermission tables) are not part of
   * Cal.diy, so this string is informational only: authorization is resolved through
   * the membership-role fallback. It is kept in the signature so call sites stay
   * compatible if granular PBAC is reintroduced.
   */
  permission: string;
  fallbackRoles: MembershipRole[];
};

export class PermissionCheckService {
  constructor(private readonly membershipRepository: MembershipRepository = new MembershipRepository()) {}

  async checkPermission({ userId, teamId, fallbackRoles }: PermissionCheckInput): Promise<boolean> {
    const membership = await this.membershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId });
    if (!membership || !membership.accepted) {
      return false;
    }
    return fallbackRoles.includes(membership.role);
  }
}
