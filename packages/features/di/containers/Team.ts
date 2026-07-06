import type { PrismaTeamRepository } from "@calcom/features/teams/repositories/PrismaTeamRepository";
import type { TeamInviteService } from "@calcom/features/teams/services/TeamInviteService";
import type { TeamMemberService } from "@calcom/features/teams/services/TeamMemberService";
import type { TeamService } from "@calcom/features/teams/services/TeamService";
import { createContainer } from "../di";
import {
  teamInviteServiceModuleLoader,
  teamMemberServiceModuleLoader,
  teamRepositoryModuleLoader,
  teamServiceModuleLoader,
} from "../modules/Team";

const container = createContainer();

export function getTeamMemberService(): TeamMemberService {
  teamMemberServiceModuleLoader.loadModule(container);
  return container.get<TeamMemberService>(teamMemberServiceModuleLoader.token);
}

export function getTeamInviteService(): TeamInviteService {
  teamInviteServiceModuleLoader.loadModule(container);
  return container.get<TeamInviteService>(teamInviteServiceModuleLoader.token);
}

export function getTeamService(): TeamService {
  teamServiceModuleLoader.loadModule(container);
  return container.get<TeamService>(teamServiceModuleLoader.token);
}

export function getTeamRepository(): PrismaTeamRepository {
  teamRepositoryModuleLoader.loadModule(container);
  return container.get<PrismaTeamRepository>(teamRepositoryModuleLoader.token);
}
