import { getTeamService } from "@calcom/features/di/containers/Team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TUpdateSchema } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateSchema;
};

export async function updateHandler({ input }: UpdateOptions) {
  const teamService = getTeamService();
  const { teamId, ...data } = input;

  return teamService.update({ teamId, data });
}

export default updateHandler;
