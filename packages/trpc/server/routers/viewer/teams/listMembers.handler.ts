import { getTeamMemberService, getTeamService } from "@calcom/features/di/containers/Team";
import { MembershipService } from "@calcom/features/membership/services/membershipService";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TListMembersSchema } from "./listMembers.schema";

type ListMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersSchema;
};

export async function listMembersHandler({ ctx, input }: ListMembersOptions) {
  const membershipService = new MembershipService();
  const membership = await membershipService.checkMembership(input.teamId, ctx.user.id);

  if (!membership.isMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this team.",
    });
  }

  const team = await getTeamService().getById({ teamId: input.teamId });
  if (team.isPrivate && !membership.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This team is private; only admins can list its members.",
    });
  }

  return getTeamMemberService().listMembers({ teamId: input.teamId });
}

export default listMembersHandler;
