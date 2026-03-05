/**
 * Re-exports from schema to avoid Vercel MODULE_NOT_FOUND.
 */
export {
  conversations,
  messages,
  insertConversationSchema,
  insertMessageSchema,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "../schema";
