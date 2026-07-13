import { getTeamService } from "@calcom/features/di/containers/Team";
import { MembershipService } from "@calcom/features/membership/services/membershipService";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TGetSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetSchema;
};

export async function getHandler({ ctx, input }: GetOptions) {
  const membershipService = new MembershipService();
  const membership = await membershipService.checkMembership(input.teamId, ctx.user.id);

  if (!membership.isMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this team.",
    });
  }

  const teamService = getTeamService();
  const team = await teamService.getById({ teamId: input.teamId });

  return {
    ...team,
    membership: {
      role: membership.role,
      isAdmin: membership.isAdmin,
      isOwner: membership.isOwner,
    },
  };
}

export default getHandler;
