import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaTeamRepository } from "@calcom/features/teams/repositories/PrismaTeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";
import { moduleLoader as prismaModuleLoader } from "./Prisma";

export const teamRepositoryModule = createModule();
const repositoryLoadModule = bindModuleToClassOnToken({
  module: teamRepositoryModule,
  moduleToken: DI_TOKENS.TEAM_REPOSITORY_MODULE,
  token: DI_TOKENS.TEAM_REPOSITORY,
  classs: PrismaTeamRepository,
  dep: prismaModuleLoader,
});

export const teamRepositoryModuleLoader: ModuleLoader = {
  token: DI_TOKENS.TEAM_REPOSITORY,
  loadModule: repositoryLoadModule,
};

export const teamServiceModule = createModule();
const serviceLoadModule = bindModuleToClassOnToken({
  module: teamServiceModule,
  moduleToken: DI_TOKENS.TEAM_SERVICE_MODULE,
  token: DI_TOKENS.TEAM_SERVICE,
  classs: TeamService,
  depsMap: {
    teamRepository: teamRepositoryModuleLoader,
  },
});

export const teamServiceModuleLoader: ModuleLoader = {
  token: DI_TOKENS.TEAM_SERVICE,
  loadModule: serviceLoadModule,
};
