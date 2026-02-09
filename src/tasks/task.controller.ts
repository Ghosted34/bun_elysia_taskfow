import type { Context } from "elysia";
import { TasksService } from "./task.service";
import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
} from "./task.schema";

const tasksService = new TasksService();

export class TaskController {
  /**
   * GET /tasks
   * Get all tasks with filtering and pagination
   * Requires: tasks:read permission
   */
  async list(ctx: Context) {
    const validated = taskQuerySchema.parse(ctx.query);
    const tasks = await tasksService.getTasks(validated, ctx.user.id!);

    return {
      message: "Tasks retrieved successfully",
      data: tasks,
    };
  }

  /**
   * GET /tasks/stats
   * Get task statistics
   * Requires: tasks:read permission
   */
  async stats(ctx: Context) {
    const stats = await tasksService.getTaskStats(ctx.query.userId);

    return {
      message: "Task statistics retrieved successfully",
      data: stats,
    };
  }

  /**
   * GET /tasks/:id
   * Get task by ID
   * Requires: tasks:read permission
   */
  async get(ctx: Context) {
    const task = await tasksService.getTaskById(ctx.params.id!);

    return {
      message: "Task retrieved successfully",
      data: task,
    };
  }

  /**
   * POST /tasks
   * Create new task
   * Requires: tasks:create permission
   */
  async create(ctx: Context) {
    const validated = createTaskSchema.parse(ctx.body);
    const task = await tasksService.createTask(validated, ctx.user.id);

    return {
      message: "Task created successfully",
      data: task,
    };
  }

  /**
   * PATCH /tasks/:id
   * Update task
   * Requires: tasks:update permission
   */
  async update(ctx: Context) {
    const validated = updateTaskSchema.parse(ctx.body);
    const task = await tasksService.updateTask(
      ctx.params.id!,
      validated,
      ctx.user,
    );

    return {
      message: "Task updated successfully",
      data: task,
    };
  }

  /**
   * DELETE /tasks/:id
   * Delete task
   * Requires: tasks:delete permission
   */
  async delete(ctx: Context) {
    await tasksService.deleteTask(ctx.params.id!, ctx.user);

    return {
      message: "Task deleted successfully",
    };
  }
}
