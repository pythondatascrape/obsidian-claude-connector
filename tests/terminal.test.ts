import { buildFallbackMessage, isAllowedTerminal, TERMINAL_ALLOWLIST } from "../src/terminal";

describe("isAllowedTerminal", () => {
  it("allows listed terminals", () => {
    expect(isAllowedTerminal("Terminal")).toBe(true);
    expect(isAllowedTerminal("iTerm2")).toBe(true);
    expect(isAllowedTerminal("Warp")).toBe(true);
  });

  it("rejects unlisted terminals", () => {
    expect(isAllowedTerminal("bash")).toBe(false);
    expect(isAllowedTerminal("; rm -rf ~")).toBe(false);
    expect(isAllowedTerminal("")).toBe(false);
  });
});

describe("TERMINAL_ALLOWLIST", () => {
  it("contains at least the default terminal", () => {
    expect(TERMINAL_ALLOWLIST).toContain("Terminal");
  });
});

describe("buildFallbackMessage", () => {
  it("includes the cd and claude command", () => {
    const msg = buildFallbackMessage("/Users/x/Desktop/project");
    expect(msg).toContain("cd /Users/x/Desktop/project");
    expect(msg).toContain("claude");
  });
});
