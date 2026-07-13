import { z } from "zod";

export const ZGetSchema = z.object({
  teamId: z.number(),
});

export type TGetSchema = z.infer<typeof ZGetSchema>;
