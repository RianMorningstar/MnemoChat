import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import {
  discoverCards,
  discoverLikes,
  discoverFollows,
  characters,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

function generateId(): string {
  return crypto.randomUUID();
}

export async function discoverRoutes(app: FastifyInstance) {
  // List discover cards
  app.get("/api/discover/cards", async () => {
    const rows = db.select().from(discoverCards).all();
    const likedCardIds = new Set(
      db
        .select()
        .from(discoverLikes)
        .all()
        .map((l) => l.cardId)
    );

    return rows.map((row) => ({
      ...row,
      tags: JSON.parse(row.tags || "[]"),
      hasUpdate: row.hasUpdate === 1,
      isLiked: likedCardIds.has(row.id),
    }));
  });

  // Get single discover card
  app.get<{ Params: { id: string } }>(
    "/api/discover/cards/:id",
    async (request, reply) => {
      const { id } = request.params;
      const row = db
        .select()
        .from(discoverCards)
        .where(eq(discoverCards.id, id))
        .get();

      if (!row)
        return reply.status(404).send({ error: "Discover card not found" });

      const liked = db
        .select()
        .from(discoverLikes)
        .where(eq(discoverLikes.cardId, id))
        .get();

      return {
        ...row,
        tags: JSON.parse(row.tags || "[]"),
        hasUpdate: row.hasUpdate === 1,
        isLiked: !!liked,
      };
    }
  );

  // Toggle like
  app.post<{ Params: { id: string } }>(
    "/api/discover/cards/:id/like",
    async (request) => {
      const { id } = request.params;
      const existing = db
        .select()
        .from(discoverLikes)
        .where(eq(discoverLikes.cardId, id))
        .get();

      if (existing) {
        await db.delete(discoverLikes).where(eq(discoverLikes.cardId, id));
        await db
          .update(discoverCards)
          .set({ likeCount: sql`${discoverCards.likeCount} - 1` })
          .where(eq(discoverCards.id, id));
        return { liked: false };
      } else {
        await db.insert(discoverLikes).values({ cardId: id });
        await db
          .update(discoverCards)
          .set({ likeCount: sql`${discoverCards.likeCount} + 1` })
          .where(eq(discoverCards.id, id));
        return { liked: true };
      }
    }
  );

  // Import card to local library
  app.post<{ Params: { id: string } }>(
    "/api/discover/cards/:id/import",
    async (request, reply) => {
      const { id } = request.params;
      const card = db
        .select()
        .from(discoverCards)
        .where(eq(discoverCards.id, id))
        .get();

      if (!card)
        return reply.status(404).send({ error: "Discover card not found" });

      const now = new Date().toISOString();
      const charId = generateId();
      const tags = JSON.parse(card.tags || "[]");

      await db.insert(characters).values({
        id: charId,
        name: card.name,
        portraitUrl: card.portraitUrl,
        description: card.descriptionPreview,
        tags: card.tags,
        contentTier: card.contentTier,
        creatorName: card.creatorName,
        specVersion: card.specVersion,
        importDate: now,
        createdAt: now,
        source: "community",
        communityRefJson: JSON.stringify({
          cardId: card.id,
          creatorName: card.creatorName,
          hasUpdate: false,
        }),
      });

      // Increment import count
      await db
        .update(discoverCards)
        .set({ importCount: sql`${discoverCards.importCount} + 1` })
        .where(eq(discoverCards.id, id));

      return {
        id: charId,
        name: card.name,
        tags,
        source: "community",
      };
    }
  );

  // Get creator profile (computed from cards)
  app.get<{ Params: { username: string } }>(
    "/api/discover/creators/:username",
    async (request) => {
      const { username } = request.params;
      const cards = db
        .select()
        .from(discoverCards)
        .where(eq(discoverCards.creatorName, username))
        .all();

      const isFollowing = !!db
        .select()
        .from(discoverFollows)
        .where(eq(discoverFollows.creatorName, username))
        .get();

      return {
        username,
        bio: "",
        avatarUrl: cards[0]?.creatorAvatarUrl || "",
        publishedCardCount: cards.length,
        followerCount: 0,
        isFollowing,
      };
    }
  );

  // Toggle follow creator
  app.post<{ Params: { username: string } }>(
    "/api/discover/creators/:username/follow",
    async (request) => {
      const { username } = request.params;
      const existing = db
        .select()
        .from(discoverFollows)
        .where(eq(discoverFollows.creatorName, username))
        .get();

      if (existing) {
        await db
          .delete(discoverFollows)
          .where(eq(discoverFollows.creatorName, username));
        return { following: false };
      } else {
        await db.insert(discoverFollows).values({ creatorName: username });
        return { following: true };
      }
    }
  );

  // Seed discover data from sample-data.json
  app.post("/api/discover/seed", async () => {
    // Check if already seeded
    const existing = db.select().from(discoverCards).all();
    if (existing.length > 0) return { seeded: false, count: existing.length };

    try {
      const dataPath = join(
        process.cwd(),
        "product-plan/sections/library-and-gallery/sample-data.json"
      );
      const raw = readFileSync(dataPath, "utf-8");
      const data = JSON.parse(raw);

      for (const card of data.discoverCards) {
        await db.insert(discoverCards).values({
          id: card.id,
          name: card.name,
          portraitUrl: card.portraitUrl || "",
          tags: JSON.stringify(card.tags || []),
          contentTier: card.contentTier || "sfw",
          creatorName: card.creatorName,
          creatorAvatarUrl: card.creatorAvatarUrl || "",
          descriptionPreview: card.descriptionPreview || "",
          likeCount: card.likeCount || 0,
          importCount: card.importCount || 0,
          lorebookEntryCount: card.lorebookEntryCount || 0,
          specVersion: card.specVersion || "v2",
          publishedAt: card.publishedAt || new Date().toISOString(),
          hasUpdate: card.hasUpdate ? 1 : 0,
        });
      }

      return { seeded: true, count: data.discoverCards.length };
    } catch (err) {
      return { seeded: false, error: String(err) };
    }
  });
}
