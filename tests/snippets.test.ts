import { SNIPPETS, Snippet } from "../src/snippets";

describe("SNIPPETS", () => {
  it("is a non-empty array", () => {
    expect(SNIPPETS.length).toBeGreaterThan(0);
  });

  it("every snippet has a label and content", () => {
    for (const s of SNIPPETS) {
      expect(typeof s.label).toBe("string");
      expect(s.label.length).toBeGreaterThan(0);
      expect(typeof s.content).toBe("string");
      expect(s.content.length).toBeGreaterThan(0);
    }
  });

  it("includes run-tests snippet", () => {
    expect(SNIPPETS.find(s => s.label === "Run tests before commit")).toBeDefined();
  });

  it("includes uv snippet with python conditional", () => {
    const s = SNIPPETS.find(s => s.label === "uv dependency management");
    expect(s?.content).toContain("{{#if python}}");
    expect(s?.content).toContain("{{/if}}");
  });

  it("includes changelog snippet", () => {
    expect(SNIPPETS.find(s => s.label === "Changelog rule")).toBeDefined();
  });

  it("includes git discipline snippet", () => {
    expect(SNIPPETS.find(s => s.label === "Git discipline")).toBeDefined();
  });
});
