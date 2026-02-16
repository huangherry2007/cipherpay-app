import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

/**
 * GET /api/v1/tx/by-merkle-root?merkleRoot=0x...
 * Returns transaction signature(s) for a given merkle root
 * Returns the most recent transaction that has this merkle root
 */
export default async function (app: FastifyInstance) {
  app.get("/api/v1/tx/by-merkle-root", { preHandler: app.auth }, async (req, rep) => {
    const query = z
      .object({
        merkleRoot: z.string().regex(/^0x[0-9a-fA-F]+$/),
      })
      .parse(req.query);

    try {
      app.log.info({ 
        merkleRoot: query.merkleRoot, 
        merkleRootLength: query.merkleRoot.length,
        merkleRootLower: query.merkleRoot.toLowerCase(),
      }, "[tx/by-merkle-root] Querying for merkle root");
      
      // First check if any records exist with this merkle root (even without signature)
      const txAny = await prisma.tx.findFirst({
        where: {
          merkle_root: query.merkleRoot,
        },
        orderBy: { timestamp: "desc" },
        select: {
          signature: true,
          event: true,
          timestamp: true,
          merkle_root: true,
          commitment: true,
          leaf_index: true,
        },
      });

      app.log.info({ 
        found: !!txAny, 
        hasSignature: !!txAny?.signature, 
        event: txAny?.event, 
        dbMerkleRoot: txAny?.merkle_root,
        dbMerkleRootLower: txAny?.merkle_root?.toLowerCase(),
        commitment: txAny?.commitment,
        leafIndex: txAny?.leaf_index,
      }, "[tx/by-merkle-root] Query result (any)");
      
      // Now find the most recent transaction with this merkle root AND a signature
      const tx = await prisma.tx.findFirst({
        where: {
          merkle_root: query.merkleRoot,
          signature: { not: null },
        },
        orderBy: { timestamp: "desc" },
        select: {
          signature: true,
          event: true,
          timestamp: true,
          merkle_root: true,
          commitment: true,
        },
      });

      app.log.info({ 
        found: !!tx, 
        hasSignature: !!tx?.signature, 
        event: tx?.event, 
        dbMerkleRoot: tx?.merkle_root,
        commitment: tx?.commitment,
      }, "[tx/by-merkle-root] Query result (with signature)");
      
      // If not found, show recent transactions with different merkle roots for debugging
      if (!tx) {
        const recentTxs = await prisma.tx.findMany({
          where: {
            signature: { not: null },
          },
          orderBy: { timestamp: "desc" },
          take: 10,
          select: {
            merkle_root: true,
            commitment: true,
            event: true,
            signature: true,
            timestamp: true,
            leaf_index: true,
          },
        });
        
        app.log.warn({ 
          queryMerkleRoot: query.merkleRoot,
          queryMerkleRootLower: query.merkleRoot.toLowerCase(),
          recentMerkleRoots: recentTxs.map(t => ({
            merkleRoot: t.merkle_root,
            merkleRootLower: t.merkle_root.toLowerCase(),
            commitment: t.commitment,
            event: t.event,
            signature: t.signature?.slice(0, 20) + "...",
            leafIndex: t.leaf_index,
            timestamp: t.timestamp,
            matches: t.merkle_root.toLowerCase() === query.merkleRoot.toLowerCase(),
          })),
        }, "[tx/by-merkle-root] Merkle root not found. Recent merkle roots for comparison");
      }

      if (!tx || !tx.signature) {
        return rep.send({
          signature: null,
          event: null,
        });
      }

      return rep.send({
        signature: tx.signature,
        event: tx.event,
        timestamp: tx.timestamp.toISOString(),
      });
    } catch (error: any) {
      app.log.error({ error, merkleRoot: query.merkleRoot }, "Failed to fetch tx by merkle root");
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });
}
