import { z } from "zod";

export const ZGetTeamMemberAvailabilitySchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  dateFrom: z.string(),
  dateTo: z.string(),
});

export type TGetTeamMemberAvailabilitySchema = z.infer<typeof ZGetTeamMemberAvailabilitySchema>;
