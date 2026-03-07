import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { substituteVars, formatDuration } from "../../src/main/server/lib/chat-utils";

const baseCtx = { charName: "Alice", userName: "Bob" };

describe("substituteVars", () => {
  // --- Existing macros (updated to new signature) ---

  it("replaces {{char}} with the character name", () => {
    expect(substituteVars("Hello, {{char}}!", baseCtx)).toBe("Hello, Alice!");
  });

  it("replaces {{user}} with the user name", () => {
    expect(substituteVars("Hi {{user}}.", baseCtx)).toBe("Hi Bob.");
  });

  it("replaces both placeholders in the same string", () => {
    expect(substituteVars("{{char}} greets {{user}}.", baseCtx)).toBe(
      "Alice greets Bob."
    );
  });

  it("is case-insensitive for {{CHAR}}", () => {
    expect(substituteVars("{{CHAR}} speaks.", baseCtx)).toBe("Alice speaks.");
  });

  it("is case-insensitive for {{USER}}", () => {
    expect(substituteVars("{{USER}} asks.", baseCtx)).toBe("Bob asks.");
  });

  it("replaces all occurrences (not just the first)", () => {
    expect(
      substituteVars("{{char}} and {{char}} again.", baseCtx)
    ).toBe("Alice and Alice again.");
  });

  it("returns the string unchanged when no placeholders are present", () => {
    expect(substituteVars("No placeholders here.", baseCtx)).toBe(
      "No placeholders here."
    );
  });

  it("handles empty string", () => {
    expect(substituteVars("", baseCtx)).toBe("");
  });

  // --- New simple macros ---

  it("replaces {{persona}} with persona description", () => {
    expect(
      substituteVars("Persona: {{persona}}", {
        ...baseCtx,
        personaDescription: "A brave warrior",
      })
    ).toBe("Persona: A brave warrior");
  });

  it("replaces {{persona}} with empty string when missing", () => {
    expect(substituteVars("Persona: {{persona}}", baseCtx)).toBe("Persona: ");
  });

  it("replaces {{model}} with model name", () => {
    expect(
      substituteVars("Using {{model}}", { ...baseCtx, modelName: "gpt-4" })
    ).toBe("Using gpt-4");
  });

  it("replaces {{model}} with empty string when missing", () => {
    expect(substituteVars("Using {{model}}", baseCtx)).toBe("Using ");
  });

  it("replaces {{description}} with character description", () => {
    expect(
      substituteVars("Desc: {{description}}", {
        ...baseCtx,
        charDescription: "A tall elf",
      })
    ).toBe("Desc: A tall elf");
  });

  it("replaces {{personality}} with character personality", () => {
    expect(
      substituteVars("Pers: {{personality}}", {
        ...baseCtx,
        charPersonality: "Kind and wise",
      })
    ).toBe("Pers: Kind and wise");
  });

  it("replaces {{scenario}} with character scenario", () => {
    expect(
      substituteVars("Scene: {{scenario}}", {
        ...baseCtx,
        charScenario: "In a dark forest",
      })
    ).toBe("Scene: In a dark forest");
  });

  it("replaces {{input}} with current input", () => {
    expect(
      substituteVars("Input: {{input}}", {
        ...baseCtx,
        currentInput: "Hello there",
      })
    ).toBe("Input: Hello there");
  });

  it("replaces {{input}} with empty string when missing", () => {
    expect(substituteVars("Input: {{input}}", baseCtx)).toBe("Input: ");
  });

  // --- Case insensitivity for new macros ---

  it("is case-insensitive for {{PERSONA}}", () => {
    expect(
      substituteVars("{{PERSONA}}", {
        ...baseCtx,
        personaDescription: "desc",
      })
    ).toBe("desc");
  });

  it("is case-insensitive for {{MODEL}}", () => {
    expect(
      substituteVars("{{Model}}", { ...baseCtx, modelName: "llama" })
    ).toBe("llama");
  });

  // --- Date/time macros ---

  describe("date/time macros", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T14:30:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("replaces {{isodate}} with YYYY-MM-DD", () => {
      expect(substituteVars("{{isodate}}", baseCtx)).toBe("2025-06-15");
    });

    it("replaces {{isotime}} with HH:mm", () => {
      expect(substituteVars("{{isotime}}", baseCtx)).toMatch(/^\d{2}:\d{2}$/);
    });

    it("replaces {{date}} with a non-empty locale date", () => {
      const result = substituteVars("{{date}}", baseCtx);
      expect(result).not.toBe("");
      expect(result).not.toBe("{{date}}");
    });

    it("replaces {{time}} with a non-empty locale time", () => {
      const result = substituteVars("{{time}}", baseCtx);
      expect(result).not.toBe("");
      expect(result).not.toBe("{{time}}");
    });

    it("is case-insensitive for {{ISODATE}}", () => {
      expect(substituteVars("{{ISODATE}}", baseCtx)).toBe("2025-06-15");
    });
  });

  // --- Random macro ---

  describe("{{random::...}}", () => {
    it("picks one of the comma-separated options", () => {
      const options = ["apple", "banana", "cherry"];
      const result = substituteVars("{{random::apple,banana,cherry}}", baseCtx);
      expect(options).toContain(result);
    });

    it("works with a single option", () => {
      expect(substituteVars("{{random::only}}", baseCtx)).toBe("only");
    });

    it("trims whitespace from options", () => {
      const result = substituteVars("{{random:: a , b }}", baseCtx);
      expect(["a", "b"]).toContain(result);
    });

    it("is case-insensitive", () => {
      const result = substituteVars("{{RANDOM::x,y}}", baseCtx);
      expect(["x", "y"]).toContain(result);
    });
  });

  // --- Message-derived macros ---

  describe("message-derived macros", () => {
    const messages = [
      { role: "user", content: "Hello", timestamp: "2025-06-15T10:00:00Z" },
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "How are you?", timestamp: "2025-06-15T10:05:00Z" },
      { role: "assistant", content: "I am fine" },
    ];

    it("replaces {{lastMessage}} with last message content", () => {
      expect(
        substituteVars("{{lastMessage}}", { ...baseCtx, messages })
      ).toBe("I am fine");
    });

    it("replaces {{lastUserMessage}} with last user message", () => {
      expect(
        substituteVars("{{lastUserMessage}}", { ...baseCtx, messages })
      ).toBe("How are you?");
    });

    it("replaces {{lastCharMessage}} with last assistant message", () => {
      expect(
        substituteVars("{{lastCharMessage}}", { ...baseCtx, messages })
      ).toBe("I am fine");
    });

    it("returns empty string for {{lastMessage}} with no messages", () => {
      expect(
        substituteVars("{{lastMessage}}", { ...baseCtx, messages: [] })
      ).toBe("");
    });

    it("returns empty string for {{lastUserMessage}} with no user messages", () => {
      expect(
        substituteVars("{{lastUserMessage}}", {
          ...baseCtx,
          messages: [{ role: "assistant", content: "Hi" }],
        })
      ).toBe("");
    });

    it("returns empty string when messages not provided", () => {
      expect(substituteVars("{{lastMessage}}", baseCtx)).toBe("");
    });
  });

  // --- Idle duration ---

  describe("{{idle_duration}}", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns human-readable idle duration", () => {
      const messages = [
        { role: "user", content: "Hi", timestamp: "2025-06-15T11:00:00.000Z" },
      ];
      expect(
        substituteVars("{{idle_duration}}", { ...baseCtx, messages })
      ).toBe("1 hour ago");
    });

    it("returns empty string when no user messages", () => {
      expect(
        substituteVars("{{idle_duration}}", { ...baseCtx, messages: [] })
      ).toBe("");
    });

    it("returns just now for very recent messages", () => {
      const messages = [
        { role: "user", content: "Hi", timestamp: "2025-06-15T11:59:50.000Z" },
      ];
      expect(
        substituteVars("{{idle_duration}}", { ...baseCtx, messages })
      ).toBe("just now");
    });
  });

  // --- Multiple macros in one string ---

  it("handles multiple different macros in one string", () => {
    const result = substituteVars(
      "{{char}} (played by {{user}}) with model {{model}} on {{isodate}}",
      { ...baseCtx, modelName: "gpt-4" }
    );
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
    expect(result).toContain("gpt-4");
    // isodate will be whatever the current date is
    expect(result).not.toContain("{{isodate}}");
  });
});

describe("formatDuration", () => {
  it("returns 'just now' for < 60 seconds", () => {
    expect(formatDuration(30_000)).toBe("just now");
  });

  it("returns minutes for < 60 minutes", () => {
    expect(formatDuration(5 * 60_000)).toBe("5 minutes ago");
  });

  it("returns singular minute", () => {
    expect(formatDuration(60_000)).toBe("1 minute ago");
  });

  it("returns hours for < 24 hours", () => {
    expect(formatDuration(3 * 3600_000)).toBe("3 hours ago");
  });

  it("returns singular hour", () => {
    expect(formatDuration(3600_000)).toBe("1 hour ago");
  });

  it("returns days for >= 24 hours", () => {
    expect(formatDuration(2 * 86400_000)).toBe("2 days ago");
  });

  it("returns singular day", () => {
    expect(formatDuration(86400_000)).toBe("1 day ago");
  });
});
