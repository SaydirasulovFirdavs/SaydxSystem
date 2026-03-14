import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function updateAdminPassword() {
  const username = "admin";
  const newPassword = "AlixonSAYDX";

  console.log(`[user_fix] Updating password for user: ${username}...`);

  try {
    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      console.error(`[user_fix] User '${username}' not found. Cannot update password.`);
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await db.update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date() 
      })
      .where(eq(users.username, username));

    console.log(`[user_fix] Password for '${username}' successfully updated to: ${newPassword}`);
  } catch (error) {
    console.error(`[user_fix] Failed to update password for '${username}':`, error);
  }
}
