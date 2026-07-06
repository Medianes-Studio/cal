import type { PrismaTeamRepository } from "@calcom/features/teams/repositories/PrismaTeamRepository";
import type { TeamService } from "@calcom/features/teams/services/TeamService";
import { createContainer } from "../di";
import { teamRepositoryModuleLoader, teamServiceModuleLoader } from "../modules/Team";

const container = createContainer();

export function getTeamService(): TeamService {
  teamServiceModuleLoader.loadModule(container);
  return container.get<TeamService>(teamServiceModuleLoader.token);
}

export function getTeamRepository(): PrismaTeamRepository {
  teamRepositoryModuleLoader.loadModule(container);
  return container.get<PrismaTeamRepository>(teamRepositoryModuleLoader.token);
}
