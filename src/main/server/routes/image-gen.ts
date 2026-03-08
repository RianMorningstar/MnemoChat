import type { FastifyInstance } from "fastify";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { messages, characters, appSettings, generatedImages } from "../../db/schema";
import type { ImageGenProviderType, ImageGenRequest, ImageGenResult, ImageGenSettings } from "../../../shared/image-gen-types";
import { IMAGE_GEN_PROVIDER_INFO } from "../../../shared/image-gen-types";
import {
  callImageGenProvider,
  listImageGenModels as listModels,
  listImageGenSamplers,
  checkImageGenConnection as checkConnection,
} from "../lib/image-gen-providers";
import {
  getImageGenFilePath,
  saveGeneratedImage,
  deleteGeneratedImageFile,
  deleteAllGeneratedImages,
} from "../lib/image-gen-storage";

/** Read a setting from app_settings, returning null if not found */
function getSetting(key: string): string | null {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row?.value ?? null;
}

/** Resolve image gen config with cascade: request > character > global */
function resolveImageGenConfig(characterId: string | null, request: ImageGenRequest) {
  let provider: ImageGenProviderType | null = request.provider || null;
  let endpoint: string | null = request.endpoint || null;
  let apiKey: string | null = request.apiKey || null;
  let settings: ImageGenSettings = { ...(request.settings || {}) };

  // Character-level overrides
  if (characterId) {
    const char = db.select().from(characters).where(eq(characters.id, characterId)).get();
    if (char?.imageGenSettings) {
      try {
        const charSettings = JSON.parse(char.imageGenSettings) as ImageGenSettings;
        // Fill in settings not specified in the request
        settings = { ...charSettings, ...settings };
      } catch { /* ignore */ }
    }
  }

  // Global defaults for anything still missing
  if (!provider) {
    provider = (getSetting("image_gen_provider") as ImageGenProviderType) || null;
  }
  if (!endpoint) {
    endpoint = getSetting("image_gen_endpoint") || (provider ? IMAGE_GEN_PROVIDER_INFO[provider].defaultEndpoint : null);
  }
  if (!apiKey && provider) {
    apiKey = getSetting(`image_gen_api_key_${provider}`);
  }
  if (!settings.steps) {
    const v = getSetting("image_gen_default_steps");
    if (v) settings.steps = parseInt(v, 10);
  }
  if (!settings.cfgScale) {
    const v = getSetting("image_gen_default_cfg");
    if (v) settings.cfgScale = parseFloat(v);
  }
  if (!settings.width) {
    const v = getSetting("image_gen_default_width");
    if (v) settings.width = parseInt(v, 10);
  }
  if (!settings.height) {
    const v = getSetting("image_gen_default_height");
    if (v) settings.height = parseInt(v, 10);
  }
  if (!settings.negativePrompt) {
    settings.negativePrompt = getSetting("image_gen_default_negative_prompt") || undefined;
  }
  if (!settings.model) {
    const v = getSetting("image_gen_default_model");
    if (v) settings.model = v;
  }

  return { provider, endpoint, apiKey, settings };
}

/** Build the final prompt by prepending character's prompt prefix */
function buildPrompt(characterId: string | null, userPrompt: string): string {
  if (!characterId) return userPrompt;
  const char = db.select().from(characters).where(eq(characters.id, characterId)).get();
  if (char?.imageGenPromptPrefix) {
    return `${char.imageGenPromptPrefix}, ${userPrompt}`;
  }
  return userPrompt;
}

export async function imageGenRoutes(app: FastifyInstance) {
  // Generate an image
  app.post(
    "/api/image-gen/generate",
    async (request, reply) => {
      const body = request.body as ImageGenRequest;

      if (!body.prompt?.trim()) {
        return reply.status(400).send({ error: "No prompt provided" });
      }

      const characterId = body.characterId || "_global";
      const config = resolveImageGenConfig(body.characterId || null, body);

      if (!config.provider) {
        return reply.status(400).send({ error: "No image generation provider configured" });
      }

      const providerInfo = IMAGE_GEN_PROVIDER_INFO[config.provider];
      if (providerInfo.needsApiKey && !config.apiKey) {
        return reply.status(400).send({ error: `No API key configured for ${providerInfo.label}` });
      }

      // Build the final prompt with character prefix
      const finalPrompt = buildPrompt(body.characterId || null, body.prompt);
      const negativePrompt = body.negativePrompt || config.settings.negativePrompt || "";

      // Call the provider
      const result = await callImageGenProvider({
        provider: config.provider,
        prompt: finalPrompt,
        negativePrompt,
        settings: config.settings,
        apiKey: config.apiKey || undefined,
        endpoint: config.endpoint || undefined,
      });

      // Save to disk
      const imageId = crypto.randomUUID();
      const relativePath = saveGeneratedImage(characterId, imageId, result.buffer, result.ext);

      // Insert into generated_images table
      const now = new Date().toISOString();
      db.insert(generatedImages)
        .values({
          id: imageId,
          characterId: body.characterId || null,
          chatId: body.chatId || null,
          messageId: body.messageId || null,
          prompt: finalPrompt,
          negativePrompt,
          provider: config.provider,
          settings: JSON.stringify(config.settings),
          relativePath,
          width: result.width,
          height: result.height,
          seed: result.seed ?? null,
          createdAt: now,
        })
        .run();

      // If linked to a message, update it
      if (body.messageId) {
        db.update(messages)
          .set({ generatedImagePath: relativePath })
          .where(eq(messages.id, body.messageId))
          .run();
      }

      const imageResult: ImageGenResult = {
        id: imageId,
        imageUrl: `/api/image-gen/images/${imageId}`,
        prompt: finalPrompt,
        negativePrompt,
        provider: config.provider,
        settings: config.settings,
        characterId: body.characterId,
        chatId: body.chatId,
        messageId: body.messageId,
        width: result.width,
        height: result.height,
        seed: result.seed,
        createdAt: now,
      };

      return imageResult;
    }
  );

  // Serve a generated image
  app.get<{ Params: { imageId: string } }>(
    "/api/image-gen/images/:imageId",
    async (request, reply) => {
      const { imageId } = request.params;

      // Look up the image record to find the character directory
      const record = db.select().from(generatedImages).where(eq(generatedImages.id, imageId)).get();
      if (!record) {
        return reply.status(404).send({ error: "Image not found" });
      }

      const charDir = record.characterId || "_global";
      const filePath = getImageGenFilePath(charDir, imageId);
      if (!filePath || !fs.existsSync(filePath)) {
        return reply.status(404).send({ error: "Image file not found" });
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType =
        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
        ext === ".webp" ? "image/webp" :
        "image/png";

      const buffer = fs.readFileSync(filePath);
      return reply
        .header("Content-Type", contentType)
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .send(buffer);
    }
  );

  // List all generated images for a character
  app.get<{ Params: { characterId: string } }>(
    "/api/image-gen/gallery/:characterId",
    async (request) => {
      const { characterId } = request.params;
      const rows = db
        .select()
        .from(generatedImages)
        .where(eq(generatedImages.characterId, characterId))
        .all();
      return rows.map((r) => ({
        ...r,
        imageUrl: `/api/image-gen/images/${r.id}`,
        settings: JSON.parse(r.settings || "{}"),
      }));
    }
  );

  // List all generated images for a chat
  app.get<{ Params: { chatId: string } }>(
    "/api/image-gen/gallery/chat/:chatId",
    async (request) => {
      const { chatId } = request.params;
      const rows = db
        .select()
        .from(generatedImages)
        .where(eq(generatedImages.chatId, chatId))
        .all();
      return rows.map((r) => ({
        ...r,
        imageUrl: `/api/image-gen/images/${r.id}`,
        settings: JSON.parse(r.settings || "{}"),
      }));
    }
  );

  // List available models for a provider
  app.get<{ Params: { provider: string }; Querystring: { endpoint?: string; apiKey?: string } }>(
    "/api/image-gen/models/:provider",
    async (request) => {
      const provider = request.params.provider as ImageGenProviderType;
      const endpoint = request.query.endpoint || getSetting("image_gen_endpoint") || undefined;
      const apiKey = request.query.apiKey || getSetting(`image_gen_api_key_${provider}`) || undefined;
      const models = await listModels(provider, endpoint, apiKey);
      return { models };
    }
  );

  // List available samplers for a provider
  app.get<{ Params: { provider: string }; Querystring: { endpoint?: string } }>(
    "/api/image-gen/samplers/:provider",
    async (request) => {
      const provider = request.params.provider as ImageGenProviderType;
      const endpoint = request.query.endpoint || getSetting("image_gen_endpoint") || undefined;
      const samplers = await listImageGenSamplers(provider, endpoint);
      return { samplers };
    }
  );

  // Check provider connection
  app.get<{ Params: { provider: string }; Querystring: { endpoint?: string; apiKey?: string } }>(
    "/api/image-gen/check/:provider",
    async (request) => {
      const provider = request.params.provider as ImageGenProviderType;
      const endpoint = request.query.endpoint || getSetting("image_gen_endpoint") || IMAGE_GEN_PROVIDER_INFO[provider]?.defaultEndpoint || "";
      const apiKey = request.query.apiKey || getSetting(`image_gen_api_key_${provider}`) || undefined;
      const ok = await checkConnection(provider, endpoint, apiKey);
      return { ok };
    }
  );

  // Delete a specific generated image
  app.delete<{ Params: { imageId: string } }>(
    "/api/image-gen/images/:imageId",
    async (request) => {
      const { imageId } = request.params;
      const record = db.select().from(generatedImages).where(eq(generatedImages.id, imageId)).get();
      if (record) {
        const charDir = record.characterId || "_global";
        deleteGeneratedImageFile(charDir, imageId);
        db.delete(generatedImages).where(eq(generatedImages.id, imageId)).run();
        // Clear reference from message if linked
        if (record.messageId) {
          db.update(messages)
            .set({ generatedImagePath: null })
            .where(eq(messages.id, record.messageId))
            .run();
        }
      }
      return { ok: true };
    }
  );

  // Delete all generated images for a character
  app.delete<{ Params: { characterId: string } }>(
    "/api/image-gen/gallery/:characterId",
    async (request) => {
      const { characterId } = request.params;
      deleteAllGeneratedImages(characterId);
      db.delete(generatedImages).where(eq(generatedImages.characterId, characterId)).run();
      return { ok: true };
    }
  );
}
