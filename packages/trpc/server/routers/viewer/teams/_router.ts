import { MembershipRole } from "@calcom/prisma/enums";
import authedProcedure from "../../../procedures/authedProcedure";
import { createTeamPbacProcedure } from "../../../procedures/pbacProcedures";
import { router } from "../../../trpc";
import { ZCreateSchema } from "./create.schema";
import { ZDeleteSchema } from "./delete.schema";
import { ZGetSchema } from "./get.schema";
import { ZUpdateSchema } from "./update.schema";

export const teamsRouter = router({
  create: authedProcedure.input(ZCreateSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({ ctx, input });
  }),

  get: authedProcedure.input(ZGetSchema).query(async ({ ctx, input }) => {
    const { getHandler } = await import("./get.handler");

    return getHandler({ ctx, input });
  }),

  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({ ctx });
  }),

  update: createTeamPbacProcedure("team.update")
    .input(ZUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateHandler } = await import("./update.handler");

      return updateHandler({ ctx, input });
    }),

  delete: createTeamPbacProcedure("team.delete", [MembershipRole.OWNER])
    .input(ZDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { deleteHandler } = await import("./delete.handler");

      return deleteHandler({ ctx, input });
    }),
});
