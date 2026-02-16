/**
 * POST /api/v1/users/lookup
 * Look up user by username - returns public key for transfers
 * Public endpoint (no auth required for looking up usernames)
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { validateUsername } from '../utils/username.js';

export default async function (app: FastifyInstance) {
  app.post('/api/v1/users/lookup', async (req, rep) => {
    const { username } = req.body as { username: string };

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid || !validation.normalized) {
      return rep.status(400).send({
        error: 'invalid_username',
        message: validation.error || 'Invalid username format',
      });
    }

    try {
      // Look up user by username
      const user = await prisma.users.findUnique({
        where: { username: validation.normalized },
        select: {
          id: true,
          username: true,
          owner_cipherpay_pub_key: true,
          note_enc_pub_key: true,
          avatar_url: true,
          created_at: true,
        },
      });

      if (!user) {
        return rep.status(404).send({
          error: 'user_not_found',
          message: `User @${validation.normalized} not found`,
        });
      }

      return rep.send({
        success: true,
        user: {
          username: user.username,
          ownerCipherPayPubKey: user.owner_cipherpay_pub_key,
          noteEncPubKey: user.note_enc_pub_key,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
        },
      });
    } catch (error: unknown) {
      app.log.error({ err: error }, "Error looking up user:");
      return rep.status(500).send({
        error: 'server_error',
        message: 'Failed to lookup user',
      });
    }
  });
}
