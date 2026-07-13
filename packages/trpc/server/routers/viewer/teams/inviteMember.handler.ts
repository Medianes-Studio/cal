import { getTeamInviteService } from "@calcom/features/di/containers/Team";
import { getTranslation } from "@calcom/i18n/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TInviteMemberSchema } from "./inviteMember.schema";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberSchema;
};

export async function inviteMemberHandler({ ctx, input }: InviteMemberOptions) {
  const translation = await getTranslation(ctx.user.locale ?? "en", "common");

  return getTeamInviteService().inviteMembers({
    teamId: input.teamId,
    invitations: input.invitations,
    inviterName: ctx.user.name ?? ctx.user.email,
    translation,
  });
}

export default inviteMemberHandler;
