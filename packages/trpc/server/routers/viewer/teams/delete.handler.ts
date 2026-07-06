import { getTeamService } from "@calcom/features/di/containers/Team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TDeleteSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteSchema;
};

export async function deleteHandler({ input }: DeleteOptions) {
  const teamService = getTeamService();

  await teamService.delete({ teamId: input.teamId });

  return { teamId: input.teamId };
}

export default deleteHandler;
