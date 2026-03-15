import { DEFAULT_SETTINGS } from "../src/settings";

describe("DEFAULT_SETTINGS", () => {
  it("has required fields with sensible defaults", () => {
    expect(DEFAULT_SETTINGS.tokenBudget).toBe(8000);
    expect(DEFAULT_SETTINGS.terminalApp).toBe("Terminal");
  });

  it("has claudeMdTemplate with vaultPath variable", () => {
    expect(DEFAULT_SETTINGS.claudeMdTemplate).toContain("{{vaultPath}}");
  });
});
