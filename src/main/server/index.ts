import Fastify from "fastify";
import { settingsRoutes } from "./routes/settings";
import { connectionRoutes } from "./routes/connections";
import { characterRoutes } from "./routes/characters";
import { lorebookRoutes } from "./routes/lorebook";
import { chatRoutes } from "./routes/chats";
import { messageRoutes } from "./routes/messages";
import { sceneDirectionRoutes } from "./routes/scene-directions";
import { presetRoutes } from "./routes/presets";
import { modelRoutes } from "./routes/models";
import { personaRoutes } from "./routes/personas";
import { collectionRoutes } from "./routes/collections";
import { libraryLorebookRoutes } from "./routes/library-lorebooks";
import { discoverRoutes } from "./routes/discover";
import { projectRoutes } from "./routes/projects";
import { sceneRoutes } from "./routes/scenes";
import { exportRoutes } from "./routes/export";

const server = Fastify();

export async function startServer(): Promise<number> {
  await server.register(settingsRoutes);
  await server.register(connectionRoutes);
  await server.register(characterRoutes);
  await server.register(lorebookRoutes);
  await server.register(chatRoutes);
  await server.register(messageRoutes);
  await server.register(sceneDirectionRoutes);
  await server.register(presetRoutes);
  await server.register(modelRoutes);
  await server.register(personaRoutes);
  await server.register(collectionRoutes);
  await server.register(libraryLorebookRoutes);
  await server.register(discoverRoutes);
  await server.register(projectRoutes);
  await server.register(sceneRoutes);
  await server.register(exportRoutes);

  const port = 3001;
  await server.listen({ port, host: "127.0.0.1" });
  console.log(`Fastify server listening on http://127.0.0.1:${port}`);
  return port;
}

export async function stopServer(): Promise<void> {
  await server.close();
}
