import { z } from "zod";

export const ZListMembersSchema = z.object({
  teamId: z.number(),
});

export type TListMembersSchema = z.infer<typeof ZListMembersSchema>;
