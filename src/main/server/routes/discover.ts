import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { discoverLikes, discoverFollows, characters } from "../../db/schema";
import { eq } from "drizzle-orm";
import { mnemoFetch } from "../../lib/mnemo-api";
import {
  extractCharacterFromBuffer,
  parseCharacterJson,
} from "../../lib/png-parser";
import type { ContentTier } from "@shared/types";

function generateId(): string {
  return crypto.randomUUID();
}

interface ApiCharacter {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  file_url: string | null;
  file_type: string | null;
  is_nsfw: boolean;
  download_count: number;
  created_at: string;
  greeting: string | null;
  pov: string | null;
  uploader_id: string | null;
  // Auto-joined by the API on select=*
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  character_tags?: Array<{
    tag_id: string;
    tags: { name: string } | null;
  }>;
}

interface ApiProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
}

function extractTags(char: ApiCharacter): string[] {
  if (!char.character_tags) return [];
  return char.character_tags
    .map((ct) => ct.tags?.name)
    .filter((n): n is string => !!n);
}

function getCreatorName(row: ApiCharacter): string {
  return row.profiles?.username || row.profiles?.display_name || "anonymous";
}

function mapToDiscoverCard(
  row: ApiCharacter,
  tags: string[],
  isLiked: boolean
) {
  return {
    id: row.id,
    name: row.name,
    portraitUrl: row.image_url || "",
    tags,
    contentTier: (row.is_nsfw ? "nsfw" : "sfw") as ContentTier,
    creatorName: getCreatorName(row),
    creatorAvatarUrl: row.profiles?.avatar_url || "",
    descriptionPreview: (row.description || "").slice(0, 200),
    description: row.description || "",
    greeting: row.greeting || "",
    likeCount: 0,
    importCount: row.download_count || 0,
    lorebookEntryCount: 0,
    specVersion: "v2" as const,
    publishedAt: row.created_at,
    hasUpdate: false,
    fileUrl: row.file_url || undefined,
    fileType: row.file_type || undefined,
    isLiked,
    pov: row.pov || undefined,
  };
}

export async function discoverRoutes(app: FastifyInstance) {
  // List discover cards with search/sort/pagination
  app.get("/api/discover/cards", async (request) => {
    const query = request.query as Record<string, string | undefined>;
    const search = query.search || "";
    const sort = query.sort || "latest";
    const showNsfw = query.showNsfw === "true";
    const tag = query.tag || "";
    const page = parseInt(query.page || "0", 10);
    const pageSize = parseInt(query.pageSize || "20", 10);

    try {
      const params: Record<string, string> = {};

      if (!showNsfw) {
        params["is_nsfw"] = "eq.false";
      }

      // Sort & special filters
      if (sort === "trending") {
        params.order = "download_count.desc";
      } else if (sort === "gems") {
        params["download_count"] = "lte.500";
        params.order = "created_at.desc";
      } else if (sort === "following") {
        const follows = db.select().from(discoverFollows).all();
        if (follows.length === 0) {
          return { cards: [], hasMore: false };
        }
        // Look up profile IDs for followed usernames
        const uploaderIds: string[] = [];
        await Promise.all(
          follows.map(async (f) => {
            const { data: profiles } = await mnemoFetch<ApiProfile>(
              "/profiles",
              { username: `eq.${f.creatorName}`, select: "id" }
            );
            if (profiles.length > 0) uploaderIds.push(profiles[0].id);
          })
        );
        if (uploaderIds.length === 0) {
          return { cards: [], hasMore: false };
        }
        // Fetch characters for each followed uploader (profiles auto-joined)
        const allFollowedRows: ApiCharacter[] = [];
        await Promise.all(
          uploaderIds.map(async (uid) => {
            const { data } = await mnemoFetch<ApiCharacter>("/characters", {
              uploader_id: `eq.${uid}`,
              ...(showNsfw ? {} : { is_nsfw: "eq.false" }),
              order: "created_at.desc",
              limit: "50",
              offset: "0",
            });
            allFollowedRows.push(...data);
          })
        );
        allFollowedRows.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const followStart = page * pageSize;
        const followSlice = allFollowedRows.slice(
          followStart,
          followStart + pageSize + 1
        );
        const followHasMore = followSlice.length > pageSize;
        const followPage = followHasMore
          ? followSlice.slice(0, pageSize)
          : followSlice;

        const likedCardIds = new Set(
          db.select().from(discoverLikes).all().map((l) => l.cardId)
        );
        const cards = followPage.map((row) =>
          mapToDiscoverCard(row, extractTags(row), likedCardIds.has(row.id))
        );
        return { cards, hasMore: followHasMore };
      } else {
        params.order = "created_at.desc";
      }

      // For search, fetch a larger batch and filter client-side (API ilike is broken)
      if (search) {
        params.limit = "100";
        params.offset = "0";
      } else {
        params.limit = String(pageSize + 1);
        params.offset = String(page * pageSize);
      }

      const { data: rows } = await mnemoFetch<ApiCharacter>(
        "/characters",
        params
      );

      if (!rows || rows.length === 0) {
        return { cards: [], hasMore: false };
      }

      // Client-side search filter
      let filtered = rows;
      if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.name?.toLowerCase().includes(term) ||
            r.description?.toLowerCase().includes(term)
        );
        // Apply pagination to filtered results
        const start = page * pageSize;
        const end = start + pageSize + 1;
        filtered = filtered.slice(start, end);
      }

      const hasMore = filtered.length > pageSize;
      const pageRows = hasMore ? filtered.slice(0, pageSize) : filtered;

      // Tag filter (client-side)
      let finalRows = pageRows;
      if (tag) {
        const tagLower = tag.toLowerCase();
        finalRows = pageRows.filter((r) =>
          extractTags(r).some((t) => t.toLowerCase() === tagLower)
        );
      }

      // Local likes
      const likedCardIds = new Set(
        db
          .select()
          .from(discoverLikes)
          .all()
          .map((l) => l.cardId)
      );

      const cards = finalRows.map((row) =>
        mapToDiscoverCard(row, extractTags(row), likedCardIds.has(row.id))
      );

      return { cards, hasMore };
    } catch (err) {
      console.error("Discover fetch error:", err);
      return {
        cards: [],
        hasMore: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  });

  // Get single discover card with full details
  app.get<{ Params: { id: string } }>(
    "/api/discover/cards/:id",
    async (request, reply) => {
      const { id } = request.params;

      try {
        const { data: rows } = await mnemoFetch<ApiCharacter>("/characters", {
          id: `eq.${id}`,
          limit: "1",
        });

        if (!rows || rows.length === 0) {
          return reply.status(404).send({ error: "Character not found" });
        }

        const row = rows[0];
        const tags = extractTags(row);

        const liked = !!db
          .select()
          .from(discoverLikes)
          .where(eq(discoverLikes.cardId, id))
          .get();

        return mapToDiscoverCard(row, tags, liked);
      } catch (err) {
        console.error("Discover card fetch error:", err);
        return reply.status(500).send({ error: "Failed to fetch character" });
      }
    }
  );

  // Toggle like (local only)
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
        return { liked: false };
      } else {
        await db.insert(discoverLikes).values({ cardId: id });
        return { liked: true };
      }
    }
  );

  // Import card — download full character data from API
  app.post<{ Params: { id: string } }>(
    "/api/discover/cards/:id/import",
    async (request, reply) => {
      const { id } = request.params;

      try {
        const { data: rows } = await mnemoFetch<ApiCharacter>("/characters", {
          id: `eq.${id}`,
          limit: "1",
        });

        if (!rows || rows.length === 0) {
          return reply
            .status(404)
            .send({ error: "Character not found on server" });
        }

        const char = rows[0];
        const tags = extractTags(char);
        const creatorName = getCreatorName(char);

        const now = new Date().toISOString();
        const charId = generateId();

        // Try to download and parse the character file for full fields
        let parsedFields: Record<string, unknown> = {};
        if (char.file_url) {
          try {
            const fileRes = await fetch(char.file_url);
            if (fileRes.ok) {
              const contentType = fileRes.headers.get("content-type") || "";
              if (
                contentType.includes("image/png") ||
                char.file_type === "png" ||
                char.file_url.endsWith(".png")
              ) {
                const arrayBuf = await fileRes.arrayBuffer();
                const buf = Buffer.from(arrayBuf);
                const parsed = extractCharacterFromBuffer(buf);
                if (parsed) {
                  parsedFields = {
                    personality: parsed.personality,
                    scenario: parsed.scenario,
                    firstMessage: parsed.firstMessage,
                    alternateGreetings: JSON.stringify(
                      parsed.alternateGreetings
                    ),
                    systemPrompt: parsed.systemPrompt,
                    postHistoryInstructions: parsed.postHistoryInstructions,
                    exampleDialogues: JSON.stringify(parsed.exampleDialogues),
                    creatorNotes: parsed.creatorNotes,
                    characterVersion: parsed.characterVersion,
                  };
                  if (
                    parsed.description &&
                    parsed.description.length > (char.description || "").length
                  ) {
                    parsedFields.description = parsed.description;
                  }
                }
              } else if (
                contentType.includes("application/json") ||
                char.file_type === "json" ||
                char.file_url.endsWith(".json")
              ) {
                const jsonData = await fileRes.json();
                const parsed = parseCharacterJson(jsonData);
                parsedFields = {
                  personality: parsed.personality,
                  scenario: parsed.scenario,
                  firstMessage: parsed.firstMessage,
                  alternateGreetings: JSON.stringify(parsed.alternateGreetings),
                  systemPrompt: parsed.systemPrompt,
                  postHistoryInstructions: parsed.postHistoryInstructions,
                  exampleDialogues: JSON.stringify(parsed.exampleDialogues),
                  creatorNotes: parsed.creatorNotes,
                  characterVersion: parsed.characterVersion,
                };
                if (
                  parsed.description &&
                  parsed.description.length > (char.description || "").length
                ) {
                  parsedFields.description = parsed.description;
                }
              }
            }
          } catch (downloadErr) {
            console.error("Failed to download character file:", downloadErr);
          }
        }

        await db.insert(characters).values({
          id: charId,
          name: char.name,
          portraitUrl: char.image_url || "",
          description:
            (parsedFields.description as string) || char.description || "",
          personality: (parsedFields.personality as string) || null,
          scenario: (parsedFields.scenario as string) || null,
          firstMessage:
            (parsedFields.firstMessage as string) || char.greeting || null,
          alternateGreetings:
            (parsedFields.alternateGreetings as string) || "[]",
          systemPrompt: (parsedFields.systemPrompt as string) || null,
          postHistoryInstructions:
            (parsedFields.postHistoryInstructions as string) || null,
          exampleDialogues:
            (parsedFields.exampleDialogues as string) || "[]",
          creatorNotes: (parsedFields.creatorNotes as string) || null,
          tags: JSON.stringify(tags),
          contentTier: char.is_nsfw ? "nsfw" : "sfw",
          creatorName,
          characterVersion:
            (parsedFields.characterVersion as string) || null,
          specVersion: "v2",
          importDate: now,
          createdAt: now,
          source: "community",
          communityRefJson: JSON.stringify({
            cardId: char.id,
            creatorName,
            hasUpdate: false,
          }),
        });

        return {
          id: charId,
          name: char.name,
          tags,
          source: "community",
        };
      } catch (err) {
        console.error("Import error:", err);
        return reply
          .status(500)
          .send({
            error: err instanceof Error ? err.message : "Import failed",
          });
      }
    }
  );

  // Get creator profile
  app.get<{ Params: { username: string } }>(
    "/api/discover/creators/:username",
    async (request) => {
      const { username } = request.params;

      try {
        const { data: profiles } = await mnemoFetch<ApiProfile>("/profiles", {
          username: `eq.${username}`,
          select: "id,username,display_name,avatar_url,bio",
          limit: "1",
        });

        const profile = profiles.length > 0 ? profiles[0] : null;

        let publishedCardCount = 0;
        if (profile) {
          const { count } = await mnemoFetch<ApiCharacter>("/characters", {
            uploader_id: `eq.${profile.id}`,
            limit: "0",
          });
          publishedCardCount = count || 0;
        }

        const isFollowing = !!db
          .select()
          .from(discoverFollows)
          .where(eq(discoverFollows.creatorName, username))
          .get();

        return {
          username,
          bio: profile?.bio || "",
          avatarUrl: profile?.avatar_url || "",
          publishedCardCount,
          followerCount: 0,
          isFollowing,
        };
      } catch {
        const isFollowing = !!db
          .select()
          .from(discoverFollows)
          .where(eq(discoverFollows.creatorName, username))
          .get();

        return {
          username,
          bio: "",
          avatarUrl: "",
          publishedCardCount: 0,
          followerCount: 0,
          isFollowing,
        };
      }
    }
  );

  // Toggle follow creator (local only)
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
}
