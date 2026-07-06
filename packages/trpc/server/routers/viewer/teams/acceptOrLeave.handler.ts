import { getTeamMemberService } from "@calcom/features/di/containers/Team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TAcceptOrLeaveSchema } from "./acceptOrLeave.schema";

type AcceptOrLeaveOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAcceptOrLeaveSchema;
};

export async function acceptOrLeaveHandler({ ctx, input }: AcceptOrLeaveOptions) {
  await getTeamMemberService().acceptOrLeave({
    teamId: input.teamId,
    userId: ctx.user.id,
    accept: input.accept,
  });

  return { teamId: input.teamId, accepted: input.accept };
}

export default acceptOrLeaveHandler;
