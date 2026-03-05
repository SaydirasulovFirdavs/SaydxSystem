import "dotenv/config";
import { db } from "./server/db";
import { users, tasks } from "./shared/schema";
import { storage } from "./server/storage";
import { eq } from "drizzle-orm";
import fs from "fs";

async function main() {
    try {
        const user = (await db.select().from(users).where(eq(users.username, "dasturchbackend")))[0];
        if (!user) {
            console.log("User not found");
            return;
        }

        console.log(`Triggering logic for user: ${user.username} (${user.id})`);

        // Simulate the route logic
        try {
            const result = await storage.getTasksByAssignee(user.id);
            console.log("Success! Found tasks:", result.length);
        } catch (err) {
            console.error("Logic failed!");
            const errorMsg = `[TRIGGER SCRIPT] /api/tasks/my logic failed: ${err instanceof Error ? err.stack : String(err)}\n`;
            fs.appendFileSync("/tmp/api_error.log", errorMsg);
            console.error(err);
        }

    } catch (err) {
        console.error("Script failed:", err);
    }
    process.exit(0);
}

main();
