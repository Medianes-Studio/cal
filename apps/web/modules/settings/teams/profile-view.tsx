"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { Form, Label, TextArea, TextField } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { HorizontalTabs } from "@calcom/ui/components/navigation";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

type Team = RouterOutputs["viewer"]["teams"]["get"];

type TeamProfileFormValues = {
  name: string;
  slug: string;
  bio: string;
  logo: string;
};

export function TeamSettingsTabs({ teamId }: { teamId: number }) {
  const { t } = useLocale();
  return (
    <HorizontalTabs
      tabs={[
        { name: t("profile"), href: `/settings/teams/${teamId}/profile` },
        { name: t("members"), href: `/settings/teams/${teamId}/members` },
      ]}
    />
  );
}

export default function TeamProfileView({ team }: { team: Team }) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false);

  const { isAdmin, isOwner } = team.membership;

  const form = useForm<TeamProfileFormValues>({
    defaultValues: {
      name: team.name,
      slug: team.slug ?? "",
      bio: team.bio ?? "",
      logo: team.logoUrl ?? "",
    },
  });

  const updateMutation = trpc.viewer.teams.update.useMutation({
    onSuccess: () => {
      utils.viewer.teams.get.invalidate({ teamId: team.id });
      utils.viewer.teams.list.invalidate();
      showToast(t("your_team_updated_successfully"), "success");
      router.refresh();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.teams.delete.useMutation({
    onSuccess: () => {
      utils.viewer.teams.list.invalidate();
      showToast(t("your_team_disbanded_successfully"), "success");
      router.push("/teams");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const leaveMutation = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => {
      utils.viewer.teams.list.invalidate();
      router.push("/teams");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <SettingsHeader title={t("profile")} description={t("team_description")}>
      <TeamSettingsTabs teamId={team.id} />
      <Form
        form={form}
        handleSubmit={(values) => {
          updateMutation.mutate({
            teamId: team.id,
            name: values.name,
            slug: values.slug || undefined,
            bio: values.bio,
            // Only send the logo when the uploader produced a new base64 image
            logo: values.logo.startsWith("data:image/") ? values.logo : undefined,
          });
        }}>
        <div className="flex flex-col gap-6 rounded-md border border-subtle p-6">
          <div className="flex items-center gap-4">
            <Controller
              control={form.control}
              name="logo"
              render={({ field: { value, onChange } }) => (
                <>
                  <Avatar
                    alt={form.getValues("name")}
                    imageSrc={
                      value.startsWith("data:image/") ? value : getPlaceholderAvatar(value, team.name)
                    }
                    size="lg"
                  />
                  {isAdmin && (
                    <ImageUploader
                      target="logo"
                      id="team-logo-upload"
                      buttonMsg={t("update")}
                      handleAvatarChange={onChange}
                      imageSrc={value || undefined}
                    />
                  )}
                </>
              )}
            />
          </div>
          <TextField label={t("team_name")} disabled={!isAdmin} {...form.register("name")} />
          <TextField
            label={t("team_url")}
            addOnLeading="/team/"
            disabled={!isAdmin}
            {...form.register("slug")}
          />
          <div>
            <Label htmlFor="team-bio">{t("about")}</Label>
            <TextArea id="team-bio" rows={4} disabled={!isAdmin} {...form.register("bio")} />
          </div>
        </div>
        {isAdmin && (
          <SectionBottomActions align="end">
            <Button type="submit" color="primary" loading={updateMutation.isPending}>
              {t("update")}
            </Button>
          </SectionBottomActions>
        )}
      </Form>

      <div className="mt-8 rounded-md border border-subtle p-6">
        <Label>{t("danger_zone")}</Label>
        <Button
          color="destructive"
          StartIcon={isOwner ? "trash-2" : "log-out"}
          onClick={() => setDangerDialogOpen(true)}>
          {isOwner ? t("disband_team") : t("leave_team")}
        </Button>
      </div>

      <Dialog open={dangerDialogOpen} onOpenChange={setDangerDialogOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={isOwner ? t("disband_team") : t("leave_team")}
          confirmBtnText={isOwner ? t("disband_team") : t("leave_team")}
          onConfirm={() => {
            if (isOwner) {
              deleteMutation.mutate({ teamId: team.id });
            } else {
              leaveMutation.mutate({ teamId: team.id, accept: false });
            }
          }}>
          {isOwner ? t("disband_team_confirmation_message") : t("leave_team_confirmation_message")}
        </ConfirmationDialogContent>
      </Dialog>
    </SettingsHeader>
  );
}
