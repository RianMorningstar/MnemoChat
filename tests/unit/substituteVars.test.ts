import { describe, it, expect } from "vitest";
import { substituteVars } from "../../src/main/server/lib/chat-utils";

describe("substituteVars", () => {
  it("replaces {{char}} with the character name", () => {
    expect(substituteVars("Hello, {{char}}!", "Alice", "Bob")).toBe(
      "Hello, Alice!"
    );
  });

  it("replaces {{user}} with the user name", () => {
    expect(substituteVars("Hi {{user}}.", "Alice", "Bob")).toBe("Hi Bob.");
  });

  it("replaces both placeholders in the same string", () => {
    expect(substituteVars("{{char}} greets {{user}}.", "Alice", "Bob")).toBe(
      "Alice greets Bob."
    );
  });

  it("is case-insensitive for {{CHAR}}", () => {
    expect(substituteVars("{{CHAR}} speaks.", "Alice", "Bob")).toBe(
      "Alice speaks."
    );
  });

  it("is case-insensitive for {{USER}}", () => {
    expect(substituteVars("{{USER}} asks.", "Alice", "Bob")).toBe("Bob asks.");
  });

  it("replaces all occurrences (not just the first)", () => {
    expect(
      substituteVars("{{char}} and {{char}} again.", "Alice", "Bob")
    ).toBe("Alice and Alice again.");
  });

  it("returns the string unchanged when no placeholders are present", () => {
    expect(substituteVars("No placeholders here.", "Alice", "Bob")).toBe(
      "No placeholders here."
    );
  });

  it("handles empty string", () => {
    expect(substituteVars("", "Alice", "Bob")).toBe("");
  });
});
