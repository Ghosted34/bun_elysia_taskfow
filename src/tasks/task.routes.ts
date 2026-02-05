/**
 * Task Routes
 * Pure route definitions - delegates to controller
 */

import { Elysia, t, type Context } from "elysia";
import { TaskController } from "./task.controller";
import { authenticate } from "../middlewares/authentication";
import { requirePermission } from "../middlewares/authorization";
import { rateLimit } from "elysia-rate-limit";

const taskController = new TaskController();

export const tasksRoutes = new Elysia({ prefix: "/tasks" })
  .derive(async (ctx) => {
    const user = await authenticate(ctx);
    return { user };
  })
  .guard({
    beforeHandle(ctx) {
      requirePermission("tasks:read")(ctx.user);
    },
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
    beforeHandle() {
      rateLimit({
        max: 200,
      });
    },
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
    beforeHandle() {
      rateLimit({
        max: 60,
      });
    },
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
    beforeHandle() {
      rateLimit({
        max: 300,
      });
    },
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
    beforeHandle() {
      rateLimit({
        max: 30,
      });
    },
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
    beforeHandle() {
      rateLimit({
        max: 60,
      });
    },
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
    beforeHandle() {
      rateLimit({
        max: 20,
      });
    },
  });
