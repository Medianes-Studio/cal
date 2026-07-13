import { z } from "zod";

export const ZUpdateSchema = z.object({
  teamId: z.number(),
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  bio: z.string().nullish(),
  logo: z.string().optional(),
  theme: z.string().nullish(),
  brandColor: z.string().nullish(),
  darkBrandColor: z.string().nullish(),
  hideBranding: z.boolean().optional(),
  hideTeamProfileLink: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  hideBookATeamMember: z.boolean().optional(),
  timeZone: z.string().optional(),
  weekStart: z.string().optional(),
  timeFormat: z.number().nullish(),
});

export type TUpdateSchema = z.infer<typeof ZUpdateSchema>;
