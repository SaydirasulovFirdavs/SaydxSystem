import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createOrUpdateLocalUser(username: string, passwordHash: string, firstName?: string, lastName?: string): Promise<User>;
  getEmployees(): Promise<User[]>;
  createEmployee(username: string, passwordHash: string, firstName?: string, lastName?: string, companyRole?: string): Promise<User>;
  updateEmployee(id: string, updates: Partial<User>): Promise<User>;
  deleteEmployee(id: string): Promise<void>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createOrUpdateLocalUser(username: string, passwordHash: string, firstName = "Admin", lastName = "User"): Promise<User> {
    const existing = await this.getUserByUsername(username);
    const id = existing?.id ?? crypto.randomUUID();
    const [user] = await db
      .insert(users)
      .values({ id, username, passwordHash, firstName, lastName, email: `${username}@local` })
      .onConflictDoUpdate({
        target: users.username,
        set: { passwordHash, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async getEmployees(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "employee"));
  }

  async createEmployee(username: string, passwordHash: string, firstName = "Employee", lastName = "User", companyRole = ""): Promise<User> {
    const existing = await this.getUserByUsername(username);
    if (existing) throw new Error("Bu username band");

    const id = crypto.randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        id,
        username,
        passwordHash,
        firstName,
        lastName,
        companyRole,
        email: `${username}@local`,
        role: "employee"
      })
      .returning();
    return user;
  }

  async updateEmployee(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
