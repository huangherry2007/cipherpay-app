import { FastifyInstance } from "fastify";
import { z } from "zod";
import fetch from "node-fetch";

const RELAYER_URL = process.env.RELAYER_URL || "http://localhost:4000";
const RELAYER_TOKEN = process.env.RELAYER_TOKEN || process.env.API_TOKEN || "";

export default async function (app: FastifyInstance) {
  app.get("/merkle-proof", async (req, rep) => {
    const q = z
      .object({
        index: z.coerce.number().int().nonnegative().optional(),
        commitment: z
          .string()
          .regex(/^0x[0-9a-fA-F]+$/)
          .optional(),
      })
      .parse(req.query);

    if (!RELAYER_URL)
      return rep.code(501).send({ error: "relayer_not_configured" });

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (RELAYER_TOKEN) {
        headers.authorization = `Bearer ${RELAYER_TOKEN}`;
      }

      // The relayer doesn't have a GET /merkle-proof endpoint
      // Instead, use POST /api/v1/prepare/withdraw which accepts spendCommitment
      // This endpoint returns the Merkle path for a commitment
      if (q.commitment) {
        const response = await fetch(`${RELAYER_URL}/api/v1/prepare/withdraw`, {
          method: "POST",
          headers,
          body: JSON.stringify({ spendCommitment: q.commitment }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          req.log.warn({ status: response.status, message: errorText }, "Relayer prepare/withdraw failed");
          return rep.status(response.status).send({
            error: "RelayerError",
            message: errorText || `Relayer returned ${response.status}`,
          });
        }

        const data = await response.json() as {
          pathElements?: string[];
          pathIndices?: number[];
          merkleRoot?: string;
          leafIndex?: number;
        };
        // Return in the format expected by the SDK/client
        return rep.send({
          pathElements: data.pathElements || [],
          pathIndices: data.pathIndices || [],
          merkleRoot: data.merkleRoot,
          leafIndex: data.leafIndex,
        });
      } else if (q.index !== undefined) {
        // For index-based lookup, we'd need a different endpoint
        // For now, return an error as this isn't supported via the prepare endpoints
        return rep.code(400).send({ error: "index_based_lookup_not_supported", message: "Please use commitment parameter instead" });
      } else {
        return rep.code(400).send({ error: "missing_parameter", message: "Either 'commitment' or 'index' must be provided" });
      }
    } catch (error: any) {
      req.log.error({ error: error.message, stack: error.stack }, "Failed to fetch Merkle proof from relayer");
      return rep.status(500).send({
        error: "InternalError",
        message: error.message || "Failed to fetch Merkle proof from relayer",
      });
    }
  });
}
