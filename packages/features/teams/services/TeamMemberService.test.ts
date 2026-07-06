import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamMemberService } from "./TeamMemberService";

const membership = (overrides: Partial<{ role: MembershipRole; accepted: boolean }> = {}) => ({
  id: 1,
  teamId: 1,
  userId: 10,
  role: MembershipRole.MEMBER,
  accepted: true,
  ...overrides,
});

describe("TeamMemberService", () => {
  let service: TeamMemberService;
  let mockMembershipRepository: {
    findMembershipsWithUserByTeamId: ReturnType<typeof vi.fn>;
    findUniqueByUserIdAndTeamId: ReturnType<typeof vi.fn>;
    updateAcceptedByUserIdAndTeamId: ReturnType<typeof vi.fn>;
    updateRoleByUserIdAndTeamId: ReturnType<typeof vi.fn>;
    deleteByUserIdAndTeamId: ReturnType<typeof vi.fn>;
    countAcceptedOwnersByTeamId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMembershipRepository = {
      findMembershipsWithUserByTeamId: vi.fn(),
      findUniqueByUserIdAndTeamId: vi.fn(),
      updateAcceptedByUserIdAndTeamId: vi.fn(),
      updateRoleByUserIdAndTeamId: vi.fn(),
      deleteByUserIdAndTeamId: vi.fn(),
      countAcceptedOwnersByTeamId: vi.fn(),
    };
    service = new TeamMemberService({
      membershipRepository: mockMembershipRepository as unknown as MembershipRepository,
    });
  });

  describe("listMembers", () => {
    it("maps memberships with user info to member DTOs", async () => {
      mockMembershipRepository.findMembershipsWithUserByTeamId.mockResolvedValue([
        {
          role: MembershipRole.OWNER,
          accepted: true,
          user: {
            id: 10,
            name: "Alice",
            email: "alice@example.com",
            username: "alice",
            avatarUrl: null,
            timeZone: "Europe/Paris",
          },
        },
      ]);

      const members = await service.listMembers({ teamId: 1 });

      expect(members).toEqual([
        {
          userId: 10,
          name: "Alice",
          email: "alice@example.com",
          username: "alice",
          avatarUrl: null,
          timeZone: "Europe/Paris",
          role: MembershipRole.OWNER,
          accepted: true,
        },
      ]);
    });
  });

  describe("acceptOrLeave", () => {
    it("accepts a pending invitation", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(membership({ accepted: false }));

      await service.acceptOrLeave({ teamId: 1, userId: 10, accept: true });

      expect(mockMembershipRepository.updateAcceptedByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 10,
        teamId: 1,
        accepted: true,
      });
    });

    it("declines a pending invitation by deleting the membership", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(membership({ accepted: false }));

      await service.acceptOrLeave({ teamId: 1, userId: 10, accept: false });

      expect(mockMembershipRepository.deleteByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 10,
        teamId: 1,
      });
      expect(mockMembershipRepository.countAcceptedOwnersByTeamId).not.toHaveBeenCalled();
    });

    it("lets a member leave the team", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(membership());

      await service.acceptOrLeave({ teamId: 1, userId: 10, accept: false });

      expect(mockMembershipRepository.deleteByUserIdAndTeamId).toHaveBeenCalled();
    });

    it("prevents the last owner from leaving", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(
        membership({ role: MembershipRole.OWNER })
      );
      mockMembershipRepository.countAcceptedOwnersByTeamId.mockResolvedValue(1);

      await expect(service.acceptOrLeave({ teamId: 1, userId: 10, accept: false })).rejects.toMatchObject({
        code: ErrorCode.Forbidden,
      });
      expect(mockMembershipRepository.deleteByUserIdAndTeamId).not.toHaveBeenCalled();
    });

    it("lets an owner leave when another accepted owner remains", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(
        membership({ role: MembershipRole.OWNER })
      );
      mockMembershipRepository.countAcceptedOwnersByTeamId.mockResolvedValue(2);

      await service.acceptOrLeave({ teamId: 1, userId: 10, accept: false });

      expect(mockMembershipRepository.deleteByUserIdAndTeamId).toHaveBeenCalled();
    });

    it("throws NotFound without a membership", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(null);

      await expect(service.acceptOrLeave({ teamId: 1, userId: 10, accept: true })).rejects.toMatchObject({
        code: ErrorCode.NotFound,
      });
    });
  });

  describe("changeRole", () => {
    const setupActorAndTarget = (
      actor: ReturnType<typeof membership>,
      target: ReturnType<typeof membership> | null
    ) => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockImplementation(
        async ({ userId }: { userId: number }) => (userId === 1 ? actor : target)
      );
    };

    it("rejects changing your own role", async () => {
      await expect(
        service.changeRole({ teamId: 1, targetUserId: 1, role: MembershipRole.ADMIN, actorUserId: 1 })
      ).rejects.toMatchObject({ code: ErrorCode.Forbidden });
    });

    it("lets an admin change a member to admin", async () => {
      setupActorAndTarget(
        membership({ role: MembershipRole.ADMIN }),
        membership({ role: MembershipRole.MEMBER })
      );

      await service.changeRole({ teamId: 1, targetUserId: 10, role: MembershipRole.ADMIN, actorUserId: 1 });

      expect(mockMembershipRepository.updateRoleByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 10,
        teamId: 1,
        role: MembershipRole.ADMIN,
      });
    });

    it("prevents an admin from granting the owner role", async () => {
      setupActorAndTarget(
        membership({ role: MembershipRole.ADMIN }),
        membership({ role: MembershipRole.MEMBER })
      );

      await expect(
        service.changeRole({ teamId: 1, targetUserId: 10, role: MembershipRole.OWNER, actorUserId: 1 })
      ).rejects.toMatchObject({ code: ErrorCode.Forbidden });
    });

    it("prevents an admin from demoting an owner", async () => {
      setupActorAndTarget(
        membership({ role: MembershipRole.ADMIN }),
        membership({ role: MembershipRole.OWNER })
      );

      await expect(
        service.changeRole({ teamId: 1, targetUserId: 10, role: MembershipRole.MEMBER, actorUserId: 1 })
      ).rejects.toMatchObject({ code: ErrorCode.Forbidden });
    });

    it("prevents demoting the last accepted owner", async () => {
      setupActorAndTarget(
        membership({ role: MembershipRole.OWNER }),
        membership({ role: MembershipRole.OWNER })
      );
      mockMembershipRepository.countAcceptedOwnersByTeamId.mockResolvedValue(1);

      await expect(
        service.changeRole({ teamId: 1, targetUserId: 10, role: MembershipRole.ADMIN, actorUserId: 1 })
      ).rejects.toMatchObject({ code: ErrorCode.Forbidden });
    });

    it("lets an owner promote a member to owner", async () => {
      setupActorAndTarget(
        membership({ role: MembershipRole.OWNER }),
        membership({ role: MembershipRole.MEMBER })
      );

      await service.changeRole({ teamId: 1, targetUserId: 10, role: MembershipRole.OWNER, actorUserId: 1 });

      expect(mockMembershipRepository.updateRoleByUserIdAndTeamId).toHaveBeenCalled();
    });
  });

  describe("removeMembers", () => {
    it("rejects removing yourself", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(
        membership({ role: MembershipRole.ADMIN })
      );

      await expect(service.removeMembers({ teamId: 1, userIds: [1], actorUserId: 1 })).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
      });
    });

    it("lets an admin remove a member", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockImplementation(
        async ({ userId }: { userId: number }) =>
          userId === 1
            ? membership({ role: MembershipRole.ADMIN })
            : membership({ role: MembershipRole.MEMBER })
      );

      await service.removeMembers({ teamId: 1, userIds: [10], actorUserId: 1 });

      expect(mockMembershipRepository.deleteByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 10,
        teamId: 1,
      });
    });

    it("prevents an admin from removing an owner", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockImplementation(
        async ({ userId }: { userId: number }) =>
          userId === 1
            ? membership({ role: MembershipRole.ADMIN })
            : membership({ role: MembershipRole.OWNER })
      );

      await expect(service.removeMembers({ teamId: 1, userIds: [10], actorUserId: 1 })).rejects.toMatchObject(
        { code: ErrorCode.Forbidden }
      );
    });

    it("prevents removing the last accepted owner", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockImplementation(
        async ({ userId }: { userId: number }) =>
          userId === 1
            ? membership({ role: MembershipRole.OWNER })
            : membership({ role: MembershipRole.OWNER, userId: 10 })
      );
      mockMembershipRepository.countAcceptedOwnersByTeamId.mockResolvedValue(1);

      await expect(service.removeMembers({ teamId: 1, userIds: [10], actorUserId: 1 })).rejects.toMatchObject(
        { code: ErrorCode.Forbidden }
      );
    });
  });
});
