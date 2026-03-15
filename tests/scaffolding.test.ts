import { renderTemplate } from "../src/template-engine";
import { DEFAULT_CLAUDE_MD_TEMPLATE } from "../src/settings";

describe("renderTemplate via DEFAULT_CLAUDE_MD_TEMPLATE", () => {
  it("renders vaultPath into default template", () => {
    const md = renderTemplate(DEFAULT_CLAUDE_MD_TEMPLATE, { vaultPath: "/my/vault" }, []);
    expect(md).toContain("/my/vault");
  });

  it("default template contains .claude-context.md", () => {
    const md = renderTemplate(DEFAULT_CLAUDE_MD_TEMPLATE, { vaultPath: "/vault" }, []);
    expect(md).toContain(".claude-context.md");
  });

  it("default template contains changelog.md", () => {
    const md = renderTemplate(DEFAULT_CLAUDE_MD_TEMPLATE, { vaultPath: "/vault" }, []);
    expect(md).toContain("changelog.md");
  });
});
