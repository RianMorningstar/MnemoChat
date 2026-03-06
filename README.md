# MnemoChat

A desktop app for local AI roleplay and collaborative storytelling. Built on top of Ollama (or any OpenAI-compatible backend), everything runs on your machine — no accounts, no cloud, no data leaving your device.

---

## What it does

MnemoChat is built around character cards — the same format used by tools like SillyTavern. You can import existing `.png` character cards, build your own from scratch, or browse the Discover feed to pull in characters from [mnemo.studio](https://mnemo.studio), our companion platform for sharing and discovering characters.

Once you have a character set up, you start a chat. The app handles prompt formatting, context management, token budgeting, and streaming responses. You can switch models mid-conversation, tweak generation settings, bookmark messages, and export logs when you're done.

There's also a story/projects section for organizing longer-form writing into scenes — useful if you're using the AI for actual fiction writing rather than just back-and-forth chat.

**Core features:**

- Character creation and import (supports `.png` card format with embedded metadata)
- Lorebook support per character (keyword-triggered world info injected into context)
- Streaming chat with SSE — responses appear token by token, with a stop button
- Multiple input modes: in-character reply, narration, or continue generation
- Scene direction sidebar — inject scene context at a configurable depth in the prompt
- Token budget display so you can see how full the context window is getting
- Generation presets — save and load sampler settings (temperature, top-p, etc.)
- Bookmarks with labels and color tags for marking important messages
- Chat export to `.txt`, `.md`, or `.json`
- Persona management — set how you appear to the character across chats
- Library with collections, sorting, and grid density options
- Discover feed (featured, trending, new, following, recommended tabs) backed by [mnemo.studio](https://mnemo.studio)
- Story projects with scene editor for structured long-form writing
- Dashboard with stats and recent activity at a glance
- Connection manager for multiple Ollama endpoints or OpenAI-compatible APIs

---

## Tech stack

- **Electron** — desktop shell
- **React 19 + React Router 7** — renderer
- **TypeScript** throughout
- **Fastify** — local HTTP server running in the main process, handles all data and LLM proxying
- **SQLite via better-sqlite3 + Drizzle ORM** — local database, auto-migrated on startup
- **Tailwind CSS v4** — styling
- **Vite** — renderer bundler

The app runs a local Fastify server on a random port inside the Electron main process. The renderer talks to it via `localhost` — this keeps the data layer cleanly separated and makes the API easy to test independently.

---

## Getting started

You'll need [Node.js](https://nodejs.org) (v18+) and [Ollama](https://ollama.com) installed and running with at least one model pulled.

```bash
git clone https://github.com/yourname/mnemochat.git
cd mnemochat
npm install
npm run dev
```

The app will open and walk you through connecting to your Ollama instance on first launch.

### Building a distributable

```bash
npm run package
```

Outputs to `release/` — NSIS installer on Windows, DMG on Mac, AppImage on Linux.

### Database

The database lives at the project root as `mnemochat.db`. Migrations are in `drizzle/` and run automatically when the app starts. If you want to run them manually:

```bash
npm run db:generate   # generate migration files from schema changes
npm run db:migrate    # apply migrations
```

---

## Project structure

```
src/
  main/           Electron main process + Fastify server + all route handlers
  renderer/       React app
    pages/        Top-level route components
    components/   Reusable UI pieces, organized by feature area
    lib/          API client, utilities
  shared/         Types shared between main and renderer
drizzle/          SQL migration files
```

---

## Notes

- Character `.png` import works by reading embedded JSON metadata from the PNG's tEXt chunk (standard card format). Drag a card onto the Library page to import it.
- The Discover feed pulls from [mnemo.studio](https://mnemo.studio). Sign in with your mnemo.studio API token (Settings → API token on the site) to unlock personalized recommendations, favorites sync, and the following feed. NSFW content is gated behind a toggle and requires being signed in.
- Generation presets are stored per-user in the database, not per-character — they're more like sampler profiles you switch between.
- The story/scene editor is still pretty early. The core structure works but it's missing some of the export polish I want to add.
