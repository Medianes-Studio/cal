"use client";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Input, Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type Team = RouterOutputs["viewer"]["teams"]["list"][number];

export function TeamsList() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { data: teams, isPending } = trpc.viewer.teams.list.useQuery();

  const acceptOrLeaveMutation = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => {
      utils.viewer.teams.list.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (isPending || !teams) return null;

  const pendingInvitations = teams.filter((team) => !team.membership.accepted);
  const acceptedTeams = teams.filter((team) => team.membership.accepted);

  return (
    <div className="flex flex-col gap-6">
      {pendingInvitations.length > 0 && (
        <ul className="divide-y divide-subtle rounded-md border border-subtle bg-default">
          {pendingInvitations.map((team) => (
            <li key={team.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <Avatar size="md" alt={team.name} imageSrc={getPlaceholderAvatar(team.logoUrl, team.name)} />
                <div>
                  <p className="font-medium text-emphasis text-sm">{team.name}</p>
                  <p className="text-default text-sm">{t("team_invite_received", { teamName: team.name })}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  color="secondary"
                  loading={acceptOrLeaveMutation.isPending}
                  onClick={() => acceptOrLeaveMutation.mutate({ teamId: team.id, accept: false })}>
                  {t("reject")}
                </Button>
                <Button
                  color="primary"
                  loading={acceptOrLeaveMutation.isPending}
                  onClick={() => acceptOrLeaveMutation.mutate({ teamId: team.id, accept: true })}>
                  {t("accept")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {acceptedTeams.length > 0 ? (
        <ul className="divide-y divide-subtle rounded-md border border-subtle bg-default">
          {acceptedTeams.map((team) => (
            <TeamListItem key={team.id} team={team} />
          ))}
        </ul>
      ) : (
        pendingInvitations.length === 0 && (
          <EmptyScreen
            Icon="users"
            headline={t("no_teams")}
            description={t("no_teams_description")}
            buttonRaw={<TeamsCTA />}
          />
        )
      )}
    </div>
  );
}

function TeamListItem({ team }: { team: Team }) {
  const { t } = useLocale();
  const isAdminOrOwner =
    team.membership.role === MembershipRole.ADMIN || team.membership.role === MembershipRole.OWNER;

  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <Link href={`/settings/teams/${team.id}/profile`} className="flex grow items-center gap-3">
        <Avatar size="md" alt={team.name} imageSrc={getPlaceholderAvatar(team.logoUrl, team.name)} />
        <div>
          <p className="font-medium text-emphasis text-sm">{team.name}</p>
          {team.slug && <p className="text-default text-sm">{`/team/${team.slug}`}</p>}
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <Badge variant={team.membership.role === MembershipRole.OWNER ? "blue" : "gray"}>
          {t(team.membership.role.toLowerCase())}
        </Badge>
        {isAdminOrOwner && (
          <Button
            color="secondary"
            variant="icon"
            StartIcon="settings"
            href={`/settings/teams/${team.id}/profile`}
            aria-label={t("manage_your_team")}
          />
        )}
      </div>
    </li>
  );
}

type CreateTeamFormValues = {
  name: string;
};

export function TeamsCTA() {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeamFormValues>({ defaultValues: { name: "" } });

  const createMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: (team) => {
      utils.viewer.teams.list.invalidate();
      showToast(t("your_team_updated_successfully"), "success");
      setIsOpen(false);
      reset();
      router.push(`/settings/teams/${team.id}/profile`);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <>
      <Button color="primary" StartIcon="plus" onClick={() => setIsOpen(true)} data-testid="new-team-button">
        {t("new_team")}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader title={t("create_new_team")} subtitle={t("create_team_to_get_started")} />
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate({ name: values.name }))}
            className="space-y-4">
            <div>
              <Label htmlFor="team-name">{t("team_name")}</Label>
              <Input id="team-name" placeholder="Acme" {...register("name", { required: t("required") })} />
              {errors.name && <p className="mt-1 text-error text-sm">{errors.name.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" color="secondary" onClick={() => setIsOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" color="primary" loading={createMutation.isPending}>
                {t("create_team")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
