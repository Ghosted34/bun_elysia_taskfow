/**
 * Tasks Repository
 * All database operations for tasks
 * Separates data access from business logic
 */

import { eq, and, or, like, desc, sql, type SQL } from 'drizzle-orm';
import { tasks, type NewTask, type Task } from '../../config/db/schema';
import { db } from '../../config/db';



export interface FindTasksOptions {
  where?: SQL;
  limit?: number;
  offset?: number;
  withRelations?: boolean;
}

export interface TasksListResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  assigneeId: string | null;
  creatorId: string;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  } | null;
}

export class TasksRepository {
  /**
   * Find one task by ID
   */
  async findOneById(id: string): Promise<Task | undefined> {
    return await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });
  }

  /**
   * Find one task by ID with relations
   */
  async findOneByIdWithRelations(id: string) {
    return await db.query.tasks.findFirst({
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
  }

  /**
   * Find one task by field
   */
  async findOne({
    field,
    value,
    select,
  }: {
    field: keyof typeof tasks.$inferSelect;
    value: any;
    select?: (keyof typeof tasks.$inferSelect)[];
  }) {
    return await db.query.tasks.findFirst({
      where: eq(tasks[field] as any, value),
      columns: select
        ? Object.fromEntries(select.map((f) => [f, true]))
        : undefined,
    });
  }

  /**
   * Find many tasks with conditions
   */
  async findMany(options: FindTasksOptions): Promise<TasksListResult[]> {
    const { where, limit = 20, offset = 0, withRelations = true } = options;

    if (withRelations) {
      return await db.query.tasks.findMany({
        where,
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
        limit,
        offset,
        orderBy: [desc(tasks.createdAt)],
      }) as TasksListResult[];
    }

    return (await db.query.tasks.findMany({
      where,
      limit,
      offset,
      orderBy: [desc(tasks.createdAt)],
    })) as TasksListResult[];
  }

  /**
   * Build WHERE conditions for task queries
   */
  buildWhereConditions(filters: {
    status?: string;
    priority?: string;
    projectId?: string;
    assigneeId?: string;
    creatorId?: string;
    search?: string;
  }): SQL | undefined {
    const conditions: SQL[] = [];

    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }

    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority as any));
    }

    if (filters.projectId) {
      conditions.push(eq(tasks.projectId, filters.projectId));
    }

    if (filters.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }

    if (filters.creatorId) {
      conditions.push(eq(tasks.creatorId, filters.creatorId));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(tasks.title, `%${filters.search}%`),
          like(tasks.description, `%${filters.search}%`)
        )!
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Create new task
   */
  async create(data: NewTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(data).returning();
    return task!;
  }

  /**
   * Create with specific fields returned
   */
  async createWithSelect({
    data,
    select,
  }: {
    data: NewTask;
    select?: (keyof typeof tasks.$inferSelect)[];
  }) {
    const returning = select?.reduce(
      (acc, key) => {
        acc[key] = tasks[key];
        return acc;
      },
      {} as Record<string, any>
    ) || {};

    const [result] = await db.insert(tasks).values(data).returning(returning);
    return result;
  }

  /**
   * Update task
   */
  async update(id: string, data: Partial<Task>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set(data)
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask!;
  }

  /**
   * Update with specific fields returned
   */
  async updateWithSelect({
    id,
    data,
    select,
  }: {
    id: string;
    data: Partial<Task>;
    select?: (keyof typeof tasks.$inferSelect)[];
  }) {
    const returning = select?.reduce(
      (acc, key) => {
        acc[key] = tasks[key];
        return acc;
      },
      {} as Record<string, any>
    ) || {};

    const [result] = await db
      .update(tasks)
      .set(data)
      .where(eq(tasks.id, id))
      .returning(returning);

    return result;
  }

  /**
   * Delete task
   */
  async delete(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  /**
   * Get task statistics
   */
  async getStats(assigneeId?: string) {
    const whereCondition = assigneeId ? eq(tasks.assigneeId, assigneeId) : undefined;

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

    return stats[0];
  }

  /**
   * Count tasks
   */
  async count(where?: SQL): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(where);

    return result[0]?.count || 0;
  }

  /**
   * Check if task exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get tasks by project ID
   */
  async findByProjectId(projectId: string): Promise<Task[]> {
    return await db.query.tasks.findMany({
      where: eq(tasks.projectId, projectId),
      orderBy: [desc(tasks.createdAt)],
    });
  }

  /**
   * Get tasks by assignee ID
   */
  async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    return await db.query.tasks.findMany({
      where: eq(tasks.assigneeId, assigneeId),
      orderBy: [desc(tasks.createdAt)],
    });
  }

  /**
   * Get tasks by creator ID
   */
  async findByCreatorId(creatorId: string): Promise<Task[]> {
    return await db.query.tasks.findMany({
      where: eq(tasks.creatorId, creatorId),
      orderBy: [desc(tasks.createdAt)],
    });
  }

  /**
   * Bulk update tasks
   */
  async bulkUpdate(ids: string[], data: Partial<Task>): Promise<Task[]> {
    const updatedTasks = await db
      .update(tasks)
      .set(data)
      .where(
        or(...ids.map(id => eq(tasks.id, id)))!
      )
      .returning();

    return updatedTasks;
  }

  /**
   * Bulk delete tasks
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await db.delete(tasks).where(
      or(...ids.map(id => eq(tasks.id, id)))!
    );
  }
}