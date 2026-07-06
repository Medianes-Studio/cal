import { teamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";
import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import TeamProfileView from "~/settings/teams/profile-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/profile`
  );

const Page = async ({ params: _params }: PageProps) => {
  const params = await _params;
  const teamId = typeof params?.id === "string" ? Number(params.id) : Number.NaN;
  if (Number.isNaN(teamId)) {
    redirect("/teams");
  }

  const teamsCaller = await createRouterCaller(teamsRouter);
  const team = await teamsCaller.get({ teamId }).catch(() => null);
  if (!team) {
    redirect("/teams");
  }

  return <TeamProfileView team={team} />;
};

export default Page;
