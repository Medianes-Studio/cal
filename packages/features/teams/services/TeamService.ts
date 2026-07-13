import { ErrorWithCode } from "@calcom/lib/errors";
import { uploadLogo } from "@calcom/lib/server/avatar";
import slugify from "@calcom/lib/slugify";
import type {
  PrismaTeamRepository,
  TeamDTO,
  TeamUpdateInput,
  TeamWithMembershipDTO,
} from "../repositories/PrismaTeamRepository";

export interface ITeamServiceDeps {
  teamRepository: PrismaTeamRepository;
}

export type TeamCreateData = {
  name: string;
  slug?: string;
  bio?: string;
  logo?: string;
  ownerUserId: number;
};

export type TeamUpdateData = TeamUpdateInput & {
  logo?: string;
};

const isBase64Image = (value: string) => value.startsWith("data:image/");

export class TeamService {
  constructor(private deps: ITeamServiceDeps) {}

  async create({ name, slug, bio, logo, ownerUserId }: TeamCreateData): Promise<TeamDTO> {
    const teamSlug = slugify(slug || name);
    if (!teamSlug) {
      throw ErrorWithCode.Factory.BadRequest(
        `Unable to create team: name "${name}" does not produce a valid slug`
      );
    }
    await this.ensureSlugIsAvailable(teamSlug);

    let team = await this.deps.teamRepository.createWithOwner({
      data: { name, slug: teamSlug, bio },
      ownerUserId,
    });

    if (logo && isBase64Image(logo)) {
      const logoUrl = await uploadLogo({ teamId: team.id, logo });
      team = await this.deps.teamRepository.update({ id: team.id, data: { logoUrl } });
    }

    return team;
  }

  async update({ teamId, data }: { teamId: number; data: TeamUpdateData }): Promise<TeamDTO> {
    const team = await this.deps.teamRepository.findById({ id: teamId });
    if (!team) {
      throw ErrorWithCode.Factory.NotFound(`Team ${teamId} not found`);
    }

    const { logo, ...updateData } = data;

    if (updateData.slug) {
      const newSlug = slugify(updateData.slug);
      if (!newSlug) {
        throw ErrorWithCode.Factory.BadRequest(
          `Unable to update team ${teamId}: slug "${updateData.slug}" is not valid`
        );
      }
      if (newSlug !== team.slug) {
        await this.ensureSlugIsAvailable(newSlug, team.parentId);
      }
      updateData.slug = newSlug;
    }

    if (logo && isBase64Image(logo)) {
      updateData.logoUrl = await uploadLogo({ teamId, logo });
    }

    return this.deps.teamRepository.update({ id: teamId, data: updateData });
  }

  async delete({ teamId }: { teamId: number }): Promise<void> {
    const team = await this.deps.teamRepository.findById({ id: teamId });
    if (!team) {
      throw ErrorWithCode.Factory.NotFound(`Team ${teamId} not found`);
    }
    await this.deps.teamRepository.deleteById({ id: teamId });
  }

  async getById({ teamId }: { teamId: number }): Promise<TeamDTO> {
    const team = await this.deps.teamRepository.findById({ id: teamId });
    if (!team) {
      throw ErrorWithCode.Factory.NotFound(`Team ${teamId} not found`);
    }
    return team;
  }

  async listUserTeams({ userId }: { userId: number }): Promise<TeamWithMembershipDTO[]> {
    return this.deps.teamRepository.findManyByUserIdIncludeMembership({ userId });
  }

  private async ensureSlugIsAvailable(slug: string, parentId: number | null = null): Promise<void> {
    const existing = await this.deps.teamRepository.findBySlug({ slug, parentId });
    if (existing) {
      throw ErrorWithCode.Factory.BadRequest(`Team slug "${slug}" is already taken`);
    }
  }
}
