import type { PrismaClient } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

const invitedUserSelect = {
  id: true,
  email: true,
  username: true,
  invitedTo: true,
  locale: true,
} as const;

export type InvitedUserDTO = {
  id: number;
  email: string;
  username: string | null;
  invitedTo: number | null;
  locale: string | null;
};

export class PrismaTeamInviteRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findUserByEmail({ email }: { email: string }): Promise<InvitedUserDTO | null> {
    return this.prismaClient.user.findUnique({
      where: { email: email.toLowerCase() },
      select: invitedUserSelect,
    });
  }

  async createInvitedUser({ email, teamId }: { email: string; teamId: number }): Promise<InvitedUserDTO> {
    return this.prismaClient.user.create({
      data: {
        email: email.toLowerCase(),
        invitedTo: teamId,
        identityProvider: IdentityProvider.CAL,
      },
      select: invitedUserSelect,
    });
  }

  async createVerificationToken({
    identifier,
    token,
    expires,
    teamId,
  }: {
    identifier: string;
    token: string;
    expires: Date;
    teamId: number;
  }): Promise<{ token: string }> {
    return this.prismaClient.verificationToken.create({
      data: { identifier, token, expires, teamId },
      select: { token: true },
    });
  }

  async findVerificationTokenByIdentifier({
    identifier,
  }: {
    identifier: string;
  }): Promise<{ token: string; expires: Date } | null> {
    return this.prismaClient.verificationToken.findFirst({
      where: {
        identifier,
        teamId: { not: null },
      },
      select: { token: true, expires: true },
      orderBy: { expires: "desc" },
    });
  }
}
