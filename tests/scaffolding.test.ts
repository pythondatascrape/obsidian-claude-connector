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
