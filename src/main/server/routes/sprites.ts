import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { messages, chats, connectionProfiles } from "../../db/schema";
import type { ProviderType } from "../../../shared/types";
import {
  listSprites,
  getSpriteFilePath,
  saveSprite,
  deleteSprite,
  deleteAllSprites,
  extractZipSprites,
} from "../lib/sprite-storage";
import { classifyExpression } from "../lib/expression-classifier";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function spriteRoutes(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: MAX_FILE_SIZE } });

  // List all sprites for a character
  app.get<{ Params: { characterId: string } }>(
    "/api/sprites/:characterId",
    async (request) => {
      const { characterId } = request.params;
      return listSprites(characterId);
    }
  );

  // Serve a sprite image
  app.get<{ Params: { characterId: string; expression: string } }>(
    "/api/sprites/:characterId/:expression",
    async (request, reply) => {
      const { characterId, expression } = request.params;
      const filePath = getSpriteFilePath(characterId, expression);
      if (!filePath) {
        return reply.status(404).send({ error: "Sprite not found" });
      }
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const buffer = fs.readFileSync(filePath);
      return reply
        .header("Content-Type", contentType)
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .send(buffer);
    }
  );

  // Upload a single sprite
  app.post<{ Params: { characterId: string; expression: string } }>(
    "/api/sprites/:characterId/:expression",
    async (request, reply) => {
      const { characterId, expression } = request.params;
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "No file provided" });
      }
      const ext = MIME_TO_EXT[file.mimetype];
      if (!ext) {
        return reply.status(400).send({ error: "Unsupported image type. Use PNG, WebP, GIF, or JPEG." });
      }
      const buffer = await file.toBuffer();
      saveSprite(characterId, expression, buffer, ext);
      return { ok: true };
    }
  );

  // Upload ZIP of sprites
  app.post<{ Params: { characterId: string } }>(
    "/api/sprites/:characterId/bulk",
    async (request, reply) => {
      const { characterId } = request.params;
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "No file provided" });
      }
      const buffer = await file.toBuffer();
      const imported = extractZipSprites(characterId, buffer);
      return { imported };
    }
  );

  // Delete a single sprite
  app.delete<{ Params: { characterId: string; expression: string } }>(
    "/api/sprites/:characterId/:expression",
    async (request, reply) => {
      const { characterId, expression } = request.params;
      const deleted = deleteSprite(characterId, expression);
      if (!deleted) {
        return reply.status(404).send({ error: "Sprite not found" });
      }
      return { ok: true };
    }
  );

  // Delete all sprites for a character
  app.delete<{ Params: { characterId: string } }>(
    "/api/sprites/:characterId",
    async (request) => {
      const { characterId } = request.params;
      deleteAllSprites(characterId);
      return { ok: true };
    }
  );

  // Classify expression for a message
  app.post<{ Params: { chatId: string } }>(
    "/api/chats/:chatId/classify-expression",
    async (request, reply) => {
      const { chatId } = request.params;
      const body = request.body as { messageId: string; content: string };

      // Look up the message to get characterId
      const msg = db.select().from(messages).where(eq(messages.id, body.messageId)).get();
      if (!msg) {
        return reply.status(404).send({ error: "Message not found" });
      }

      // Get the character's available sprites
      const characterId = msg.characterId;
      if (!characterId) {
        return { expression: null };
      }

      const sprites = listSprites(characterId);
      if (sprites.length === 0) {
        return { expression: null };
      }

      const availableExpressions = sprites.map((s) => s.expression);

      // Load active connection for LLM call
      const connection = db
        .select()
        .from(connectionProfiles)
        .where(eq(connectionProfiles.isActive, 1))
        .get();
      if (!connection) {
        return { expression: null };
      }

      // Get chat's model
      const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
      if (!chat) {
        return reply.status(404).send({ error: "Chat not found" });
      }

      const expression = await classifyExpression(
        body.content,
        availableExpressions,
        connection.type as ProviderType,
        connection.endpoint,
        connection.apiKey,
        chat.modelId,
      );

      // Store expression on the message
      db.update(messages)
        .set({ expression })
        .where(eq(messages.id, body.messageId))
        .run();

      return { expression };
    }
  );
}
