import { z } from "zod";

export const ZAcceptOrLeaveSchema = z.object({
  teamId: z.number(),
  accept: z.boolean(),
});

export type TAcceptOrLeaveSchema = z.infer<typeof ZAcceptOrLeaveSchema>;
