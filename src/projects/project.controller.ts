/**
 * Projects Controller
 * Handles HTTP request/response logic for projects
 */

import type { Context } from "elysia";
import { authenticate } from "../middlewares/authentication";
import { ProjectsService } from "./project.service";
import { requirePermission } from "../middlewares/authorization";
import { createProjectSchema, projectQuerySchema, updateProjectSchema } from "./project.schema";


const projectsService = new ProjectsService();

export class ProjectsController {
  /**
   * Get all projects with filtering
   * GET /projects
   */
  async getProjects(ctx: Context) {
    const user = await authenticate(ctx);
    requirePermission('projects:read')(user);

    const validated = projectQuerySchema.parse(ctx.query);
    const projects = await projectsService.getProjects(validated, user);

    return {
      message: 'Projects retrieved successfully',
      data: projects,
    };
  }

  /**
   * Get project statistics
   * GET /projects/stats
   */
  async getProjectStats(ctx: Context) {
    const user = await authenticate(ctx);
    requirePermission('projects:read')(user);

    const { projectId } = ctx.query as { projectId?: string };
    const stats = await projectsService.getProjectStats(projectId);

    return {
      message: 'Project statistics retrieved successfully',
      data: stats,
    };
  }

  /**
   * Get user's projects
   * GET /projects/my
   */
  async getMyProjects(ctx: Context) {
    const user = await authenticate(ctx);

    const projects = await projectsService.getUserProjects(user.id);

    return {
      message: 'Your projects retrieved successfully',
      data: projects,
    };
  }

  /**
   * Get project by ID
   * GET /projects/:id
   */
  async getProjectById(ctx: Context) {
    const user = await authenticate(ctx);
    requirePermission('projects:read')(user);

    const { id } = ctx.params as { id: string };
    const project = await projectsService.getProjectById(id);

    return {
      message: 'Project retrieved successfully',
      data: project,
    };
  }

  /**
   * Create new project
   * POST /projects
   */
  async createProject(ctx: Context) {
    const user = await authenticate(ctx);
    requirePermission('projects:create')(user);

    const validated = createProjectSchema.parse(ctx.body);
    const project = await projectsService.createProject(validated, user.id);

    return {
      message: 'Project created successfully',
      data: project,
    };
  }

  /**
   * Update project
   * PATCH /projects/:id
   */
  async updateProject(ctx: Context) {
    const user = await authenticate(ctx);
    requirePermission('projects:update')(user);

    const { id } = ctx.params as { id: string };
    const validated = updateProjectSchema.parse(ctx.body);
    const project = await projectsService.updateProject(id, validated, user);

    return {
      message: 'Project updated successfully',
      data: project,
    };
  }

  /**
   * Delete project
   * DELETE /projects/:id
   */
  async deleteProject(ctx: Context) {
    const user = await authenticate(ctx);
    requirePermission('projects:delete')(user);

    const { id } = ctx.params as { id: string };
    await projectsService.deleteProject(id, user);

    return {
      message: 'Project deleted successfully',
    };
  }
}
