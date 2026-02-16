import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

/**
 * GET /api/v1/messages/audit
 * Query audit receipts for the authenticated sender
 * 
 * Query params:
 *  - limit: number (default: 50, max: 100)
 *  - cursor: bigint (optional, message ID for pagination)
 * 
 * Returns:
 *  - Array of messages with ciphertext_audit (base64-encoded)
 *  - Only returns messages where sender_key matches authenticated user
 */
export default async function (app: FastifyInstance) {
  app.get("/api/v1/messages/audit", { preHandler: app.auth }, async (req, rep) => {
    try {
      // @ts-ignore
      const payload = req.user as { ownerKey: string };
      const authenticatedOwnerKey = payload.ownerKey;

      if (!authenticatedOwnerKey) {
        app.log.warn("[messages/audit] No authenticated owner key");
        return rep.status(401).send({ ok: false, error: "Unauthorized" });
      }

      const q = z
        .object({
          limit: z.coerce.number().min(1).max(100).default(50),
          cursor: z.coerce.bigint().optional(),
        })
        .parse(req.query);

      const whereClause: any = {
        sender_key: authenticatedOwnerKey,
        ciphertext_audit: { not: null }, // Only return messages with audit receipts
      };

      // Add cursor for pagination if provided
      if (q.cursor) {
        whereClause.id = { lt: q.cursor }; // Less than cursor ID (since we're ordering desc)
      }

      const rows = await prisma.messages.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
        take: q.limit,
        select: {
          id: true,
          recipient_key: true,
          kind: true,
          amount: true,
          tx_signature: true,
          created_at: true,
          ciphertext_audit: true, // Include audit receipt
        },
      });

      // Return ciphertext_audit as base64
      // Prisma returns Bytes fields as Buffer, so we can convert directly
      return rep.send(
        rows.map((r) => ({
          id: r.id.toString(),
          recipientKey: r.recipient_key,
          kind: r.kind,
          amount: r.amount,
          txSignature: r.tx_signature,
          createdAt: r.created_at,
          ciphertextAuditB64: r.ciphertext_audit 
            ? (Buffer.isBuffer(r.ciphertext_audit) 
                ? r.ciphertext_audit.toString("base64")
                : Buffer.from(r.ciphertext_audit).toString("base64"))
            : null,
        }))
      );
    } catch (error: any) {
      app.log.error({ error, stack: error?.stack }, "[messages/audit] Error fetching audit receipts");
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });
}
