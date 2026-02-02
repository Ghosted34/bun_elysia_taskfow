import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { users, type User } from "../../config/db/schema";

export class AuthRepo {
  async findOneById({
    id,
    select,
  }: {
    id: string;
    select?: (keyof typeof users)[];
  }) {
    return await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: select
        ? Object.fromEntries(select.map((f) => [f, true]))
        : undefined,
    });
  }

  async findOne({
    field,
    value,
    select,
  }: {
    field: keyof typeof users;
    value: string;
    select?: (keyof typeof users)[];
  }) {
    return await db.query.users.findFirst({
      where: eq(users[field] as any, value),
      columns: select
        ? Object.fromEntries(select.map((f) => [f, true]))
        : undefined,
    });
  }

  async create({
    data,
    select,
  }: {
    data: any;
    select?: (keyof typeof users)[];
  }) {
    const returning =
      select?.reduce(
        (acc, key) => {
          acc[key] = users[key];
          return acc;
        },
        {} as Record<string, any>,
      ) || {};

    return db.insert(users).values(data).returning(returning);
  }

  async update({
    id,
    data,
    select,
  }: {
    id: string;
    data: Partial<User>;
    select?: (keyof typeof users)[];
  }) {
    const returning =
      select?.reduce(
        (acc, key) => {
          acc[key] = users[key];
          return acc;
        },
        {} as Record<string, any>,
      ) || {};

    return db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning(returning);
  }
}
