import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDatabase = globalThis as typeof globalThis & {
  docflowDb?: PrismaClient;
};
export const db =
  globalDatabase.docflowDb ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 4000,
      max: 8,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDatabase.docflowDb = db;
