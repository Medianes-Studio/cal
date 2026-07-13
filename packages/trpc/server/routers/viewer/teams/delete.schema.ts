import { z } from "zod";

export const ZDeleteSchema = z.object({
  teamId: z.number(),
});

export type TDeleteSchema = z.infer<typeof ZDeleteSchema>;
