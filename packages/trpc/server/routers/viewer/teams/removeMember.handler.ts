import { getTeamMemberService } from "@calcom/features/di/containers/Team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TRemoveMemberSchema } from "./removeMember.schema";

type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveMemberSchema;
};

export async function removeMemberHandler({ ctx, input }: RemoveMemberOptions) {
  await getTeamMemberService().removeMembers({
    teamId: input.teamId,
    userIds: input.memberIds,
    actorUserId: ctx.user.id,
  });

  return { teamId: input.teamId, memberIds: input.memberIds };
}

export default removeMemberHandler;
