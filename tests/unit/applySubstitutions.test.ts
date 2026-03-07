import { describe, it, expect } from "vitest";
import { applySubstitutions } from "../../src/renderer/lib/substitution-utils";
import type { RegexSubstitution } from "../../src/shared/character-types";

describe("applySubstitutions", () => {
  it("returns content unchanged when substitutions is null", () => {
    expect(applySubstitutions("hello world", null)).toBe("hello world");
  });

  it("returns content unchanged when substitutions is undefined", () => {
    expect(applySubstitutions("hello world", undefined)).toBe("hello world");
  });

  it("returns content unchanged when substitutions is empty", () => {
    expect(applySubstitutions("hello world", [])).toBe("hello world");
  });

  it("applies a simple string replacement", () => {
    const rules: RegexSubstitution[] = [
      { pattern: "foo", replacement: "bar", flags: "g", enabled: true },
    ];
    expect(applySubstitutions("foo and foo", rules)).toBe("bar and bar");
  });

  it("applies regex capture group replacement", () => {
    const rules: RegexSubstitution[] = [
      { pattern: "\\*\\*(.*?)\\*\\*", replacement: "$1", flags: "g", enabled: true },
    ];
    expect(applySubstitutions("She said **hello** to him", rules)).toBe(
      "She said hello to him"
    );
  });

  it("skips disabled rules", () => {
    const rules: RegexSubstitution[] = [
      { pattern: "foo", replacement: "bar", flags: "g", enabled: false },
    ];
    expect(applySubstitutions("foo", rules)).toBe("foo");
  });

  it("skips rules with empty pattern", () => {
    const rules: RegexSubstitution[] = [
      { pattern: "", replacement: "bar", flags: "g", enabled: true },
    ];
    expect(applySubstitutions("hello", rules)).toBe("hello");
  });

  it("skips invalid regex patterns gracefully", () => {
    const rules: RegexSubstitution[] = [
      { pattern: "[invalid", replacement: "bar", flags: "g", enabled: true },
    ];
    expect(applySubstitutions("hello", rules)).toBe("hello");
  });

  it("applies multiple rules in order", () => {
    const rules: RegexSubstitution[] = [
      { pattern: "a", replacement: "b", flags: "g", enabled: true },
      { pattern: "b", replacement: "c", flags: "g", enabled: true },
    ];
    // "a" -> "b" -> "c", original "b" also -> "c"
    expect(applySubstitutions("ab", rules)).toBe("cc");
  });

  it("respects case-insensitive flag", () => {
    const rules: RegexSubstitution[] = [
      { pattern: "hello", replacement: "hi", flags: "gi", enabled: true },
    ];
    expect(applySubstitutions("HELLO Hello hello", rules)).toBe("hi hi hi");
  });

  it("defaults to global when flags is empty string", () => {
    // The utility falls back to "g" when flags is empty
    const rules: RegexSubstitution[] = [
      { pattern: "x", replacement: "y", flags: "", enabled: true },
    ];
    expect(applySubstitutions("x x x", rules)).toBe("y y y");
  });

  it("handles replacement with special regex replacement tokens", () => {
    const rules: RegexSubstitution[] = [
      { pattern: "(\\w+)\\s(\\w+)", replacement: "$2 $1", flags: "", enabled: true },
    ];
    expect(applySubstitutions("hello world", rules)).toBe("world hello");
  });
});
