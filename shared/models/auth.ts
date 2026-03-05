/**
 * Re-exports from schema to avoid Vercel MODULE_NOT_FOUND.
 * @shared/models/auth is used by use-auth.ts and replit_integrations/auth.
 */
export { users, sessions, type User, type UpsertUser } from "../schema";
