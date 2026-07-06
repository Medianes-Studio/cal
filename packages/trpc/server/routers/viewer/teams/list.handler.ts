import { getTeamService } from "@calcom/features/di/containers/Team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function listHandler({ ctx }: ListOptions) {
  const teamService = getTeamService();

  return teamService.listUserTeams({ userId: ctx.user.id });
}

export default listHandler;
