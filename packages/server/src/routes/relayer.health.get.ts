import { FastifyInstance } from "fastify";

const RELAYER_URL = process.env.RELAYER_URL || "http://localhost:4000";
const RELAYER_TOKEN = process.env.RELAYER_TOKEN || process.env.API_TOKEN || "";

export default async function (app: FastifyInstance) {
  app.get("/api/relayer/health", async (req, rep) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (RELAYER_TOKEN) {
        headers.authorization = `Bearer ${RELAYER_TOKEN}`;
      }

      const response = await fetch(`${RELAYER_URL}/health`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const text = await response.text();
        return rep.status(response.status).send({
          status: "unhealthy",
          message: text || "Relayer health check failed",
        });
      }

      const data = await response.json();
      return rep.send(data);
    } catch (error: any) {
      app.log.error(error);
      return rep.status(503).send({
        status: "unreachable",
        message: error?.message || "Failed to connect to relayer",
      });
    }
  });
}

