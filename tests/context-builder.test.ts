import { estimateTokens, scanSecrets, buildContextFile, greedySelect } from "../src/context-builder";

describe("estimateTokens", () => {
  it("estimates tokens as charCount / 4 (ceiling)", () => {
    expect(estimateTokens("aaaa")).toBe(1);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

describe("scanSecrets", () => {
  it("flags lines matching secret patterns", () => {
    const flags = scanSecrets("api_key=abc\nNORMAL_LINE\nTOKEN=xyz");
    expect(flags).toContain("api_key=abc");
    expect(flags).toContain("TOKEN=xyz");
    expect(flags).not.toContain("NORMAL_LINE");
  });

  it("is case-insensitive", () => {
    expect(scanSecrets("Api_Key=foo")).toContain("Api_Key=foo");
  });

  it("returns empty array for clean content", () => {
    expect(scanSecrets("just a normal note")).toHaveLength(0);
  });
});

describe("greedySelect", () => {
  it("fills budget greedily from highest score", () => {
    const notes = [
      { path: "a.md", score: 10, hop: 1 as const, content: "a".repeat(400) },  // 100 tokens
      { path: "b.md", score: 8, hop: 1 as const, content: "b".repeat(400) },   // 100 tokens
      { path: "c.md", score: 5, hop: 2 as const, content: "c".repeat(400) },   // 100 tokens
    ];
    const selected = greedySelect(notes, 250); // only room for 2
    expect(selected.map(n => n.path)).toEqual(["a.md", "b.md"]);
  });
});

describe("buildContextFile", () => {
  it("includes design section", () => {
    const md = buildContextFile("# Design\nmy design", [], []);
    expect(md).toContain("## Design");
    expect(md).toContain("my design");
  });

  it("includes related notes section", () => {
    const md = buildContextFile("", [{ path: "related.md", content: "related content", score: 5, hop: 1 as const }], []);
    expect(md).toContain("## Related");
    expect(md).toContain("related.md");
  });

  it("includes diagrams section with paths", () => {
    const md = buildContextFile("", [], ["flow.excalidraw"]);
    expect(md).toContain("## Diagrams");
    expect(md).toContain("flow.excalidraw");
  });
});
