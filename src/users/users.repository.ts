import { db } from "../../config/db";
import { users } from "../../config/db/schema";
import { eq } from "drizzle-orm";

export const findByEmail = (email: string) =>
  db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .then((r) => r[0]);

export const findById = (id: string) =>
  db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .then((r) => r[0]);

export const createUser = (data: any) =>
  db.insert(users).values(data).returning();
