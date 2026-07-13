import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZChangeMemberRoleSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.nativeEnum(MembershipRole),
});

export type TChangeMemberRoleSchema = z.infer<typeof ZChangeMemberRoleSchema>;
