import { describe, it, expect } from "vitest";
import { buildSystemMessage } from "../../src/main/server/lib/chat-utils";

const base = {
  name: "Alice",
  systemPrompt: null,
  description: null,
  personality: null,
  scenario: null,
};

describe("buildSystemMessage", () => {
  it("uses a fallback when no fields are provided", () => {
    const result = buildSystemMessage(base);
    expect(result).toBe(
      "Write Alice's next reply in a fictional chat between Alice and {{user}}."
    );
  });

  it("includes description when provided", () => {
    const result = buildSystemMessage({ ...base, description: "A wizard" });
    expect(result).toContain("{{char}}'s description: A wizard");
  });

  it("includes personality when provided", () => {
    const result = buildSystemMessage({ ...base, personality: "Cheerful" });
    expect(result).toContain("{{char}}'s personality: Cheerful");
  });

  it("includes scenario when provided", () => {
    const result = buildSystemMessage({ ...base, scenario: "A tavern" });
    expect(result).toContain("Scenario: A tavern");
  });

  it("includes the preamble when any card field is present", () => {
    const result = buildSystemMessage({ ...base, description: "A mage" });
    expect(result).toContain(
      "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}."
    );
  });

  it("appends systemPrompt after the card fields", () => {
    const result = buildSystemMessage({
      ...base,
      description: "A mage",
      systemPrompt: "Always speak in riddles.",
    });
    const descIdx = result.indexOf("description");
    const sysIdx = result.indexOf("Always speak");
    expect(sysIdx).toBeGreaterThan(descIdx);
  });

  it("returns only systemPrompt when no card fields exist", () => {
    const result = buildSystemMessage({
      ...base,
      systemPrompt: "You are a pirate.",
    });
    expect(result).toBe("You are a pirate.");
  });

  it("contains {{char}} placeholder (substitution happens at call site)", () => {
    const result = buildSystemMessage({ ...base, description: "Bold hero" });
    expect(result).toContain("{{char}}");
  });
});
