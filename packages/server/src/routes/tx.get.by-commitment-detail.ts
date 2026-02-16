import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

/**
 * GET /api/v1/tx/by-commitment-detail?commitment=0x...
 * Returns full transaction details including merkle_root for a given commitment
 * Used by zkaudit-ui to get the historical merkle root for audit proof generation
 */
export default async function (app: FastifyInstance) {
  app.get("/api/v1/tx/by-commitment-detail", { preHandler: app.auth }, async (req, rep) => {
    // Validate query parameters
    let query;
    try {
      query = z
        .object({
          commitment: z.string().regex(/^0x[0-9a-fA-F]+$/),
        })
        .parse(req.query);
    } catch (validationError: any) {
      app.log.warn({ error: validationError, query: req.query }, "[tx/by-commitment-detail] Invalid query parameters");
      return rep.status(400).send({
        ok: false,
        error: "BadRequest",
        message: "Invalid commitment format. Expected hex string starting with 0x",
      });
    }

    try {
      app.log.info({ 
        commitment: query.commitment, 
      }, "[tx/by-commitment-detail] Querying for commitment details");
      
      const tx = await prisma.tx.findUnique({
        where: { commitment: query.commitment },
        select: {
          id: true,
          commitment: true,
          merkle_root: true,
          leaf_index: true,
          signature: true,
          event: true,
          nullifier_hex: true,
          timestamp: true,
        },
      });

      if (!tx) {
        app.log.warn({ 
          commitment: query.commitment,
        }, "[tx/by-commitment-detail] Transaction not found");
        
        return rep.status(404).send({
          ok: false,
          error: "NotFound",
          message: "Transaction not found for this commitment",
        });
      }

      app.log.info({ 
        commitment: tx.commitment,
        merkleRoot: tx.merkle_root,
        event: tx.event,
        leafIndex: tx.leaf_index,
      }, "[tx/by-commitment-detail] Returning transaction details");

      return rep.send({
        id: tx.id.toString(), // Convert BigInt to string for JSON serialization
        commitment: tx.commitment,
        merkleRoot: tx.merkle_root, // camelCase for frontend
        merkle_root: tx.merkle_root, // snake_case for compatibility
        leafIndex: tx.leaf_index,
        leaf_index: tx.leaf_index,
        signature: tx.signature,
        event: tx.event,
        nullifierHex: tx.nullifier_hex,
        nullifier_hex: tx.nullifier_hex,
        timestamp: tx.timestamp.toISOString(),
      });
    } catch (error: any) {
      app.log.error({ 
        error: {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          code: error?.code,
        }, 
        commitment: query.commitment 
      }, "[tx/by-commitment-detail] Failed to fetch tx details");
      
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });
}
