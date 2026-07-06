import { getTeamMemberService } from "@calcom/features/di/containers/Team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TChangeMemberRoleSchema } from "./changeMemberRole.schema";

type ChangeMemberRoleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TChangeMemberRoleSchema;
};

export async function changeMemberRoleHandler({ ctx, input }: ChangeMemberRoleOptions) {
  await getTeamMemberService().changeRole({
    teamId: input.teamId,
    targetUserId: input.memberId,
    role: input.role,
    actorUserId: ctx.user.id,
  });

  return { teamId: input.teamId, memberId: input.memberId, role: input.role };
}

export default changeMemberRoleHandler;
