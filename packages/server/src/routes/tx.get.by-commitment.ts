import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

/**
 * GET /api/v1/tx/by-commitment?commitment=0x...
 * Returns transaction signature for a given commitment (for TransferCompleted events)
 */
export default async function (app: FastifyInstance) {
  app.get("/api/v1/tx/by-commitment", { preHandler: app.auth }, async (req, rep) => {
    const query = z
      .object({
        commitment: z.string().regex(/^0x[0-9a-fA-F]+$/),
      })
      .parse(req.query);

    try {
      app.log.info({ 
        commitment: query.commitment, 
        commitmentLength: query.commitment.length,
        commitmentLower: query.commitment.toLowerCase(),
      }, "[tx/by-commitment] Querying for commitment");
      
      // First try to find the record (even without signature)
      const txAny = await prisma.tx.findUnique({
        where: { commitment: query.commitment },
        select: {
          signature: true,
          event: true,
          commitment: true,
          nullifier_hex: true,
          leaf_index: true,
        },
      });

      app.log.info({ 
        found: !!txAny, 
        hasSignature: !!txAny?.signature, 
        event: txAny?.event, 
        dbCommitment: txAny?.commitment,
        dbCommitmentLower: txAny?.commitment?.toLowerCase(),
        nullifier: txAny?.nullifier_hex,
        leafIndex: txAny?.leaf_index,
      }, "[tx/by-commitment] Query result");
      
      // If not found, try alternative lookup: find by checking all transfer transactions
      // with the same nullifier (since out1 and out2 share the same nullifier and signature)
      let tx = txAny;
      
      if (!tx) {
        // Try to find by looking up messages that might have this commitment
        // For transfers, we can find the nullifier from messages, then find tx by nullifier
        // But we don't have message ID here, so let's try a different approach:
        // Find all transfer transactions and check if any have a matching commitment (case-insensitive)
        const allTransferTxs = await prisma.tx.findMany({
          where: {
            event: "TransferCompleted",
            signature: { not: null },
          },
          orderBy: { timestamp: "desc" },
          take: 100, // Check recent 100 transfers
          select: {
            commitment: true,
            nullifier_hex: true,
            signature: true,
            event: true,
            timestamp: true,
            leaf_index: true,
          },
        });
        
        // Check for case-insensitive match
        const queryCommitmentLower = query.commitment.toLowerCase();
        const matchingTx = allTransferTxs.find(t => t.commitment.toLowerCase() === queryCommitmentLower);
        
        if (matchingTx) {
          app.log.warn({ 
            queryCommitment: query.commitment,
            foundCommitment: matchingTx.commitment,
            caseMismatch: query.commitment !== matchingTx.commitment,
          }, "[tx/by-commitment] Found commitment with case mismatch!");
          
          // Return the matching transaction
          tx = {
            signature: matchingTx.signature,
            event: matchingTx.event,
            commitment: matchingTx.commitment,
            nullifier_hex: matchingTx.nullifier_hex,
            leaf_index: matchingTx.leaf_index,
          };
        } else {
          // Show recent transfer transactions for debugging
          app.log.warn({ 
            queryCommitment: query.commitment,
            queryCommitmentLower: queryCommitmentLower,
            recentTransferCommitments: allTransferTxs.slice(0, 10).map(t => ({
              commitment: t.commitment,
              commitmentLower: t.commitment.toLowerCase(),
              nullifier: t.nullifier_hex,
              signature: t.signature?.slice(0, 20) + "...",
              leafIndex: t.leaf_index,
              timestamp: t.timestamp,
              matches: t.commitment.toLowerCase() === queryCommitmentLower,
            })),
          }, "[tx/by-commitment] Commitment not found. Recent transfer commitments for comparison");
        }
      }

      if (!tx || !tx.signature) {
        return rep.send({
          signature: null,
          event: tx?.event || null,
        });
      }

      return rep.send({
        signature: tx.signature,
        event: tx.event,
      });
    } catch (error: any) {
      app.log.error({ error, commitment: query.commitment }, "Failed to fetch tx by commitment");
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });
}
