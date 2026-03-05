import "dotenv/config";
import { db } from "./server/db";
import { users, tasks } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    try {
        const usersList = await db.select().from(users).where(eq(users.username, "dasturchbackend"));
        const user = usersList[0];

        if (!user) {
            console.log("User 'dasturchbackend' not found");
            process.exit(0);
        }

        console.log(`User found: ${user.username} (ID: ${user.id})`);

        const assignedTasks = await db.select().from(tasks).where(eq(tasks.assigneeId, user.id));
        console.log(`Assigned Tasks (${assignedTasks.length}):`);
        assignedTasks.forEach(t => {
            console.log(`- ID: ${t.id}, Title: ${t.title}, Status: ${t.status}, ProjectID: ${t.projectId}`);
        });

    } catch (err) {
        console.error("Database query failed:", err);
    }
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
