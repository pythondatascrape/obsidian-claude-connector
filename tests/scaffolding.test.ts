import { ScaffoldingService, buildClaudeMd } from "../src/scaffolding";

describe("buildClaudeMd", () => {
  it("contains vault path", () => {
    const md = buildClaudeMd("/Users/x/vault/30 - ACTIVE/04 - TEST");
    expect(md).toContain("/Users/x/vault/30 - ACTIVE/04 - TEST");
  });

  it("instructs loading .claude-context.md", () => {
    const md = buildClaudeMd("/Users/x/vault/30 - ACTIVE/04 - TEST");
    expect(md).toContain(".claude-context.md");
  });

  it("instructs writing changelog to vault", () => {
    const md = buildClaudeMd("/Users/x/vault/30 - ACTIVE/04 - TEST");
    expect(md).toContain("changelog.md");
  });
});

describe("ScaffoldingService.buildUvCommand", () => {
  it("returns correct uv init command", () => {
    const svc = new ScaffoldingService({} as any);
    expect(svc.buildUvCommand("/Users/x/Desktop/myproject")).toBe(
      "uv init /Users/x/Desktop/myproject"
    );
  });
});

describe("ScaffoldingService.buildGhCommand", () => {
  it("returns gh repo create command with source path", () => {
    const svc = new ScaffoldingService({} as any);
    expect(svc.buildGhCommand("myproject", "/Users/x/Desktop/myproject")).toBe(
      "gh repo create myproject --private --source=/Users/x/Desktop/myproject --push"
    );
  });
});
