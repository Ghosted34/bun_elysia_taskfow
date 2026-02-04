/**
 * Database Seeder
 * Populate database with sample data for testing and development
 */

import { sql } from "drizzle-orm";
import { db } from "./index";
import { users, projects, tasks } from "./schema";

export async function hashPassword(password: string) {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

async function seed() {

console.log('Flushing DB...')
    // Order matters if you have FK constraints
  await db.execute(sql`TRUNCATE TABLE ${tasks} RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${projects} RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${users} RESTART IDENTITY CASCADE`);
  console.log("✅ Database flushed");

  console.log("🌱 Seeding database...");

  

  try {
    // Create users with different roles
    console.log("Creating users...");
    const hashedPassword = await hashPassword("password123");

    const [admin, manager, editor, viewer] = await db
      .insert(users)
      .values([
        {
          email: "admin@example.com",
          password: hashedPassword,
          full_name: "Admin User",
          role: "ADMIN",
        },
        {
          email: "manager@example.com",
          password: hashedPassword,
          full_name: "Manager User",
          role: "MANAGER",
        },
        {
          email: "editor@example.com",
          password: hashedPassword,
          full_name: "Editor User",
          role: "EDITOR",
        },
        {
          email: "viewer@example.com",
          password: hashedPassword,
          full_name: "Viewer User",
          role: "VIEWER",
        },
      ])
      .returning();

    console.log("✅ Users created");

    // Create projects
    console.log("Creating projects...");
    const [project1, project2, project3] = await db
      .insert(projects)
      .values([
        {
          name: "Website Redesign",
          description: "Complete redesign of company website",
          ownerId: admin.id,
        },
        {
          name: "Mobile App Development",
          description: "Build iOS and Android apps",
          ownerId: manager.id,
        },
        {
          name: "API Documentation",
          description: "Document all REST API endpoints",
          ownerId: editor.id,
        },
      ])
      .returning();

    console.log("✅ Projects created");

    // Create tasks
    console.log("Creating tasks...");
    await db.insert(tasks).values([
      // Website Redesign tasks
      {
        title: "Design homepage mockup",
        description: "Create Figma mockup for new homepage",
        status: "done",
        priority: "high",
        projectId: project1.id,
        assigneeId: editor.id,
        creatorId: admin.id,
        completedAt: new Date("2024-01-15"),
      },
      {
        title: "Implement responsive navigation",
        description: "Build mobile-friendly navigation menu",
        status: "in_progress",
        priority: "high",
        projectId: project1.id,
        assigneeId: editor.id,
        creatorId: admin.id,
        dueDate: new Date("2024-02-01"),
      },
      {
        title: "Optimize images for web",
        description: "Compress and convert images to WebP",
        status: "todo",
        priority: "medium",
        projectId: project1.id,
        assigneeId: editor.id,
        creatorId: admin.id,
        dueDate: new Date("2024-02-05"),
      },

      // Mobile App tasks
      {
        title: "Set up React Native project",
        description: "Initialize RN project with TypeScript",
        status: "done",
        priority: "urgent",
        projectId: project2.id,
        assigneeId: manager.id,
        creatorId: manager.id,
        completedAt: new Date("2024-01-10"),
      },
      {
        title: "Implement authentication flow",
        description: "Add login/signup screens and JWT handling",
        status: "in_progress",
        priority: "urgent",
        projectId: project2.id,
        assigneeId: editor.id,
        creatorId: manager.id,
        dueDate: new Date("2024-01-28"),
      },
      {
        title: "Design app icons",
        description: "Create app icons for iOS and Android",
        status: "todo",
        priority: "low",
        projectId: project2.id,
        assigneeId: editor.id,
        creatorId: manager.id,
        dueDate: new Date("2024-02-15"),
      },

      // API Documentation tasks
      {
        title: "Document authentication endpoints",
        description: "Write OpenAPI specs for /auth routes",
        status: "in_progress",
        priority: "medium",
        projectId: project3.id,
        assigneeId: editor.id,
        creatorId: editor.id,
        dueDate: new Date("2024-02-01"),
      },
      {
        title: "Add example requests",
        description: "Provide cURL examples for all endpoints",
        status: "todo",
        priority: "low",
        projectId: project3.id,
        assigneeId: editor.id,
        creatorId: editor.id,
      },

      // Unassigned tasks
      {
        title: "Code review checklist",
        description: "Create standardized code review guidelines",
        status: "todo",
        priority: "medium",
        creatorId: admin.id,
      },
      {
        title: "Update dependencies",
        description: "Update npm packages to latest versions",
        status: "todo",
        priority: "low",
        creatorId: manager.id,
      },
    ]);

    console.log("✅ Tasks created");
    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📧 Sample login credentials:");
    console.log("Admin:   admin@example.com / password123");
    console.log("Manager: manager@example.com / password123");
    console.log("Editor:  editor@example.com / password123");
    console.log("Viewer:  viewer@example.com / password123");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seed();
