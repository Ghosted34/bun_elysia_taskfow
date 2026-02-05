/**
 * Projects Service (Refactored with Repository)
 * Business logic for project management using repository pattern
 */

import type { NewProject, Project } from "../../config/db/schema";
import { cache } from "../../config/redis";
import type { AuthUser } from "../middlewares/authentication";
import { ForbiddenError, NotFoundError } from "../utils/error";
import  { ProjectsRepository } from "./project.repository";
import type { CreateProjectInput, ProjectQuery, UpdateProjectInput } from "./project.schema";


export class ProjectsService {
  private repository: ProjectsRepository;

  constructor() {
    this.repository = new ProjectsRepository();
  }

  /**
   * Get all projects with filtering
   * OPTIMIZATION: Uses caching and repository
   */
  async getProjects(query: ProjectQuery, user: AuthUser) {
    const cacheKey = `projects:list:${JSON.stringify(query)}:${user.id}`;
    
    // Try cache first (only for non-search queries)
    if (!query.search) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }

    // Build WHERE conditions using repository
    const where = this.repository.buildWhereConditions({
      search: query.search,
      ownerId: query.ownerId,
    });

    // Fetch from repository
    const result = await this.repository.findMany({
      where,
      limit: Number(query.limit || '20'),
      offset: Number(query.offset || '0'),
      withRelations: true,
    });

    // Cache result for 1 hour (only non-search queries)
    if (!query.search) {
      await cache.set(cacheKey, result, 60*60);
    }

    return result;
  }

  /**
   * Get project by ID
   * OPTIMIZATION: Cached
   */
  async getProjectById(id: string) {
    const cacheKey = `project:${id}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey) as Project;
    if (cached) return cached;

    // Fetch from repository with relations
    const project = await this.repository.findOneByIdWithRelations(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Cache for 1 hour
    await cache.set(cacheKey, project, 60*60);

    return project;
  }

  /**
   * Create new project
   */
  async createProject(input: CreateProjectInput, ownerId: string) {
    const projectData: NewProject = {
      ...input,
      ownerId,
    };

    // Create via repository
    const newProject = await this.repository.create(projectData);

    // Invalidate list cache
    await cache.deletePattern('projects:list:*');

    // Return full project with relations
    return await this.getProjectById(newProject.id);
  }

  /**
   * Update project
   * Only owner, managers, and admins can update
   */
  async updateProject(id: string, input: UpdateProjectInput, user: AuthUser) {
    // Get existing project
    const existingProject = await this.getProjectById(id);

    // Check permissions
    const isOwner = existingProject.ownerId === user.id;
    const canUpdate = user.role === 'ADMIN' || user.role === 'MANAGER' || isOwner;

    if (!canUpdate) {
      throw new ForbiddenError('You can only update your own projects');
    }

    // Prepare update data
    const updateData = {
      ...input,
      updatedAt: new Date(),
    };

    // Update via repository
    await this.repository.update(id, updateData);

    // Invalidate caches
    await cache.delete(`project:${id}`);
    await cache.deletePattern('projects:list:*');

    // Return updated project
    return await this.getProjectById(id);
  }

  /**
   * Delete project
   * Only owner and admins can delete
   */
  async deleteProject(id: string, user: AuthUser) {
    // Get existing project
    const existingProject = await this.getProjectById(id);

    // Check permissions
    const isOwner = existingProject.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You can only delete your own projects');
    }

    // Delete via repository (cascade will delete related tasks)
    await this.repository.delete(id);

    // Invalidate caches
    await cache.delete(`project:${id}`);
    await cache.deletePattern('projects:list:*');
    // Also invalidate task caches since tasks are deleted
    await cache.deletePattern('tasks:list:*');
  }

  /**
   * Get project statistics
   * OPTIMIZATION: Uses repository aggregation and caching
   */
  async getProjectStats(projectId?: string) {
    const cacheKey = projectId ? `project:stats:${projectId}` : 'project:stats:all';
    
    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Get stats from repository
    const result = await this.repository.getStats(projectId);

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get user's projects with task counts
   */
  async getUserProjects(userId: string) {
    const cacheKey = `user:${userId}:projects`;
    
    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Get from repository
    const userProjects = await this.repository.findByOwnerIdWithTaskCounts(userId);

    // Add task statistics to each project
    const projectsWithStats = userProjects.map(project => ({
      ...project,
      taskCount: project.tasks.length,
      completedTasks: project.tasks.filter(t => t.status === 'done').length,
      inProgressTasks: project.tasks.filter(t => t.status === 'in_progress').length,
    }));

    // Cache for 30 minutes
    await cache.set(cacheKey, projectsWithStats, 1800);

    return projectsWithStats;
  }

  /**
   * Check if project exists
   */
  async projectExists(id: string): Promise<boolean> {
    return await this.repository.exists(id);
  }

  /**
   * Get projects by owner
   */
  async getProjectsByOwner(ownerId: string) {
    const cacheKey = `owner:${ownerId}:projects`;
    
    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Get from repository
    const projects = await this.repository.findByOwnerId(ownerId);

    // Cache for 30 minutes
    await cache.set(cacheKey, projects, 1800);

    return projects;
  }
}