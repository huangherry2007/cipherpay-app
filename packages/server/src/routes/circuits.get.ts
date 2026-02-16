import { FastifyInstance } from "fastify";

/**
 * Supported ZK circuits (aligned with relayer proof-verifier and UI circuitConfig).
 * GET /api/v1/circuits - returns list of circuit names for status/discovery (e.g. SolanaStatus "Supported Circuits").
 */
const SUPPORTED_CIRCUITS = [
  { name: "Deposit" },
  { name: "Transfer" },
  { name: "Withdraw" },
];

export default async function (app: FastifyInstance) {
  app.get("/api/v1/circuits", async (_req, rep) => {
    return rep.send({
      success: true,
      circuits: SUPPORTED_CIRCUITS,
    });
  });
}
