import { randomBytes } from "node:crypto";
import type { MembershipRepository as MembershipRepositoryClass } from "@calcom/features/membership/repositories/MembershipRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { MembershipRole } from "@calcom/prisma/enums";
import type { TFunction } from "i18next";
import type { PrismaTeamInviteRepository } from "../repositories/PrismaTeamInviteRepository";
import type { PrismaTeamRepository } from "../repositories/PrismaTeamRepository";

const log = logger.getSubLogger({ prefix: ["features/teams/services/TeamInviteService"] });

const INVITE_TOKEN_VALIDITY_DAYS = 7;

export interface ITeamInviteServiceDeps {
  teamInviteRepository: PrismaTeamInviteRepository;
  teamRepository: PrismaTeamRepository;
  membershipRepository: MembershipRepositoryClass;
}

export type TeamInvitation = {
  email: string;
  role: MembershipRole;
};

export type InviteMembersResult = {
  invited: string[];
};

export class TeamInviteService {
  constructor(private deps: ITeamInviteServiceDeps) {}

  async inviteMembers({
    teamId,
    invitations,
    inviterName,
    translation,
  }: {
    teamId: number;
    invitations: TeamInvitation[];
    inviterName: string;
    translation: TFunction;
  }): Promise<InviteMembersResult> {
    const team = await this.deps.teamRepository.findById({ id: teamId });
    if (!team) {
      throw ErrorWithCode.Factory.NotFound(`Team ${teamId} not found`);
    }

    const invited: string[] = [];
    for (const invitation of invitations) {
      const email = invitation.email.toLowerCase();
      const joinLink = await this.createMembershipAndGetJoinLink({
        teamId,
        email,
        role: invitation.role,
      });

      await this.sendInviteEmail({
        to: email,
        teamName: team.name,
        inviterName,
        joinLink: joinLink.url,
        isExistingUser: joinLink.isExistingUser,
        translation,
      });
      invited.push(email);
    }

    return { invited };
  }

  private async createMembershipAndGetJoinLink({
    teamId,
    email,
    role,
  }: {
    teamId: number;
    email: string;
    role: MembershipRole;
  }): Promise<{ url: string; isExistingUser: boolean }> {
    const existingUser = await this.deps.teamInviteRepository.findUserByEmail({ email });

    if (!existingUser) {
      const newUser = await this.deps.teamInviteRepository.createInvitedUser({ email, teamId });
      await MembershipRepository.create({
        teamId,
        userId: newUser.id,
        role,
        accepted: false,
      });
      const token = await this.createSignupToken({ email, teamId });
      return { url: this.buildSignupLink(token), isExistingUser: false };
    }

    const existingMembership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
      userId: existingUser.id,
      teamId,
    });
    if (existingMembership) {
      throw ErrorWithCode.Factory.BadRequest(
        `${email} is already a member of this team or has a pending invitation`
      );
    }

    await MembershipRepository.create({
      teamId,
      userId: existingUser.id,
      role,
      accepted: false,
    });

    // A user without a username is an invite stub that has not signed up yet: point
    // it to the signup flow (reusing its pending token when possible) instead of /teams.
    const isStubUser = existingUser.username === null;
    if (isStubUser) {
      const pendingToken = await this.deps.teamInviteRepository.findVerificationTokenByIdentifier({
        identifier: email,
      });
      const token =
        pendingToken && pendingToken.expires > new Date()
          ? pendingToken.token
          : await this.createSignupToken({ email, teamId });
      return { url: this.buildSignupLink(token), isExistingUser: false };
    }

    return { url: `${WEBAPP_URL}/teams`, isExistingUser: true };
  }

  private async createSignupToken({ email, teamId }: { email: string; teamId: number }): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + INVITE_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    await this.deps.teamInviteRepository.createVerificationToken({
      identifier: email,
      token,
      expires,
      teamId,
    });
    return token;
  }

  private buildSignupLink(token: string): string {
    return `${WEBAPP_URL}/signup?token=${token}&callbackUrl=${WEBAPP_URL}/getting-started`;
  }

  private async sendInviteEmail({
    to,
    teamName,
    inviterName,
    joinLink,
    isExistingUser,
    translation,
  }: {
    to: string;
    teamName: string;
    inviterName: string;
    joinLink: string;
    isExistingUser: boolean;
    translation: TFunction;
  }): Promise<void> {
    try {
      const { sendTeamInviteEmail } = await import("@calcom/emails/organization-email-service");
      await sendTeamInviteEmail({
        language: translation,
        from: inviterName,
        to,
        teamName,
        joinLink,
        isCalcomMember: isExistingUser,
        isAutoJoin: false,
        isOrg: false,
        parentTeamName: undefined,
        isExistingUserMovedToOrg: false,
        prevLink: null,
        newLink: null,
      });
    } catch (error) {
      // The invitation stays valid even if the email cannot be delivered: the invitee
      // can still accept from /teams (or the resent link), so we log instead of failing.
      log.error(`Failed to send team invite email to ${to}`, error);
    }
  }
}
