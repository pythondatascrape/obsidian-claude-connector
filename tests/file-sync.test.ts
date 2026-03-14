import { injectManagedBlock, extractManagedBlock } from "../src/file-sync";

const BEGIN = "# [Obsidian Connector] BEGIN";
const END = "# [Obsidian Connector] END";

describe("injectManagedBlock", () => {
  it("inserts block into empty file", () => {
    const result = injectManagedBlock("", "*.pyc\n.env");
    expect(result).toContain(BEGIN);
    expect(result).toContain("*.pyc");
    expect(result).toContain(END);
  });

  it("replaces existing block content", () => {
    const existing = `# user rule\n${BEGIN}\nold rule\n${END}\n# another user rule`;
    const result = injectManagedBlock(existing, "new rule");
    expect(result).toContain("new rule");
    expect(result).not.toContain("old rule");
    expect(result).toContain("# user rule");
    expect(result).toContain("# another user rule");
  });

  it("preserves rules outside the block", () => {
    const existing = `before\n${BEGIN}\nold\n${END}\nafter`;
    const result = injectManagedBlock(existing, "new");
    expect(result).toContain("before");
    expect(result).toContain("after");
  });
});

describe("extractManagedBlock", () => {
  it("returns rules inside managed block", () => {
    const content = `${BEGIN}\n*.pyc\n.env\n${END}`;
    expect(extractManagedBlock(content)).toBe("*.pyc\n.env");
  });

  it("returns empty string if no block present", () => {
    expect(extractManagedBlock("# no block here")).toBe("");
  });
});
