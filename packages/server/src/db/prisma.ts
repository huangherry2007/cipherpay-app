import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? "mysql://cipherpay:cipherpay@127.0.0.1:3307/cipherpay_server",
    },
  },
});
