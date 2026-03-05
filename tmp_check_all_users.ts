import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";

async function check() {
    try {
        const allUsers = await db.select().from(users);
        console.log("All Users:", JSON.stringify(allUsers, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

check();
