"use client";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";
import { Calendar } from "@calcom/web/modules/calendars/weeklyview/components/Calendar";
import { useMemo, useState } from "react";

const DAYS_SHOWN = 3;

export function MemberAvailabilitySheet({
  member,
  viewerTimeZone,
  initialDay,
  onClose,
}: {
  member: { id: number; name: string | null };
  viewerTimeZone: string;
  initialDay: Dayjs;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [startDay, setStartDay] = useState(initialDay);

  const { data, isPending } = trpc.viewer.availability.teamMember.useQuery(
    {
      memberId: member.id,
      dateFrom: startDay.startOf("day").toISOString(),
      dateTo: startDay
        .add(DAYS_SHOWN - 1, "day")
        .endOf("day")
        .toISOString(),
    },
    {
      staleTime: 5 * 60 * 1000,
      placeholderData: (previousData) => previousData,
    }
  );

  const events = useMemo(() => {
    if (!data?.busy) return [];

    return data.busy.map((busyTime, index) => ({
      id: index,
      title: busyTime.title ? busyTime.title : t("busy_time.busy"),
      start: new Date(busyTime.start),
      end: new Date(busyTime.end),
      source: busyTime.source ?? undefined,
      options: {
        status: BookingStatus.ACCEPTED,
      },
    }));
  }, [data, t]);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[720px]">
        <SheetHeader>
          <SheetTitle>{member.name ?? t("member")}</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex h-full flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button
              color="secondary"
              variant="icon"
              StartIcon="chevron-left"
              aria-label={t("previous")}
              onClick={() => setStartDay((day) => day.subtract(DAYS_SHOWN, "day"))}
            />
            <Button
              color="secondary"
              variant="icon"
              StartIcon="chevron-right"
              aria-label={t("next")}
              onClick={() => setStartDay((day) => day.add(DAYS_SHOWN, "day"))}
            />
            <span className="font-medium text-emphasis text-sm">
              {startDay.format("ll")} – {startDay.add(DAYS_SHOWN - 1, "day").format("ll")}
            </span>
            {data?.timeZone && <span className="text-default text-sm">({data.timeZone})</span>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Calendar
              sortEvents
              isPending={isPending}
              startHour={0}
              endHour={23}
              events={events}
              startDate={startDay.toDate()}
              endDate={startDay.add(DAYS_SHOWN - 1, "day").toDate()}
              gridCellsPerHour={4}
              hideHeader
              timezone={viewerTimeZone}
            />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
