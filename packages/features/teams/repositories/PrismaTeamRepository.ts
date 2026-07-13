import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

const teamSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  bio: true,
  hideBranding: true,
  hideTeamProfileLink: true,
  isPrivate: true,
  hideBookATeamMember: true,
  theme: true,
  brandColor: true,
  darkBrandColor: true,
  timeZone: true,
  weekStart: true,
  timeFormat: true,
  parentId: true,
  isOrganization: true,
  createdAt: true,
} satisfies Prisma.TeamSelect;

export type TeamDTO = Prisma.TeamGetPayload<{ select: typeof teamSelect }>;

export type TeamCreateInput = {
  name: string;
  slug: string;
  bio?: string;
};

export type TeamUpdateInput = Partial<{
  name: string;
  slug: string;
  bio: string | null;
  logoUrl: string | null;
  theme: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
  hideBranding: boolean;
  hideTeamProfileLink: boolean;
  isPrivate: boolean;
  hideBookATeamMember: boolean;
  timeZone: string;
  weekStart: string;
  timeFormat: number | null;
}>;

export type TeamWithMembershipDTO = TeamDTO & {
  membership: {
    role: MembershipRole;
    accepted: boolean;
  };
};

export class PrismaTeamRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById({ id }: { id: number }): Promise<TeamDTO | null> {
    return this.prismaClient.team.findUnique({
      where: { id },
      select: teamSelect,
    });
  }

  async findBySlug({
    slug,
    parentId = null,
  }: {
    slug: string;
    parentId?: number | null;
  }): Promise<TeamDTO | null> {
    // Postgres does not enforce @@unique([slug, parentId]) when parentId is NULL
    // (NULLs are considered distinct), so uniqueness among top-level teams must be
    // checked explicitly with findFirst.
    return this.prismaClient.team.findFirst({
      where: { slug, parentId },
      select: teamSelect,
    });
  }

  async createWithOwner({
    data,
    ownerUserId,
  }: {
    data: TeamCreateInput;
    ownerUserId: number;
  }): Promise<TeamDTO> {
    return this.prismaClient.team.create({
      data: {
        ...data,
        members: {
          create: {
            userId: ownerUserId,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
      select: teamSelect,
    });
  }

  async update({ id, data }: { id: number; data: TeamUpdateInput }): Promise<TeamDTO> {
    return this.prismaClient.team.update({
      where: { id },
      data,
      select: teamSelect,
    });
  }

  async deleteById({ id }: { id: number }): Promise<void> {
    await this.prismaClient.team.delete({ where: { id } });
  }

  async findManyByUserIdIncludeMembership({ userId }: { userId: number }): Promise<TeamWithMembershipDTO[]> {
    const memberships = await this.prismaClient.membership.findMany({
      where: {
        userId,
        team: { isOrganization: false },
      },
      select: {
        role: true,
        accepted: true,
        team: { select: teamSelect },
      },
      orderBy: { team: { name: "asc" } },
    });

    return memberships.map(({ role, accepted, team }) => ({
      ...team,
      membership: { role, accepted },
    }));
  }
}
