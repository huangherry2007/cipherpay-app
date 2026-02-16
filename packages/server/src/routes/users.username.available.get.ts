/**
 * GET /api/v1/users/username/available?username=alice
 * Check if username is available
 * Public endpoint (no auth required)
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { validateUsername, isUsernameAvailable, suggestUsernames } from '../utils/username.js';

export default async function (app: FastifyInstance) {
  app.get('/api/v1/users/username/available', async (req, rep) => {
    const { username } = req.query as { username: string };

    if (!username) {
      return rep.status(400).send({
        error: 'missing_username',
        message: 'Username parameter is required',
      });
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid || !validation.normalized) {
      return rep.send({
        available: false,
        valid: false,
        error: validation.error,
      });
    }

    try {
      // Check if username is available
      const available = await isUsernameAvailable(prisma, username);

      // If not available, suggest alternatives
      let suggestions: string[] = [];
      if (!available) {
        suggestions = await suggestUsernames(prisma, username, 3);
      }

      return rep.send({
        available,
        valid: true,
        username: validation.normalized,
        ...(suggestions.length > 0 && { suggestions }),
      });
    } catch (error: unknown) {
      app.log.error({ err: error }, "Error checking username availability:");
      return rep.status(500).send({
        error: 'server_error',
        message: 'Failed to check username availability',
      });
    }
  });
}
