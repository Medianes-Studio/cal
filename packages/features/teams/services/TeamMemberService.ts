import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ErrorWithCode } from "@calcom/lib/errors";
import { MembershipRole } from "@calcom/prisma/enums";

export interface ITeamMemberServiceDeps {
  membershipRepository: MembershipRepository;
}

export type TeamMemberDTO = {
  userId: number;
  name: string | null;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  timeZone: string;
  role: MembershipRole;
  accepted: boolean;
};

export class TeamMemberService {
  constructor(private deps: ITeamMemberServiceDeps) {}

  async listMembers({ teamId }: { teamId: number }): Promise<TeamMemberDTO[]> {
    const memberships = await this.deps.membershipRepository.findMembershipsWithUserByTeamId({ teamId });

    return memberships.map(({ role, accepted, user }) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      timeZone: user.timeZone,
      role,
      accepted,
    }));
  }

  async acceptOrLeave({
    teamId,
    userId,
    accept,
  }: {
    teamId: number;
    userId: number;
    accept: boolean;
  }): Promise<void> {
    const membership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
      userId,
      teamId,
    });
    if (!membership) {
      throw ErrorWithCode.Factory.NotFound(`User ${userId} has no membership in team ${teamId}`);
    }

    if (accept) {
      if (!membership.accepted) {
        await this.deps.membershipRepository.updateAcceptedByUserIdAndTeamId({
          userId,
          teamId,
          accepted: true,
        });
      }
      return;
    }

    if (membership.accepted && membership.role === MembershipRole.OWNER) {
      await this.ensureNotLastOwner({
        teamId,
        message: `Unable to leave team ${teamId}: the last owner must delete the team or transfer ownership first`,
      });
    }
    await this.deps.membershipRepository.deleteByUserIdAndTeamId({ userId, teamId });
  }

  async changeRole({
    teamId,
    targetUserId,
    role,
    actorUserId,
  }: {
    teamId: number;
    targetUserId: number;
    role: MembershipRole;
    actorUserId: number;
  }): Promise<void> {
    if (targetUserId === actorUserId) {
      throw ErrorWithCode.Factory.Forbidden("You cannot change your own role");
    }

    const [actor, target] = await Promise.all([
      this.deps.membershipRepository.findUniqueByUserIdAndTeamId({ userId: actorUserId, teamId }),
      this.deps.membershipRepository.findUniqueByUserIdAndTeamId({ userId: targetUserId, teamId }),
    ]);

    if (!actor || !actor.accepted) {
      throw ErrorWithCode.Factory.Forbidden(`You are not a member of team ${teamId}`);
    }
    if (!target) {
      throw ErrorWithCode.Factory.NotFound(`User ${targetUserId} has no membership in team ${teamId}`);
    }

    const actorIsOwner = actor.role === MembershipRole.OWNER;
    const ownerRoleInvolved = role === MembershipRole.OWNER || target.role === MembershipRole.OWNER;
    if (ownerRoleInvolved && !actorIsOwner) {
      throw ErrorWithCode.Factory.Forbidden("Only an owner can grant or revoke the owner role");
    }

    const demotesAcceptedOwner =
      target.role === MembershipRole.OWNER && role !== MembershipRole.OWNER && target.accepted;
    if (demotesAcceptedOwner) {
      await this.ensureNotLastOwner({
        teamId,
        message: `Unable to demote user ${targetUserId}: team ${teamId} must keep at least one owner`,
      });
    }

    await this.deps.membershipRepository.updateRoleByUserIdAndTeamId({
      userId: targetUserId,
      teamId,
      role,
    });
  }

  async removeMembers({
    teamId,
    userIds,
    actorUserId,
  }: {
    teamId: number;
    userIds: number[];
    actorUserId: number;
  }): Promise<void> {
    const actor = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
      userId: actorUserId,
      teamId,
    });
    if (!actor || !actor.accepted) {
      throw ErrorWithCode.Factory.Forbidden(`You are not a member of team ${teamId}`);
    }
    const actorIsOwner = actor.role === MembershipRole.OWNER;

    for (const userId of userIds) {
      if (userId === actorUserId) {
        throw ErrorWithCode.Factory.BadRequest("You cannot remove yourself; leave the team instead");
      }

      const target = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
        userId,
        teamId,
      });
      if (!target) {
        throw ErrorWithCode.Factory.NotFound(`User ${userId} has no membership in team ${teamId}`);
      }

      if (target.role === MembershipRole.OWNER) {
        if (!actorIsOwner) {
          throw ErrorWithCode.Factory.Forbidden("Only an owner can remove another owner");
        }
        if (target.accepted) {
          await this.ensureNotLastOwner({
            teamId,
            message: `Unable to remove user ${userId}: team ${teamId} must keep at least one owner`,
          });
        }
      }

      await this.deps.membershipRepository.deleteByUserIdAndTeamId({ userId, teamId });
    }
  }

  private async ensureNotLastOwner({ teamId, message }: { teamId: number; message: string }): Promise<void> {
    const acceptedOwners = await this.deps.membershipRepository.countAcceptedOwnersByTeamId({ teamId });
    if (acceptedOwners <= 1) {
      throw ErrorWithCode.Factory.Forbidden(message);
    }
  }
}
