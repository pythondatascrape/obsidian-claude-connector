import { buildClaudeMd } from "../src/scaffolding";
import { DEFAULT_CLAUDE_MD_TEMPLATE } from "../src/settings";

describe("buildClaudeMd", () => {
  it("renders vaultPath variable", () => {
    const md = buildClaudeMd({ vaultPath: "/my/vault" }, DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain("/my/vault");
  });

  it("renders projectName variable", () => {
    const md = buildClaudeMd({ projectName: "my-app" }, "project: {{projectName}}", []);
    expect(md).toBe("project: my-app");
  });

  it("renders date variable", () => {
    const md = buildClaudeMd({ date: "2026-03-15" }, "{{date}}", []);
    expect(md).toBe("2026-03-15");
  });

  it("renders vaultName variable", () => {
    const md = buildClaudeMd({ vaultName: "MyVault" }, "{{vaultName}}", []);
    expect(md).toBe("MyVault");
  });

  it("renders pluginVersion variable", () => {
    const md = buildClaudeMd({ pluginVersion: "0.2.0" }, "v{{pluginVersion}}", []);
    expect(md).toBe("v0.2.0");
  });

  it("renders python conditional when active", () => {
    const md = buildClaudeMd({}, "{{#if python}}use uv{{/if}}", ["python"]);
    expect(md).toContain("use uv");
  });

  it("suppresses python conditional when inactive", () => {
    const md = buildClaudeMd({}, "{{#if python}}use uv{{/if}}", []);
    expect(md).toBe("");
  });

  it("default template contains .claude-context.md", () => {
    const md = buildClaudeMd({ vaultPath: "/vault" }, DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain(".claude-context.md");
  });
});
