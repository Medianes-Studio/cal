import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TFunction } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaTeamInviteRepository } from "../repositories/PrismaTeamInviteRepository";
import type { PrismaTeamRepository } from "../repositories/PrismaTeamRepository";
import { TeamInviteService } from "./TeamInviteService";

vi.mock("@calcom/emails/organization-email-service", () => ({
  sendTeamInviteEmail: vi.fn(),
}));

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    create: vi.fn(),
  },
}));

const translation = ((key: string) => key) as TFunction;

describe("TeamInviteService", () => {
  let service: TeamInviteService;
  let mockInviteRepository: {
    findUserByEmail: ReturnType<typeof vi.fn>;
    createInvitedUser: ReturnType<typeof vi.fn>;
    createVerificationToken: ReturnType<typeof vi.fn>;
    findVerificationTokenByIdentifier: ReturnType<typeof vi.fn>;
  };
  let mockTeamRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockMembershipRepository: {
    findUniqueByUserIdAndTeamId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInviteRepository = {
      findUserByEmail: vi.fn(),
      createInvitedUser: vi.fn(),
      createVerificationToken: vi.fn().mockResolvedValue({ token: "unused" }),
      findVerificationTokenByIdentifier: vi.fn(),
    };
    mockTeamRepository = {
      findById: vi.fn().mockResolvedValue({ id: 1, name: "Design Team" }),
    };
    mockMembershipRepository = {
      findUniqueByUserIdAndTeamId: vi.fn(),
    };
    service = new TeamInviteService({
      teamInviteRepository: mockInviteRepository as unknown as PrismaTeamInviteRepository,
      teamRepository: mockTeamRepository as unknown as PrismaTeamRepository,
      membershipRepository: mockMembershipRepository as unknown as InstanceType<typeof MembershipRepository>,
    });
  });

  it("throws NotFound when the team does not exist", async () => {
    mockTeamRepository.findById.mockResolvedValue(null);

    await expect(
      service.inviteMembers({
        teamId: 99,
        invitations: [{ email: "new@example.com", role: MembershipRole.MEMBER }],
        inviterName: "Alice",
        translation,
      })
    ).rejects.toMatchObject({ code: ErrorCode.NotFound });
  });

  it("invites a brand new user with a stub account, pending membership and signup link", async () => {
    mockInviteRepository.findUserByEmail.mockResolvedValue(null);
    mockInviteRepository.createInvitedUser.mockResolvedValue({ id: 7, email: "new@example.com" });

    const result = await service.inviteMembers({
      teamId: 1,
      invitations: [{ email: "New@Example.com", role: MembershipRole.ADMIN }],
      inviterName: "Alice",
      translation,
    });

    expect(mockInviteRepository.createInvitedUser).toHaveBeenCalledWith({
      email: "new@example.com",
      teamId: 1,
    });
    expect(MembershipRepository.create).toHaveBeenCalledWith({
      teamId: 1,
      userId: 7,
      role: MembershipRole.ADMIN,
      accepted: false,
    });
    expect(mockInviteRepository.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "new@example.com", teamId: 1 })
    );
    expect(sendTeamInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@example.com",
        teamName: "Design Team",
        isCalcomMember: false,
        joinLink: expect.stringContaining("/signup?token="),
      })
    );
    expect(result.invited).toEqual(["new@example.com"]);
  });

  it("invites an existing user with a pending membership and a /teams join link", async () => {
    mockInviteRepository.findUserByEmail.mockResolvedValue({
      id: 5,
      email: "bob@example.com",
      username: "bob",
      invitedTo: null,
      locale: "fr",
    });
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(null);

    await service.inviteMembers({
      teamId: 1,
      invitations: [{ email: "bob@example.com", role: MembershipRole.MEMBER }],
      inviterName: "Alice",
      translation,
    });

    expect(MembershipRepository.create).toHaveBeenCalledWith({
      teamId: 1,
      userId: 5,
      role: MembershipRole.MEMBER,
      accepted: false,
    });
    expect(mockInviteRepository.createVerificationToken).not.toHaveBeenCalled();
    expect(sendTeamInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        isCalcomMember: true,
        joinLink: expect.stringContaining("/teams"),
      })
    );
  });

  it("rejects inviting someone who is already a member", async () => {
    mockInviteRepository.findUserByEmail.mockResolvedValue({
      id: 5,
      email: "bob@example.com",
      username: "bob",
      invitedTo: null,
      locale: null,
    });
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({ id: 1, accepted: true });

    await expect(
      service.inviteMembers({
        teamId: 1,
        invitations: [{ email: "bob@example.com", role: MembershipRole.MEMBER }],
        inviterName: "Alice",
        translation,
      })
    ).rejects.toMatchObject({ code: ErrorCode.BadRequest });
    expect(MembershipRepository.create).not.toHaveBeenCalled();
  });

  it("reuses the pending signup token when re-inviting a stub user to another team", async () => {
    mockInviteRepository.findUserByEmail.mockResolvedValue({
      id: 9,
      email: "stub@example.com",
      username: null,
      invitedTo: 2,
      locale: null,
    });
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(null);
    mockInviteRepository.findVerificationTokenByIdentifier.mockResolvedValue({
      token: "existing-token",
      expires: new Date(Date.now() + 60_000),
    });

    await service.inviteMembers({
      teamId: 1,
      invitations: [{ email: "stub@example.com", role: MembershipRole.MEMBER }],
      inviterName: "Alice",
      translation,
    });

    expect(mockInviteRepository.createVerificationToken).not.toHaveBeenCalled();
    expect(sendTeamInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        joinLink: expect.stringContaining("existing-token"),
        isCalcomMember: false,
      })
    );
  });

  it("issues a fresh token when the stub user's pending token expired", async () => {
    mockInviteRepository.findUserByEmail.mockResolvedValue({
      id: 9,
      email: "stub@example.com",
      username: null,
      invitedTo: 2,
      locale: null,
    });
    mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(null);
    mockInviteRepository.findVerificationTokenByIdentifier.mockResolvedValue({
      token: "expired-token",
      expires: new Date(Date.now() - 60_000),
    });

    await service.inviteMembers({
      teamId: 1,
      invitations: [{ email: "stub@example.com", role: MembershipRole.MEMBER }],
      inviterName: "Alice",
      translation,
    });

    expect(mockInviteRepository.createVerificationToken).toHaveBeenCalled();
  });

  it("does not fail the invitation when the email cannot be sent", async () => {
    mockInviteRepository.findUserByEmail.mockResolvedValue(null);
    mockInviteRepository.createInvitedUser.mockResolvedValue({ id: 7, email: "new@example.com" });
    vi.mocked(sendTeamInviteEmail).mockRejectedValue(new Error("SMTP down"));

    const result = await service.inviteMembers({
      teamId: 1,
      invitations: [{ email: "new@example.com", role: MembershipRole.MEMBER }],
      inviterName: "Alice",
      translation,
    });

    expect(result.invited).toEqual(["new@example.com"]);
  });
});
