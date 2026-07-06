import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCheckService } from "./PermissionCheckService";

describe("PermissionCheckService", () => {
  let service: PermissionCheckService;
  let mockMembershipRepository: {
    findUniqueByUserIdAndTeamId: ReturnType<typeof vi.fn>;
  };

  const input = {
    userId: 42,
    teamId: 1,
    permission: "team.update",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMembershipRepository = {
      findUniqueByUserIdAndTeamId: vi.fn(),
    };
    service = new PermissionCheckService(mockMembershipRepository as unknown as MembershipRepository);
  });

  it("denies when the user has no membership in the team", async () => {
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(null);

    await expect(service.checkPermission(input)).resolves.toBe(false);
    expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
      userId: 42,
      teamId: 1,
    });
  });

  it("denies when the membership is not accepted yet", async () => {
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
      accepted: false,
      role: MembershipRole.OWNER,
    });

    await expect(service.checkPermission(input)).resolves.toBe(false);
  });

  it("denies when the role is not in the fallback roles", async () => {
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
      accepted: true,
      role: MembershipRole.MEMBER,
    });

    await expect(service.checkPermission(input)).resolves.toBe(false);
  });

  it("grants when the accepted membership role is in the fallback roles", async () => {
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
      accepted: true,
      role: MembershipRole.ADMIN,
    });

    await expect(service.checkPermission(input)).resolves.toBe(true);
  });

  it("grants a MEMBER when fallback roles explicitly allow members", async () => {
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
      accepted: true,
      role: MembershipRole.MEMBER,
    });

    await expect(
      service.checkPermission({
        ...input,
        fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
      })
    ).resolves.toBe(true);
  });
});
