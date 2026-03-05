import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../lib.js";

/**
 * GET /api/tasks/my
 * (Serverless version for compatibility)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        // NOTE: In Vercel environments, we might need a different way to get the user
        // but for now, we'll try to emulate the server/routes.ts behavior if possible.
        // However, if we don't have session/auth middleware here, we might need to rely on headers

        // For now, let's just return an error if we can't identify the user
        // This is just a safeguard. Real auth happens in server/routes.ts
        // but if this is hit, we want it to be handled nicely.

        // @ts-ignore
        const user = (req as any).user;
        if (!user?.id) {
            return res.status(401).json({ message: "Siz tizimga kirmagansiz" });
        }

        const tasks = await storage.getTasksByAssignee(user.id);
        return res.json(tasks);
    } catch (err) {
        console.error("[api/tasks/my]", err);
        return res.status(500).json({ message: "Vazifalarni yuklashda xato" });
    }
}
