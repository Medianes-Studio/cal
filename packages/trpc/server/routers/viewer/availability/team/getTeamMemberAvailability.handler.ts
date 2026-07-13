import dayjs from "@calcom/dayjs";
import { findUsersForAvailabilityCheck } from "@calcom/features/availability/lib/findUsersForAvailabilityCheck";
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../../types";
import type { TGetTeamMemberAvailabilitySchema } from "./getTeamMemberAvailability.schema";

type GetTeamMemberAvailabilityOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetTeamMemberAvailabilitySchema;
};

// Busy times come from connected calendars: keep the range short so a single
// request never fans out into large calendar API queries.
const MAX_RANGE_DAYS = 7;

export const getTeamMemberAvailabilityHandler = async ({ ctx, input }: GetTeamMemberAvailabilityOptions) => {
  const { memberId } = input;

  const dateFrom = dayjs(input.dateFrom);
  const dateTo = dayjs(input.dateTo);
  if (!dateFrom.isValid() || !dateTo.isValid() || dateTo.isBefore(dateFrom)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date range" });
  }
  if (dateTo.diff(dateFrom, "day") > MAX_RANGE_DAYS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Date range must not exceed ${MAX_RANGE_DAYS} days`,
    });
  }

  const isSelf = ctx.user.id === memberId;
  if (!isSelf) {
    const sharedTeamMembership = await prisma.membership.findFirst({
      where: {
        userId: memberId,
        accepted: true,
        team: {
          members: {
            some: {
              userId: ctx.user.id,
              accepted: true,
            },
          },
        },
      },
      select: { id: true },
    });

    if (!sharedTeamMembership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not share a team with this user.",
      });
    }
  }

  const user = await findUsersForAvailabilityCheck({ where: { id: memberId } });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  const availability = await getUserAvailabilityService().getUserAvailabilityIncludingBusyTimesFromLimits(
    {
      userId: user.id,
      username: user.username ?? undefined,
      dateFrom,
      dateTo,
      returnDateOverrides: true,
      bypassBusyCalendarTimes: false,
      silentlyHandleCalendarFailures: true,
      mode: "overlay",
    },
    { user }
  );

  // Teammates only see free/busy blocks; booking titles are private to the member.
  return {
    timeZone: availability.timeZone,
    dateRanges: availability.dateRanges,
    oooExcludedDateRanges: availability.oooExcludedDateRanges,
    workingHours: availability.workingHours,
    dateOverrides: availability.dateOverrides,
    datesOutOfOffice: availability.datesOutOfOffice,
    busy: availability.busy.map((busyTime) => ({
      start: busyTime.start,
      end: busyTime.end,
      source: busyTime.source ?? null,
      title: isSelf ? busyTime.title : undefined,
    })),
  };
};
