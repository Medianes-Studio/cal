import { getTeamService } from "@calcom/features/di/containers/Team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TCreateSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateSchema;
};

export async function createHandler({ ctx, input }: CreateOptions) {
  const teamService = getTeamService();

  return teamService.create({
    name: input.name,
    slug: input.slug,
    bio: input.bio,
    logo: input.logo,
    ownerUserId: ctx.user.id,
  });
}

export default createHandler;
