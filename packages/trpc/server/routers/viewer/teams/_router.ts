import { MembershipRole } from "@calcom/prisma/enums";
import authedProcedure from "../../../procedures/authedProcedure";
import { createTeamPbacProcedure } from "../../../procedures/pbacProcedures";
import { router } from "../../../trpc";
import { ZAcceptOrLeaveSchema } from "./acceptOrLeave.schema";
import { ZChangeMemberRoleSchema } from "./changeMemberRole.schema";
import { ZCreateSchema } from "./create.schema";
import { ZDeleteSchema } from "./delete.schema";
import { ZGetSchema } from "./get.schema";
import { ZInviteMemberSchema } from "./inviteMember.schema";
import { ZListMembersSchema } from "./listMembers.schema";
import { ZRemoveMemberSchema } from "./removeMember.schema";
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

  listMembers: authedProcedure.input(ZListMembersSchema).query(async ({ ctx, input }) => {
    const { listMembersHandler } = await import("./listMembers.handler");

    return listMembersHandler({ ctx, input });
  }),

  acceptOrLeave: authedProcedure.input(ZAcceptOrLeaveSchema).mutation(async ({ ctx, input }) => {
    const { acceptOrLeaveHandler } = await import("./acceptOrLeave.handler");

    return acceptOrLeaveHandler({ ctx, input });
  }),

  changeMemberRole: createTeamPbacProcedure("team.changeMemberRole")
    .input(ZChangeMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { changeMemberRoleHandler } = await import("./changeMemberRole.handler");

      return changeMemberRoleHandler({ ctx, input });
    }),

  removeMember: createTeamPbacProcedure("team.removeMember")
    .input(ZRemoveMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { removeMemberHandler } = await import("./removeMember.handler");

      return removeMemberHandler({ ctx, input });
    }),

  inviteMember: createTeamPbacProcedure("team.invite")
    .input(ZInviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { inviteMemberHandler } = await import("./inviteMember.handler");

      return inviteMemberHandler({ ctx, input });
    }),
});
