import "dotenv/config";
import pg from "pg";

async function check() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000,
    });
    await client.connect();
    const res = await client.query("SELECT id, username, email, role FROM users");
    console.log("Users:", JSON.stringify(res.rows, null, 2));
    await client.end();
}

check().catch(console.error);
