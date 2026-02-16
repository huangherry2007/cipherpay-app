import { FastifyInstance } from "fastify";

const RELAYER_URL = process.env.RELAYER_URL || "http://localhost:4000";
const RELAYER_TOKEN = process.env.RELAYER_TOKEN || process.env.API_TOKEN || "";

export default async function (app: FastifyInstance) {
  app.get("/api/v1/merkle/root", async (req, rep) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (RELAYER_TOKEN) {
        headers.authorization = `Bearer ${RELAYER_TOKEN}`;
      }

      // Call relayer's direct merkle root endpoint
      // This endpoint reads directly from the database without requiring a commitment
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${RELAYER_URL}/api/v1/relayer/merkle/root`, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const text = await response.text();
          req.log.warn({ status: response.status, message: text }, "Relayer merkle root endpoint failed");
          return rep.status(response.status).send({
            success: false,
            error: "RelayerError",
            message: text || `Relayer returned ${response.status}`,
          });
        }
        
        const data = await response.json();
        
        // The relayer returns root as BE hex string
        return rep.send({
          success: true,
          root: data.root, // BE hex string
          nextLeafIndex: data.nextLeafIndex,
        });
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          return rep.status(504).send({
            success: false,
            error: "Relayer timeout",
            message: "Relayer did not respond in time",
          });
        }
        throw fetchError;
      }
    } catch (error: any) {
      req.log.error({ error: error.message, stack: error.stack }, "Failed to get merkle root from relayer");
      return rep.status(500).send({
        success: false,
        error: "InternalError",
        message: error?.message || "Failed to fetch merkle root from relayer",
      });
    }
  });
}
