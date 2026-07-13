import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaTeamInviteRepository } from "@calcom/features/teams/repositories/PrismaTeamInviteRepository";
import { PrismaTeamRepository } from "@calcom/features/teams/repositories/PrismaTeamRepository";
import { TeamInviteService } from "@calcom/features/teams/services/TeamInviteService";
import { TeamMemberService } from "@calcom/features/teams/services/TeamMemberService";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import { moduleLoader as membershipRepositoryModuleLoader } from "@calcom/features/users/di/MembershipRepository.module";
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

export const teamMemberServiceModule = createModule();
const memberServiceLoadModule = bindModuleToClassOnToken({
  module: teamMemberServiceModule,
  moduleToken: DI_TOKENS.TEAM_MEMBER_SERVICE_MODULE,
  token: DI_TOKENS.TEAM_MEMBER_SERVICE,
  classs: TeamMemberService,
  depsMap: {
    membershipRepository: membershipRepositoryModuleLoader,
  },
});

export const teamMemberServiceModuleLoader: ModuleLoader = {
  token: DI_TOKENS.TEAM_MEMBER_SERVICE,
  loadModule: memberServiceLoadModule,
};

export const teamInviteRepositoryModule = createModule();
const inviteRepositoryLoadModule = bindModuleToClassOnToken({
  module: teamInviteRepositoryModule,
  moduleToken: DI_TOKENS.TEAM_INVITE_REPOSITORY_MODULE,
  token: DI_TOKENS.TEAM_INVITE_REPOSITORY,
  classs: PrismaTeamInviteRepository,
  dep: prismaModuleLoader,
});

export const teamInviteRepositoryModuleLoader: ModuleLoader = {
  token: DI_TOKENS.TEAM_INVITE_REPOSITORY,
  loadModule: inviteRepositoryLoadModule,
};

export const teamInviteServiceModule = createModule();
const inviteServiceLoadModule = bindModuleToClassOnToken({
  module: teamInviteServiceModule,
  moduleToken: DI_TOKENS.TEAM_INVITE_SERVICE_MODULE,
  token: DI_TOKENS.TEAM_INVITE_SERVICE,
  classs: TeamInviteService,
  depsMap: {
    teamInviteRepository: teamInviteRepositoryModuleLoader,
    teamRepository: teamRepositoryModuleLoader,
    membershipRepository: membershipRepositoryModuleLoader,
  },
});

export const teamInviteServiceModuleLoader: ModuleLoader = {
  token: DI_TOKENS.TEAM_INVITE_SERVICE,
  loadModule: inviteServiceLoadModule,
};
