import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AvailabilityViewToggle } from "~/availability/availability-view";
import { TeamAvailabilityList } from "~/availability/team/team-availability-view";
import { ShellMainAppDir } from "../../ShellMainAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("team_availability"),
    (t) => t("view_team_availability_description"),
    undefined,
    undefined,
    "/availability/team"
  );
};

const Page = async () => {
  const t = await getTranslate();
  const _headers = await headers();
  const _cookies = await cookies();
  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  return (
    <ShellMainAppDir
      heading={t("team_availability")}
      subtitle={t("view_team_availability_description")}
      CTA={<AvailabilityViewToggle current="team" />}>
      <TeamAvailabilityList />
    </ShellMainAppDir>
  );
};

export default Page;
