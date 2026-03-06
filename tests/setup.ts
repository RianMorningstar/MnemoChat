import { vi } from "vitest";

// Prevent any code that imports 'electron' from crashing in the Node test environment.
vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: () => "/tmp/test-mnemochat",
  },
}));
