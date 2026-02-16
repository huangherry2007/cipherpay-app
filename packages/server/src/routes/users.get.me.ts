import { FastifyInstance } from "fastify";
import { getUserWsolAta, getUserSolanaWallet, getAllUserAtas } from "../services/userAta.js";
import { prisma } from "../db/prisma.js";

export default async function (app: FastifyInstance) {
  app.get("/users/me", { preHandler: app.auth }, async (req, rep) => {
    // @ts-ignore
    const payload = req.user as { sub: string; ownerKey: string };
    
    // Get user profile from database
    const user = await prisma.users.findUnique({
      where: { owner_cipherpay_pub_key: payload.ownerKey },
      select: {
        id: true,
        username: true,
        avatar_url: true,
        note_enc_pub_key: true,
        solana_wallet_address: true,
        created_at: true,
      },
    });

    if (!user) {
      return rep.status(404).send({ error: "user_not_found" });
    }
    
    // Get stored ATAs
    const allAtas = await getAllUserAtas(payload.ownerKey);
    const wsolAta = await getUserWsolAta(payload.ownerKey); // For backward compatibility
    
    return rep.send({ 
      id: user.id.toString(),
      ownerKey: payload.ownerKey,
      username: user.username,
      avatarUrl: user.avatar_url,
      noteEncPubKey: user.note_enc_pub_key,
      solanaWalletAddress: user.solana_wallet_address,
      wsolAta: wsolAta, // Backward compatibility
      atas: allAtas, // All ATAs: { "So111...": "ATA_ADDRESS", ... }
      createdAt: user.created_at,
    });
  });
}
