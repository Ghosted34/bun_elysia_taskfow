import { type Context } from "elysia";
import { ProjectsService } from "./project.service";
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
} from "./project.schema";

const projectsService = new ProjectsService();

export class ProjectsController {
  /**
   * Get all projects with filtering
   * GET /projects
   */
  async getProjects(ctx: Context) {
    const validated = projectQuerySchema.parse(ctx.query);
    const projects = await projectsService.getProjects(validated, ctx.user);

    return {
      message: "Projects retrieved successfully",
      data: projects,
    };
  }

  /**
   * Get project statistics
   * GET /projects/stats
   */
  async getProjectStats(ctx: Context) {
    const { projectId } = ctx.query as { projectId?: string };
    const stats = await projectsService.getProjectStats(projectId);

    return {
      message: "Project statistics retrieved successfully",
      data: stats,
    };
  }

  /**
   * Get user's projects
   * GET /projects/my
   */
  async getMyProjects(ctx: Context) {
    const projects = await projectsService.getUserProjects(ctx.user.id);

    return {
      message: "Your projects retrieved successfully",
      data: projects,
    };
  }

  /**
   * Get project by ID
   * GET /projects/:id
   */
  async getProjectById(ctx: Context) {
    const { id } = ctx.params as { id: string };
    const project = await projectsService.getProjectById(id);

    return {
      message: "Project retrieved successfully",
      data: project,
    };
  }

  /**
   * Create new project
   * POST /projects
   */
  async createProject(ctx: Context) {
    const validated = createProjectSchema.parse(ctx.body);
    const project = await projectsService.createProject(validated, ctx.user.id);

    return {
      message: "Project created successfully",
      data: project,
    };
  }

  /**
   * Update project
   * PATCH /projects/:id
   */
  async updateProject(ctx: Context) {
    const { id } = ctx.params as { id: string };
    const validated = updateProjectSchema.parse(ctx.body);
    const project = await projectsService.updateProject(
      id,
      validated,
      ctx.user,
    );

    return {
      message: "Project updated successfully",
      data: project,
    };
  }

  /**
   * Delete project
   * DELETE /projects/:id
   */
  async deleteProject(ctx: Context) {
    const { id } = ctx.params as { id: string };
    await projectsService.deleteProject(id, ctx.user);

    return {
      message: "Project deleted successfully",
    };
  }
}
