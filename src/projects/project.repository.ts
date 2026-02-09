/**
 * Projects Repository
 * All database operations for projects
 */

import { eq, and, like, desc, sql, type SQL } from "drizzle-orm";
import {
  projects,
  type NewProject,
  type Project,
} from "../../config/db/schema";
import { db } from "../../config/db";

export interface FindProjectsOptions {
  where?: SQL;
  limit?: number;
  offset?: number;
  withRelations?: boolean;
}

export class ProjectsRepository {
  /**
   * Find one project by ID
   */
  async findOneById(id: string): Promise<Project | undefined> {
    return await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });
  }

  /**
   * Find one project by ID with relations
   */
  async findOneByIdWithRelations(id: string) {
    return await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          with: {
            assignee: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
        },
      },
    });
  }

  /**
   * Find one project by field
   */
  async findOne({
    field,
    value,
    select,
  }: {
    field: keyof typeof projects.$inferSelect;
    value: any;
    select?: (keyof typeof projects.$inferSelect)[];
  }) {
    return await db.query.projects.findFirst({
      where: eq(projects[field] as any, value),
      columns: select
        ? Object.fromEntries(select.map((f) => [f, true]))
        : undefined,
    });
  }

  /**
   * Find many projects with conditions
   */
  async findMany(options: FindProjectsOptions) {
    const { where, limit = 20, offset = 0, withRelations = true } = options;

    if (withRelations) {
      return await db.query.projects.findMany({
        where,
        with: {
          owner: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          tasks: {
            columns: {
              id: true,
              title: true,
              status: true,
            },
            limit: 5, // Only include first 5 tasks
          },
        },
        limit,
        offset,
        orderBy: [desc(projects.createdAt)],
      });
    }

    return await db.query.projects.findMany({
      where,
      limit,
      offset,
      orderBy: [desc(projects.createdAt)],
    });
  }

  /**
   * Build WHERE conditions for project queries
   */
  buildWhereConditions(filters: {
    search?: string;
    ownerId?: string;
  }): SQL | undefined {
    const conditions: SQL[] = [];

    if (filters.search) {
      conditions.push(like(projects.name, `%${filters.search}%`));
    }

    if (filters.ownerId) {
      conditions.push(eq(projects.ownerId, filters.ownerId));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Create new project
   */
  async create(data: NewProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(data).returning();
    return newProject!;
  }

  /**
   * Create with specific fields returned
   */
  async createWithSelect({
    data,
    select,
  }: {
    data: NewProject;
    select?: (keyof typeof projects.$inferSelect)[];
  }) {
    const returning =
      select?.reduce(
        (acc, key) => {
          acc[key] = projects[key];
          return acc;
        },
        {} as Record<string, any>,
      ) || {};

    const [result] = await db
      .insert(projects)
      .values(data)
      .returning(returning);
    return result;
  }

  /**
   * Update project
   */
  async update(id: string, data: Partial<Project>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning();

    return updatedProject!;
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
    data: Partial<Project>;
    select?: (keyof typeof projects.$inferSelect)[];
  }) {
    const returning =
      select?.reduce(
        (acc, key) => {
          acc[key] = projects[key];
          return acc;
        },
        {} as Record<string, any>,
      ) || {};

    const [result] = await db
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning(returning);

    return result;
  }

  /**
   * Delete project
   */
  async delete(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  /**
   * Get project statistics
   */
  async getStats(projectId?: string) {
    const whereCondition = projectId ? eq(projects.id, projectId) : undefined;

    const stats = await db
      .select({
        totalProjects: sql<number>`count(*)::int`,
        projectsWithTasks: sql<number>`count(*) filter (where (select count(*) from tasks where tasks.project_id = projects.id) > 0)::int`,
      })
      .from(projects)
      .where(whereCondition);

    return stats[0];
  }

  /**
   * Get user's projects with task counts
   */
  async findByOwnerIdWithTaskCounts(userId: string) {
    return await db.query.projects.findMany({
      where: eq(projects.ownerId, userId),
      with: {
        tasks: {
          columns: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: [desc(projects.createdAt)],
    });
  }

  /**
   * Count projects
   */
  async count(where?: SQL): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(where);

    return result[0]?.count || 0;
  }

  /**
   * Check if project exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get projects by owner ID
   */
  async findByOwnerId(ownerId: string): Promise<Project[]> {
    return await db.query.projects.findMany({
      where: eq(projects.ownerId, ownerId),
      orderBy: [desc(projects.createdAt)],
    });
  }
}
