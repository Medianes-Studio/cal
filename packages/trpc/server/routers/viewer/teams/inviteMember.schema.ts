import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZInviteMemberSchema = z.object({
  teamId: z.number(),
  invitations: z
    .array(
      z.object({
        email: z.string().email(),
        role: z.nativeEnum(MembershipRole).default(MembershipRole.MEMBER),
      })
    )
    .min(1)
    .max(20),
});

export type TInviteMemberSchema = z.infer<typeof ZInviteMemberSchema>;
