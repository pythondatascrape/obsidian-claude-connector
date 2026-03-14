import { scoreNotes, NoteNode } from "../src/graph";

const makeNote = (path: string, tags: string[] = [], links: string[] = []): NoteNode => ({
  path,
  tags,
  links,
  backlinks: [],
});

describe("scoreNotes", () => {
  it("scores direct links higher than 2-hop links", () => {
    const root = makeNote("root.md", ["project"], ["child.md"]);
    const child = makeNote("child.md", ["project"], ["grandchild.md"]);
    const grandchild = makeNote("grandchild.md", [], []);
    const scores = scoreNotes(root, [root, child, grandchild]);
    expect(scores.find(s => s.path === "child.md")!.score)
      .toBeGreaterThan(scores.find(s => s.path === "grandchild.md")!.score);
  });

  it("adds tag overlap bonus", () => {
    const root = makeNote("root.md", ["alpha", "beta"], []);
    const sameTag = makeNote("same-tag.md", ["alpha"], []);
    const noTag = makeNote("no-tag.md", [], []);
    // Make sameTag and noTag reachable from root
    root.links = ["same-tag.md", "no-tag.md"];
    const scores = scoreNotes(root, [root, sameTag, noTag]);
    expect(scores.find(s => s.path === "same-tag.md")!.score)
      .toBeGreaterThan(scores.find(s => s.path === "no-tag.md")!.score);
  });

  it("excludes the root note from results", () => {
    const root = makeNote("root.md", [], []);
    const scores = scoreNotes(root, [root]);
    expect(scores.find(s => s.path === "root.md")).toBeUndefined();
  });

  it("limits traversal to 2 hops", () => {
    const root = makeNote("root.md", [], ["hop1.md"]);
    const hop1 = makeNote("hop1.md", [], ["hop2.md"]);
    const hop2 = makeNote("hop2.md", [], ["hop3.md"]);
    const hop3 = makeNote("hop3.md", [], []);
    const scores = scoreNotes(root, [root, hop1, hop2, hop3]);
    expect(scores.find(s => s.path === "hop3.md")).toBeUndefined();
  });
});
