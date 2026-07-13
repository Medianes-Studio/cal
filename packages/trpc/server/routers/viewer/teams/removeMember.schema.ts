import { z } from "zod";

export const ZRemoveMemberSchema = z.object({
  teamId: z.number(),
  memberIds: z.array(z.number()).min(1),
});

export type TRemoveMemberSchema = z.infer<typeof ZRemoveMemberSchema>;
