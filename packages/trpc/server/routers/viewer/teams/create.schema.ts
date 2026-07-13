import { z } from "zod";

export const ZCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  bio: z.string().optional(),
  logo: z.string().optional(),
});

export type TCreateSchema = z.infer<typeof ZCreateSchema>;
