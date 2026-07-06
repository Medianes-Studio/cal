import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { uploadLogo } from "@calcom/lib/server/avatar";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaTeamRepository, TeamDTO } from "../repositories/PrismaTeamRepository";
import { TeamService } from "./TeamService";

vi.mock("@calcom/lib/server/avatar", () => ({
  uploadLogo: vi.fn(),
}));

const buildTeam = (overrides: Partial<TeamDTO> = {}): TeamDTO => ({
  id: 1,
  name: "Design Team",
  slug: "design-team",
  logoUrl: null,
  bio: null,
  hideBranding: false,
  hideTeamProfileLink: false,
  isPrivate: false,
  hideBookATeamMember: false,
  theme: null,
  brandColor: null,
  darkBrandColor: null,
  timeZone: "Europe/London",
  weekStart: "Sunday",
  timeFormat: null,
  parentId: null,
  isOrganization: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

describe("TeamService", () => {
  let service: TeamService;
  let mockTeamRepository: {
    findById: ReturnType<typeof vi.fn>;
    findBySlug: ReturnType<typeof vi.fn>;
    createWithOwner: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteById: ReturnType<typeof vi.fn>;
    findManyByUserIdIncludeMembership: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTeamRepository = {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      createWithOwner: vi.fn(),
      update: vi.fn(),
      deleteById: vi.fn(),
      findManyByUserIdIncludeMembership: vi.fn(),
    };

    service = new TeamService({
      teamRepository: mockTeamRepository as unknown as PrismaTeamRepository,
    });
  });

  describe("create", () => {
    it("creates a team with a slugified name and an owner membership", async () => {
      mockTeamRepository.findBySlug.mockResolvedValue(null);
      mockTeamRepository.createWithOwner.mockResolvedValue(buildTeam());

      const team = await service.create({ name: "Design Team", ownerUserId: 42 });

      expect(mockTeamRepository.findBySlug).toHaveBeenCalledWith({
        slug: "design-team",
        parentId: null,
      });
      expect(mockTeamRepository.createWithOwner).toHaveBeenCalledWith({
        data: { name: "Design Team", slug: "design-team", bio: undefined },
        ownerUserId: 42,
      });
      expect(team.slug).toBe("design-team");
    });

    it("uses the provided slug over the name", async () => {
      mockTeamRepository.findBySlug.mockResolvedValue(null);
      mockTeamRepository.createWithOwner.mockResolvedValue(buildTeam({ slug: "custom" }));

      await service.create({ name: "Design Team", slug: "Custom", ownerUserId: 42 });

      expect(mockTeamRepository.findBySlug).toHaveBeenCalledWith({ slug: "custom", parentId: null });
      expect(mockTeamRepository.createWithOwner).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: "custom" }) })
      );
    });

    it("rejects a slug that is already taken", async () => {
      mockTeamRepository.findBySlug.mockResolvedValue(buildTeam());

      await expect(service.create({ name: "Design Team", ownerUserId: 42 })).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
      });
      expect(mockTeamRepository.createWithOwner).not.toHaveBeenCalled();
    });

    it("rejects a name that produces an empty slug", async () => {
      await expect(service.create({ name: "---", ownerUserId: 42 })).rejects.toBeInstanceOf(ErrorWithCode);
      expect(mockTeamRepository.findBySlug).not.toHaveBeenCalled();
    });

    it("uploads a base64 logo and stores the resulting URL", async () => {
      mockTeamRepository.findBySlug.mockResolvedValue(null);
      mockTeamRepository.createWithOwner.mockResolvedValue(buildTeam());
      mockTeamRepository.update.mockResolvedValue(buildTeam({ logoUrl: "/api/avatar/logo.png" }));
      vi.mocked(uploadLogo).mockResolvedValue("/api/avatar/logo.png");

      const team = await service.create({
        name: "Design Team",
        logo: "data:image/png;base64,abc",
        ownerUserId: 42,
      });

      expect(uploadLogo).toHaveBeenCalledWith({ teamId: 1, logo: "data:image/png;base64,abc" });
      expect(mockTeamRepository.update).toHaveBeenCalledWith({
        id: 1,
        data: { logoUrl: "/api/avatar/logo.png" },
      });
      expect(team.logoUrl).toBe("/api/avatar/logo.png");
    });

    it("ignores a logo that is not a base64 data URL", async () => {
      mockTeamRepository.findBySlug.mockResolvedValue(null);
      mockTeamRepository.createWithOwner.mockResolvedValue(buildTeam());

      await service.create({ name: "Design Team", logo: "https://evil.example/x.png", ownerUserId: 42 });

      expect(uploadLogo).not.toHaveBeenCalled();
      expect(mockTeamRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("throws NotFound when the team does not exist", async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(service.update({ teamId: 99, data: { name: "New" } })).rejects.toMatchObject({
        code: ErrorCode.NotFound,
      });
    });

    it("updates without a slug uniqueness check when the slug is unchanged", async () => {
      mockTeamRepository.findById.mockResolvedValue(buildTeam());
      mockTeamRepository.update.mockResolvedValue(buildTeam({ name: "Renamed" }));

      await service.update({ teamId: 1, data: { name: "Renamed", slug: "design-team" } });

      expect(mockTeamRepository.findBySlug).not.toHaveBeenCalled();
      expect(mockTeamRepository.update).toHaveBeenCalledWith({
        id: 1,
        data: { name: "Renamed", slug: "design-team" },
      });
    });

    it("rejects a slug change that collides with another team", async () => {
      mockTeamRepository.findById.mockResolvedValue(buildTeam());
      mockTeamRepository.findBySlug.mockResolvedValue(buildTeam({ id: 2, slug: "taken" }));

      await expect(service.update({ teamId: 1, data: { slug: "taken" } })).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
      });
      expect(mockTeamRepository.update).not.toHaveBeenCalled();
    });

    it("slugifies the new slug before saving", async () => {
      mockTeamRepository.findById.mockResolvedValue(buildTeam());
      mockTeamRepository.findBySlug.mockResolvedValue(null);
      mockTeamRepository.update.mockResolvedValue(buildTeam({ slug: "new-slug" }));

      await service.update({ teamId: 1, data: { slug: "New Slug" } });

      expect(mockTeamRepository.findBySlug).toHaveBeenCalledWith({ slug: "new-slug", parentId: null });
      expect(mockTeamRepository.update).toHaveBeenCalledWith({ id: 1, data: { slug: "new-slug" } });
    });

    it("uploads a new base64 logo on update", async () => {
      mockTeamRepository.findById.mockResolvedValue(buildTeam());
      mockTeamRepository.update.mockResolvedValue(buildTeam({ logoUrl: "/api/avatar/new.png" }));
      vi.mocked(uploadLogo).mockResolvedValue("/api/avatar/new.png");

      await service.update({ teamId: 1, data: { logo: "data:image/png;base64,xyz" } });

      expect(uploadLogo).toHaveBeenCalledWith({ teamId: 1, logo: "data:image/png;base64,xyz" });
      expect(mockTeamRepository.update).toHaveBeenCalledWith({
        id: 1,
        data: { logoUrl: "/api/avatar/new.png" },
      });
    });
  });

  describe("delete", () => {
    it("deletes an existing team", async () => {
      mockTeamRepository.findById.mockResolvedValue(buildTeam());

      await service.delete({ teamId: 1 });

      expect(mockTeamRepository.deleteById).toHaveBeenCalledWith({ id: 1 });
    });

    it("throws NotFound for a missing team", async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(service.delete({ teamId: 99 })).rejects.toMatchObject({
        code: ErrorCode.NotFound,
      });
      expect(mockTeamRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("returns the team when it exists", async () => {
      mockTeamRepository.findById.mockResolvedValue(buildTeam());

      await expect(service.getById({ teamId: 1 })).resolves.toMatchObject({ id: 1 });
    });

    it("throws NotFound when it does not", async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(service.getById({ teamId: 99 })).rejects.toMatchObject({
        code: ErrorCode.NotFound,
      });
    });
  });

  describe("listUserTeams", () => {
    it("returns the teams of the user including membership state", async () => {
      const teams = [{ ...buildTeam(), membership: { role: "OWNER", accepted: true } }];
      mockTeamRepository.findManyByUserIdIncludeMembership.mockResolvedValue(teams);

      await expect(service.listUserTeams({ userId: 42 })).resolves.toEqual(teams);
      expect(mockTeamRepository.findManyByUserIdIncludeMembership).toHaveBeenCalledWith({ userId: 42 });
    });
  });
});
