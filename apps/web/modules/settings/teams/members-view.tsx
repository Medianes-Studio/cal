"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  ConfirmationDialogContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Input, Label, Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TeamSettingsTabs } from "./profile-view";

type Team = RouterOutputs["viewer"]["teams"]["get"];
type Member = RouterOutputs["viewer"]["teams"]["listMembers"][number];

const ASSIGNABLE_ROLES = [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER] as const;

export default function TeamMembersView({ team }: { team: Team }) {
  const { t } = useLocale();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: members, isPending } = trpc.viewer.teams.listMembers.useQuery({ teamId: team.id });

  const canManage = team.membership.isAdmin;

  return (
    <SettingsHeader
      title={t("members")}
      description={t("members_team_description")}
      CTA={
        canManage ? (
          <Button color="primary" StartIcon="plus" onClick={() => setInviteOpen(true)}>
            {t("invite")}
          </Button>
        ) : undefined
      }>
      <TeamSettingsTabs teamId={team.id} />
      {!isPending && members && (
        <ul className="divide-y divide-subtle rounded-md border border-subtle bg-default">
          {members.map((member) => (
            <MemberListItem key={member.userId} team={team} member={member} canManage={canManage} />
          ))}
        </ul>
      )}
      {canManage && (
        <InviteMemberDialog teamId={team.id} isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
      )}
    </SettingsHeader>
  );
}

function MemberListItem({ team, member, canManage }: { team: Team; member: Member; canManage: boolean }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [removeOpen, setRemoveOpen] = useState(false);

  const invalidate = () => {
    utils.viewer.teams.listMembers.invalidate({ teamId: team.id });
  };

  const changeRoleMutation = trpc.viewer.teams.changeMemberRole.useMutation({
    onSuccess: invalidate,
    onError: (error) => showToast(error.message, "error"),
  });

  const removeMutation = trpc.viewer.teams.removeMember.useMutation({
    onSuccess: () => {
      invalidate();
      showToast(t("success"), "success");
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const name = member.name ?? member.email;

  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <Avatar size="md" alt={name} imageSrc={getPlaceholderAvatar(member.avatarUrl, name)} />
        <div>
          <p className="font-medium text-emphasis text-sm">{name}</p>
          <p className="text-default text-sm">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!member.accepted && <Badge variant="orange">{t("pending")}</Badge>}
        <Badge variant={member.role === MembershipRole.OWNER ? "blue" : "gray"}>
          {t(member.role.toLowerCase())}
        </Badge>
        {canManage && (
          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button color="secondary" variant="icon" StartIcon="ellipsis" aria-label={t("edit")} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ASSIGNABLE_ROLES.filter((role) => role !== member.role).map((role) => (
                <DropdownMenuItem key={role}>
                  <DropdownItem
                    type="button"
                    onClick={() =>
                      changeRoleMutation.mutate({ teamId: team.id, memberId: member.userId, role })
                    }>
                    {`${t("role")}: ${t(role.toLowerCase())}`}
                  </DropdownItem>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  color="destructive"
                  StartIcon="user-x"
                  onClick={() => setRemoveOpen(true)}>
                  {t("remove_member")}
                </DropdownItem>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Dropdown>
        )}
      </div>
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_member")}
          confirmBtnText={t("remove")}
          onConfirm={() => removeMutation.mutate({ teamId: team.id, memberIds: [member.userId] })}>
          {t("remove_member_confirmation_message")}
        </ConfirmationDialogContent>
      </Dialog>
    </li>
  );
}

type InviteFormValues = {
  email: string;
  role: MembershipRole;
};

function InviteMemberDialog({
  teamId,
  isOpen,
  onClose,
}: {
  teamId: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const roleOptions = ASSIGNABLE_ROLES.map((role) => ({
    value: role,
    label: t(role.toLowerCase()),
  }));

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    defaultValues: { email: "", role: MembershipRole.MEMBER },
  });

  const inviteMutation = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: () => {
      utils.viewer.teams.listMembers.invalidate({ teamId });
      showToast(t("email_sent"), "success");
      reset();
      onClose();
    },
    onError: (error) => showToast(error.message, "error"),
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader title={t("invite_team_member")} subtitle={t("invite_new_member")} />
        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) =>
            inviteMutation.mutate({
              teamId,
              invitations: [{ email: values.email, role: values.role }],
            })
          )}>
          <div>
            <Label htmlFor="invite-email">{t("email")}</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              {...register("email", { required: t("required") })}
            />
            {errors.email && <p className="mt-1 text-error text-sm">{errors.email.message}</p>}
          </div>
          <div>
            <Label>{t("role")}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field: { value, onChange } }) => (
                <Select
                  options={roleOptions}
                  value={roleOptions.find((option) => option.value === value)}
                  onChange={(option) => option && onChange(option.value)}
                />
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" color="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" color="primary" loading={inviteMutation.isPending}>
              {t("invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
