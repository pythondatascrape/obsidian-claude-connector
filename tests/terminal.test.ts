import { buildTerminalCommand, buildFallbackMessage } from "../src/terminal";

describe("buildTerminalCommand", () => {
  it("builds open -a command with quoted args", () => {
    expect(buildTerminalCommand("Terminal", "/Users/x/Desktop/project"))
      .toBe(`open -a "Terminal" "/Users/x/Desktop/project"`);
  });

  it("handles paths with spaces", () => {
    expect(buildTerminalCommand("iTerm", "/Users/x/Desktop/my project"))
      .toBe(`open -a "iTerm" "/Users/x/Desktop/my project"`);
  });
});

describe("buildFallbackMessage", () => {
  it("includes the cd and claude command", () => {
    const msg = buildFallbackMessage("/Users/x/Desktop/project");
    expect(msg).toContain("cd /Users/x/Desktop/project");
    expect(msg).toContain("claude");
  });
});
