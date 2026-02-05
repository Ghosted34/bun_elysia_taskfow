/**
 * Projects Routes
 * Project management endpoints with RBAC and rate limiting
 */

import { Elysia, t } from "elysia";
import { ProjectsController } from "./project.controller";
import { authenticate } from "../middlewares/authentication";
import { requirePermission } from "../middlewares/authorization";
import { rateLimit } from "elysia-rate-limit";

const projectsController = new ProjectsController();

export const projectsRoutes = new Elysia({ prefix: "/projects" })
  .derive(async (ctx) => {
    const user = await authenticate(ctx);
    return { user };
  })
  /**
   * GET /projects
   * List all projects with filtering
   */
  .get("/", async (ctx) => projectsController.getProjects(ctx), {
    query: t.Object({
      search: t.Optional(t.String()),
      ownerId: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    beforeHandle: [
      rateLimit({
        max: 200,
        errorResponse: "Too many requests",
        scoping: "scoped",
      }),
      requirePermission("projects:read"),
    ],
    detail: {
      tags: ["Projects"],
      summary: "Get all projects",
      description: "Retrieve projects with optional filtering and pagination",
    },
  })

  /**
   * GET /projects/stats
   * Get project statistics
   */
  .get("/stats", async (ctx) => projectsController.getProjectStats(ctx), {
    query: t.Object({
      projectId: t.Optional(t.String()),
    }),
    beforeHandle: [requirePermission("projects:read")],
    detail: {
      tags: ["Projects"],
      summary: "Get project statistics",
      description: "Get aggregated project statistics",
    },
  })

  /**
   * GET /projects/my
   * Get current user's projects
   */
  .get("/my", async (ctx) => projectsController.getMyProjects(ctx), {
    beforeHandle: requireAuth,
    detail: {
      tags: ["Projects"],
      summary: "Get my projects",
      description: "Get all projects owned by the current user",
    },
  })

  /**
   * GET /projects/:id
   * Get project by ID
   */
  .get("/:id", async (ctx) => projectsController.getProjectById(ctx), {
    params: t.Object({
      id: t.String(),
    }),
    beforeHandle: [requireAuth, requirePermission("projects:read")],
    detail: {
      tags: ["Projects"],
      summary: "Get project by ID",
      description: "Retrieve a specific project by its ID",
    },
  })

  /**
   * POST /projects
   * Create new project
   * Rate limited to 10 per hour for expensive operations
   */
  .use(rateLimit(rateLimitPresets.expensive))
  .post("/", async (ctx) => projectsController.createProject(ctx), {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
    }),
    beforeHandle: [requireAuth, requirePermission("projects:create")],
    detail: {
      tags: ["Projects"],
      summary: "Create project",
      description: "Create a new project",
    },
  })

  /**
   * PATCH /projects/:id
   * Update project
   */
  .patch("/:id", async (ctx) => projectsController.updateProject(ctx), {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.Union([t.String(), t.Null()])),
    }),
    beforeHandle: [requireAuth, requirePermission("projects:update")],
    detail: {
      tags: ["Projects"],
      summary: "Update project",
      description: "Update an existing project",
    },
  })

  /**
   * DELETE /projects/:id
   * Delete project - Only owner or admin
   */
  .delete("/:id", async (ctx) => projectsController.deleteProject(ctx), {
    params: t.Object({
      id: t.String(),
    }),
    beforeHandle: [requireAuth, requirePermission("projects:delete")],
    detail: {
      tags: ["Projects"],
      summary: "Delete project",
      description: "Delete a project (owner or admin only)",
    },
  });
