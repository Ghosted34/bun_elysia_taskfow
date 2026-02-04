
/**
 * Tasks Service
 * Business logic for task management with performance optimizations
 */

import { eq, and, or, like, sql, desc } from 'drizzle-orm';
import { db } from '@/database';
import { tasks, type NewTask } from '@/database/schema';
import { NotFoundError, ForbiddenError } from '@/shared/errors';
import { cache } from '@/config/redis';
import { config } from '@/config';
import type { CreateTaskInput, UpdateTaskInput, TaskQuery } from './tasks.schema';
import type { AuthUser } from '@/shared/middleware/auth';

export class TasksService {
  /**
   * Get all tasks with filtering and pagination
   * OPTIMIZATION: Uses indexes on status, assigneeId, projectId
   */
  async getTasks(query: TaskQuery, user: AuthUser) {
    // Build cache key based on query params
    const cacheKey = `tasks:list:${JSON.stringify(query)}:${user.id}`;
    
    // Try cache first (only for common queries)
    if (!query.search) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }

    // Build WHERE conditions
    const conditions = [];

    if (query.status) {
      conditions.push(eq(tasks.status, query.status));
    }

    if (query.priority) {
      conditions.push(eq(tasks.priority, query.priority));
    }

    if (query.projectId) {
      conditions.push(eq(tasks.projectId, query.projectId));
    }

    if (query.assigneeId) {
      conditions.push(eq(tasks.assigneeId, query.assigneeId));
    }

    if (query.search) {
      conditions.push(
        or(
          like(tasks.title, `%${query.search}%`),
          like(tasks.description, `%${query.search}%`)
        )!
      );
    }

    // Execute optimized query with relations
    const result = await db.query.tasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        assignee: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      limit: parseInt(query.limit || '20'),
      offset: parseInt(query.offset || '0'),
      orderBy: [desc(tasks.createdAt)],
    });

    // Cache result for 30 minutes (only non-search queries)
    if (!query.search) {
      await cache.set(cacheKey, result, config.redis.ttl.task);
    }

    return result;
  }

  /**
   * Get task by ID
   * OPTIMIZATION: Caches individual tasks
   */
  async getTaskById(id: string) {
    // Try cache first
    const cacheKey = `task:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from database with relations
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        assignee: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Cache for 30 minutes
    await cache.set(cacheKey, task, config.redis.ttl.task);

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

    const [newTask] = await db.insert(tasks).values(taskData).returning();

    // Invalidate list cache
    await cache.deletePattern('tasks:list:*');

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
      user.role !== 'ADMIN' && 
      user.role !== 'MANAGER' && 
      existingTask.creatorId !== user.id
    ) {
      throw new ForbiddenError('You can only update your own tasks');
    }

    // Handle status change to DONE
    const updateData: any = {
      ...input,
      updatedAt: new Date(),
    };

    if (input.status === 'DONE' && existingTask.status !== 'DONE') {
      updateData.completedAt = new Date();
    } else if (input.status && input.status !== 'DONE') {
      updateData.completedAt = null;
    }

    if (input.dueDate !== undefined) {
      updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    // Update task
    await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id));

    // Invalidate caches
    await cache.delete(`task:${id}`);
    await cache.deletePattern('tasks:list:*');

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
      user.role !== 'ADMIN' && 
      user.role !== 'MANAGER' && 
      existingTask.creatorId !== user.id
    ) {
      throw new ForbiddenError('You can only delete your own tasks');
    }

    // Delete task
    await db.delete(tasks).where(eq(tasks.id, id));

    // Invalidate caches
    await cache.delete(`task:${id}`);
    await cache.deletePattern('tasks:list:*');
  }

  /**
   * Get task statistics
   * OPTIMIZATION: Uses SQL aggregation for performance
   */
  async getTaskStats(userId?: string) {
    const cacheKey = userId ? `task:stats:${userId}` : 'task:stats:all';
    
    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Build query
    const whereCondition = userId ? eq(tasks.assigneeId, userId) : undefined;

    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        todo: sql<number>`count(*) filter (where status = 'TODO')::int`,
        inProgress: sql<number>`count(*) filter (where status = 'IN_PROGRESS')::int`,
        done: sql<number>`count(*) filter (where status = 'DONE')::int`,
        cancelled: sql<number>`count(*) filter (where status = 'CANCELLED')::int`,
        overdue: sql<number>`count(*) filter (where due_date < now() and status != 'DONE' and status != 'CANCELLED')::int`,
      })
      .from(tasks)
      .where(whereCondition);

    const result = stats[0];

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    return result;
  }
}
/**
 * Tasks Routes
 * Task management endpoints with RBAC protection
 */

import { Elysia, t } from 'elysia';
import { TasksService } from './tasks.service';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from './tasks.schema';
import { authenticate } from '@/shared/middleware/auth';
import { requirePermission } from '@/shared/middleware/rbac';

const tasksService = new TasksService();

export const tasksRoutes = new Elysia({ prefix: '/tasks' })
  /**
   * GET /tasks
   * Get all tasks with filtering and pagination
   * Requires: tasks:read permission
   */
  .get('/', async ({ request, query }) => {
    const user = await authenticate({ request } as any);
    requirePermission('tasks:read')(user);

    const validated = taskQuerySchema.parse(query);
    const tasks = await tasksService.getTasks(validated, user);

    return {
      message: 'Tasks retrieved successfully',
      data: tasks,
    };
  }, {
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
      tags: ['Tasks'],
      summary: 'Get all tasks',
      description: 'Retrieve tasks with optional filtering and pagination',
    },
  })

  /**
   * GET /tasks/stats
   * Get task statistics
   * Requires: tasks:read permission
   */
  .get('/stats', async ({ request, query }) => {
    const user = await authenticate({ request } as any);
    requirePermission('tasks:read')(user);

    const stats = await tasksService.getTaskStats(query.userId);

    return {
      message: 'Task statistics retrieved successfully',
      data: stats,
    };
  }, {
    query: t.Object({
      userId: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Tasks'],
      summary: 'Get task statistics',
      description: 'Get aggregated task statistics',
    },
  })

  /**
   * GET /tasks/:id
   * Get task by ID
   * Requires: tasks:read permission
   */
  .get('/:id', async ({ request, params }) => {
    const user = await authenticate({ request } as any);
    requirePermission('tasks:read')(user);

    const task = await tasksService.getTaskById(params.id);

    return {
      message: 'Task retrieved successfully',
      data: task,
    };
  }, {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      tags: ['Tasks'],
      summary: 'Get task by ID',
      description: 'Retrieve a specific task by its ID',
    },
  })

  /**
   * POST /tasks
   * Create new task
   * Requires: tasks:create permission
   */
  .post('/', async ({ request, body }) => {
    const user = await authenticate({ request } as any);
    requirePermission('tasks:create')(user);

    const validated = createTaskSchema.parse(body);
    const task = await tasksService.createTask(validated, user.id);

    return {
      message: 'Task created successfully',
      data: task,
    };
  }, {
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
      tags: ['Tasks'],
      summary: 'Create task',
      description: 'Create a new task',
    },
  })

  /**
   * PATCH /tasks/:id
   * Update task
   * Requires: tasks:update permission
   */
  .patch('/:id', async ({ request, params, body }) => {
    const user = await authenticate({ request } as any);
    requirePermission('tasks:update')(user);

    const validated = updateTaskSchema.parse(body);
    const task = await tasksService.updateTask(params.id, validated, user);

    return {
      message: 'Task updated successfully',
      data: task,
    };
  }, {
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
      tags: ['Tasks'],
      summary: 'Update task',
      description: 'Update an existing task',
    },
  })

  /**
   * DELETE /tasks/:id
   * Delete task
   * Requires: tasks:delete permission
   */
  .delete('/:id', async ({ request, params }) => {
    const user = await authenticate({ request } as any);
    requirePermission('tasks:delete')(user);

    await tasksService.deleteTask(params.id, user);

    return {
      message: 'Task deleted successfully',
    };
  }, {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      tags: ['Tasks'],
      summary: 'Delete task',
      description: 'Delete a task',
    },
  });