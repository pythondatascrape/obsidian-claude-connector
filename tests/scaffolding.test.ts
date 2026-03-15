import { buildClaudeMd } from "../src/scaffolding";
import { DEFAULT_CLAUDE_MD_TEMPLATE } from "../src/settings";

describe("buildClaudeMd", () => {
  it("renders vaultPath variable into template", () => {
    const md = buildClaudeMd("/Users/x/vault/04 - TEST", "my-app", DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain("/Users/x/vault/04 - TEST");
  });

  it("renders projectName variable into template", () => {
    const md = buildClaudeMd("/Users/x/vault", "my-app", "project: {{projectName}}", []);
    expect(md).toBe("project: my-app");
  });

  it("renders date variable as YYYY-MM-DD", () => {
    const md = buildClaudeMd("/vault", "app", "{{date}}", [], "2026-03-15");
    expect(md).toBe("2026-03-15");
  });

  it("renders python conditional when type active", () => {
    const md = buildClaudeMd("/vault", "app", "{{#if python}}use uv{{/if}}", ["python"]);
    expect(md).toContain("use uv");
  });

  it("suppresses python conditional when type inactive", () => {
    const md = buildClaudeMd("/vault", "app", "{{#if python}}use uv{{/if}}", []);
    expect(md).toBe("");
  });

  it("instructs loading .claude-context.md by default", () => {
    const md = buildClaudeMd("/vault", "app", DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain(".claude-context.md");
  });

  it("instructs writing changelog to vault by default", () => {
    const md = buildClaudeMd("/vault", "app", DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain("changelog.md");
  });
});
