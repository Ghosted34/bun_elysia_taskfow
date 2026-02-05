/**
 * Tasks Service (Refactored with Repository)
 * Business logic for task management using repository pattern
 */

import type { NewTask, Task } from "../../config/db/schema";
import { cache } from "../../config/redis";
import { config } from "../config";
import type { AuthUser } from "../middlewares/authentication";
import { ForbiddenError, NotFoundError } from "../utils/error";
import { TasksRepository } from "./task.repository";
import type {
  CreateTaskInput,
  TaskQuery,
  UpdateTaskInput,
} from "./task.schema";

export class TasksService {
  private repository: TasksRepository;

  constructor() {
    this.repository = new TasksRepository();
  }

  /**
   * Get all tasks with filtering and pagination
   * OPTIMIZATION: Uses caching and repository
   */
  async getTasks(query: TaskQuery, user: AuthUser) {
    const cacheKey = `tasks:list:${JSON.stringify(query)}:${user.id}`;

    // Try cache first (only for non-search queries)
    if (!query.search) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }

    // Build WHERE conditions using repository
    const where = this.repository.buildWhereConditions({
      status: query.status,
      priority: query.priority,
      projectId: query.projectId,
      assigneeId: query.assigneeId,
      search: query.search,
    });

    // Fetch from repository
    const result = await this.repository.findMany({
      where,
      limit: Number(query.limit || "20"),
      offset: Number(query.offset || "0"),
      withRelations: true,
    });

    // Cache result for 30 minutes (only non-search queries)
    if (!query.search) {
      await cache.set(cacheKey, result, 60 * 30);
    }

    return result;
  }

  /**
   * Get task by ID
   * OPTIMIZATION: Caches individual tasks
   */
  async getTaskById(id: string) {
    const cacheKey = `task:${id}`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) return cached as Task;

    // Fetch from repository with relations
    const task = await this.repository.findOneByIdWithRelations(id);

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    // Cache for 30 minutes
    await cache.set(cacheKey, task, 60 * 30);

    return task;
  }

  /**
   * Create new task
   * OPTIMIZATION: Invalidates list cache
   */
  async createTask(input: CreateTaskInput, creatorId: string) {
    const taskData: NewTask = {
      ...input,
      creatorId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    };

    // Create via repository
    const newTask = await this.repository.create(taskData);

    // Invalidate list cache
    await cache.deletePattern("tasks:list:*");

    // Return full task with relations
    return await this.getTaskById(newTask.id);
  }

  /**
   * Update task
   * OPTIMIZATION: Invalidates both item and list caches
   */
  async updateTask(id: string, input: UpdateTaskInput, user: AuthUser) {
    // Get existing task
    const existingTask = await this.getTaskById(id);

    // Check if user can update
    // Editors can only update their own tasks, managers and admins can update any
    if (
      user.role !== "ADMIN" &&
      user.role !== "MANAGER" &&
      existingTask.creatorId !== user.id
    ) {
      throw new ForbiddenError("You can only update your own tasks");
    }

    // Prepare update data
    const updateData: Partial<typeof existingTask> = {
      ...input,
      updatedAt: new Date(),
    };

    // Handle status change to DONE
    if (input.status === "done" && existingTask.status !== "done") {
      updateData.completedAt = new Date();
    } else if (input.status && input.status !== "done") {
      updateData.completedAt = null;
    }

    // Handle due date
    if (input.dueDate !== undefined) {
      updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    // Update via repository
    await this.repository.update(id, updateData);

    // Invalidate caches
    await cache.delete(`task:${id}`);
    await cache.deletePattern("tasks:list:*");

    // Return updated task
    return await this.getTaskById(id);
  }

  /**
   * Delete task
   * OPTIMIZATION: Invalidates caches
   */
  async deleteTask(id: string, user: AuthUser) {
    // Get existing task
    const existingTask = await this.getTaskById(id);

    // Check if user can delete
    // Only creator, managers, and admins can delete
    if (
      user.role !== "ADMIN" &&
      user.role !== "MANAGER" &&
      existingTask.creatorId !== user.id
    ) {
      throw new ForbiddenError("You can only delete your own tasks");
    }

    // Delete via repository
    await this.repository.delete(id);

    // Invalidate caches
    await cache.delete(`task:${id}`);
    await cache.deletePattern("tasks:list:*");
  }

  /**
   * Get task statistics
   * OPTIMIZATION: Uses repository aggregation and caching
   */
  async getTaskStats(userId?: string) {
    const cacheKey = userId ? `task:stats:${userId}` : "task:stats:all";

    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Get stats from repository
    const result = await this.repository.getStats(userId);

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get tasks by project
   */
  async getTasksByProject(projectId: string) {
    const cacheKey = `project:${projectId}:tasks`;

    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Get from repository
    const tasks = await this.repository.findByProjectId(projectId);

    // Cache for 30 minutes
    await cache.set(cacheKey, tasks, 60 * 30);

    return tasks;
  }

  /**
   * Get tasks assigned to user
   */
  async getTasksByAssignee(assigneeId: string) {
    const cacheKey = `user:${assigneeId}:assigned-tasks`;

    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Get from repository
    const tasks = await this.repository.findByAssigneeId(assigneeId);

    // Cache for 30 minutes
    await cache.set(cacheKey, tasks, 60 * 30);

    return tasks;
  }

  /**
   * Get tasks created by user
   */
  async getTasksByCreator(creatorId: string) {
    const cacheKey = `user:${creatorId}:created-tasks`;

    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Get from repository
    const tasks = await this.repository.findByCreatorId(creatorId);

    // Cache for 30 minutes
    await cache.set(cacheKey, tasks, 60 * 30);

    return tasks;
  }

  /**
   * Bulk update tasks (e.g., change status for multiple tasks)
   */
  async bulkUpdateTasks(ids: string[], data: UpdateTaskInput, user: AuthUser) {
    // Verify all tasks exist and user has permission
    for (const id of ids) {
      const task = await this.getTaskById(id);

      if (
        user.role !== "ADMIN" &&
        user.role !== "MANAGER" &&
        task.creatorId !== user.id
      ) {
        throw new ForbiddenError(
          `You don't have permission to update task ${id}`,
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Bulk update via repository
    await this.repository.bulkUpdate(ids, updateData);

    // Invalidate caches
    for (const id of ids) {
      await cache.delete(`task:${id}`);
    }
    await cache.deletePattern("tasks:list:*");
  }

  /**
   * Check if task exists
   */
  async taskExists(id: string): Promise<boolean> {
    return await this.repository.exists(id);
  }
}
