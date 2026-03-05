import { db } from "../db";
import { users } from "@shared/schema";

async function main() {
    const allUsers = await db.select().from(users);
    console.log("All Users:", allUsers.map(u => ({ username: u.username, role: u.role, companyRole: u.companyRole })));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
