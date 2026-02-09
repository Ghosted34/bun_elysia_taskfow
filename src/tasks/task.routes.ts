/**
 * Task Routes
 * Pure route definitions - delegates to controller
 */

import { Elysia, t } from "elysia";
import { TaskController } from "./task.controller";
import { authenticate, requireAuth } from "../middlewares/authentication";
import { requirePermission } from "../middlewares/authorization";

const taskController = new TaskController();

export const tasksRoutes = new Elysia({ prefix: "/tasks" })
  .derive(async (ctx) => {
    const user = await authenticate(ctx);
    return { user };
  })
  /**
   * GET /tasks
   * Get all tasks with filtering and pagination
   * Requires: tasks:read permission
   */
  .get("/", (ctx) => taskController.list(ctx), {
    query: t.Object({
      status: t.Optional(t.String()),
      priority: t.Optional(t.String()),
      projectId: t.Optional(t.String()),
      assigneeId: t.Optional(t.String()),
      search: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Tasks"],
      summary: "Get all tasks",
      description: "Retrieve tasks with optional filtering and pagination",
    },
    beforeHandle: [requireAuth],
  })

  /**
   * GET /tasks/stats
   * Get task statistics
   * Requires: tasks:read permission
   */
  .get("/stats", (ctx) => taskController.stats(ctx), {
    query: t.Object({
      userId: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Tasks"],
      summary: "Get task statistics",
      description: "Get aggregated task statistics",
    },
    beforeHandle: [requireAuth, requirePermission("tasks:read")],
  })

  /**
   * GET /tasks/:id
   * Get task by ID
   * Requires: tasks:read permission
   */
  .get("/:id", (ctx) => taskController.get(ctx), {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      tags: ["Tasks"],
      summary: "Get task by ID",
      description: "Retrieve a specific task by its ID",
    },
    beforeHandle: [requireAuth, requirePermission("tasks:read")],
  })

  /**
   * POST /tasks
   * Create new task
   * Requires: tasks:create permission
   */
  .post("/", (ctx) => taskController.create(ctx), {
    body: t.Object({
      title: t.String(),
      description: t.Optional(t.String()),
      status: t.Optional(t.String()),
      priority: t.Optional(t.String()),
      projectId: t.Optional(t.String()),
      assigneeId: t.Optional(t.String()),
      dueDate: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Tasks"],
      summary: "Create task",
      description: "Create a new task",
    },
    beforeHandle: [requireAuth, requirePermission("tasks:create")],
  })

  /**
   * PATCH /tasks/:id
   * Update task
   * Requires: tasks:update permission
   */
  .patch("/:id", (ctx) => taskController.update(ctx), {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      status: t.Optional(t.String()),
      priority: t.Optional(t.String()),
      projectId: t.Optional(t.String()),
      assigneeId: t.Optional(t.Union([t.String(), t.Null()])),
      dueDate: t.Optional(t.Union([t.String(), t.Null()])),
    }),
    detail: {
      tags: ["Tasks"],
      summary: "Update task",
      description: "Update an existing task",
    },
    beforeHandle: [requireAuth, requirePermission("tasks:update")],
  })

  /**
   * DELETE /tasks/:id
   * Delete task
   * Requires: tasks:delete permission
   */
  .delete("/:id", (ctx) => taskController.delete(ctx), {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      tags: ["Tasks"],
      summary: "Delete task",
      description: "Delete a task",
    },
    beforeHandle: [requireAuth, requirePermission("tasks:delete")],
  });
