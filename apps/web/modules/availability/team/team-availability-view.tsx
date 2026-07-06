"use client";

import dayjs from "@calcom/dayjs";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { TextField } from "@calcom/ui/components/form";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { useMemo, useState } from "react";
import { MemberAvailabilitySheet } from "./MemberAvailabilitySheet";
import { TimeDial } from "./TimeDial";

const PAGE_SIZE = 10;

export function TeamAvailabilityList() {
  const { t, i18n } = useLocale();
  const { data: me } = useMeQuery();
  const viewerTimeZone = me?.timeZone ?? dayjs.tz.guess();

  const [dayOffset, setDayOffset] = useState(0);
  const [searchString, setSearchString] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string | null } | null>(null);

  const dayStart = useMemo(
    () => dayjs().tz(viewerTimeZone).startOf("day").add(dayOffset, "day"),
    [viewerTimeZone, dayOffset]
  );

  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.viewer.availability.listTeam.useInfiniteQuery(
      {
        limit: PAGE_SIZE,
        loggedInUsersTz: viewerTimeZone,
        startDate: dayStart.toISOString(),
        endDate: dayStart.endOf("day").toISOString(),
        searchString: searchString || undefined,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 5 * 60 * 1000,
      }
    );

  const members = useMemo(() => (data?.pages ?? []).flatMap((page) => page.rows), [data]);
  const isApartOfAnyTeam = data?.pages[0]?.meta.isApartOfAnyTeam ?? true;

  if (error?.data?.code === "NOT_FOUND" || (!isPending && !isApartOfAnyTeam)) {
    return <EmptyScreen Icon="users" headline={t("no_teams")} description={t("no_teams_description")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextField
          addOnLeading={undefined}
          type="search"
          placeholder={t("search")}
          value={searchString}
          onChange={(event) => setSearchString(event.target.value)}
          containerClassName="w-64"
        />
        <div className="flex items-center gap-2">
          <Button
            color="secondary"
            variant="icon"
            StartIcon="chevron-left"
            aria-label={t("previous")}
            onClick={() => setDayOffset((offset) => offset - 1)}
          />
          <Button color="secondary" onClick={() => setDayOffset(0)}>
            {t("today")}
          </Button>
          <Button
            color="secondary"
            variant="icon"
            StartIcon="chevron-right"
            aria-label={t("next")}
            onClick={() => setDayOffset((offset) => offset + 1)}
          />
          <span className="ml-2 font-medium text-emphasis text-sm">
            {dayStart.toDate().toLocaleDateString(i18n.language, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-subtle rounded-md border border-subtle bg-default">
        {isPending &&
          Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="flex items-center gap-4 p-4">
              <SkeletonText className="h-8 w-full" />
            </li>
          ))}
        {members.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted"
              onClick={() => setSelectedMember({ id: member.id, name: member.name })}>
              <div className="flex w-56 shrink-0 items-center gap-3">
                <Avatar
                  size="sm"
                  alt={member.name ?? member.email}
                  imageSrc={getPlaceholderAvatar(
                    "avatarUrl" in member ? (member.avatarUrl as string | null) : null,
                    member.name
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-emphasis text-sm">{member.name ?? member.email}</p>
                  <p className="truncate text-default text-xs">
                    {member.timeZone} · {dayjs().tz(member.timeZone).format("HH:mm")}
                  </p>
                </div>
              </div>
              <TimeDial dayStart={dayStart} dateRanges={member.dateRanges} />
            </button>
          </li>
        ))}
        {!isPending && members.length === 0 && (
          <li className="p-8 text-center text-default text-sm">{t("no_results")}</li>
        )}
      </ul>

      {hasNextPage && (
        <Button
          color="secondary"
          className="self-center"
          loading={isFetchingNextPage}
          onClick={() => fetchNextPage()}>
          {t("load_more_results")}
        </Button>
      )}

      {selectedMember && (
        <MemberAvailabilitySheet
          member={selectedMember}
          viewerTimeZone={viewerTimeZone}
          initialDay={dayStart}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
