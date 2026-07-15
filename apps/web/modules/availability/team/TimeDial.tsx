"use client";

import dayjs, { type Dayjs } from "@calcom/dayjs";
import classNames from "@calcom/ui/classNames";
import { Tooltip } from "@calcom/ui/components/tooltip";

// Over the wire the availability date ranges may arrive as ISO strings, Date
// objects or Dayjs instances (tRPC infers Dayjs); dayjs() normalizes all three.
type SerializedDateRange = {
  start: string | Date | Dayjs;
  end: string | Date | Dayjs;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * A 24-hour strip for one member and one day, colored where the member's
 * working-hour date ranges overlap each hour, rendered in the viewer's day.
 */
export function TimeDial({
  dayStart,
  dateRanges,
}: {
  /** Start of the displayed day in the viewer's timezone */
  dayStart: Dayjs;
  dateRanges: SerializedDateRange[];
}) {
  const dayStartMs = dayStart.valueOf();
  const rangesMs = dateRanges.map((range) => ({
    start: dayjs(range.start).valueOf(),
    end: dayjs(range.end).valueOf(),
  }));

  return (
    <div className="flex h-8 w-full min-w-[288px] overflow-hidden rounded-md border border-subtle">
      {HOURS.map((hour) => {
        const cellStartMs = dayStartMs + hour * 60 * 60 * 1000;
        const cellEndMs = cellStartMs + 60 * 60 * 1000;
        const isAvailable = rangesMs.some((range) => range.start < cellEndMs && range.end > cellStartMs);

        return (
          <Tooltip key={hour} content={`${String(hour).padStart(2, "0")}:00`}>
            <div
              className={classNames(
                "h-full flex-1 border-subtle border-r last:border-r-0",
                isAvailable ? "bg-cal-success" : "bg-muted"
              )}
              data-available={isAvailable}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}
