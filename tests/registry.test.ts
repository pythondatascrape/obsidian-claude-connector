import { LinkRegistry } from "../src/registry";

const makeRegistry = () => new LinkRegistry({
  load: jest.fn().mockResolvedValue({}),
  save: jest.fn().mockResolvedValue(undefined)
} as any);

describe("LinkRegistry", () => {
  it("links a vault path to a code path", async () => {
    const r = makeRegistry();
    await r.link("30 - ACTIVE/04 - TEST", "/Users/x/Desktop/test");
    expect(r.getCodePath("30 - ACTIVE/04 - TEST")).toBe("/Users/x/Desktop/test");
  });

  it("getVaultPath returns vault path for a code path", async () => {
    const r = makeRegistry();
    await r.link("30 - ACTIVE/04 - TEST", "/Users/x/Desktop/test");
    expect(r.getVaultPath("/Users/x/Desktop/test")).toBe("30 - ACTIVE/04 - TEST");
  });

  it("throws if vault path already linked", async () => {
    const r = makeRegistry();
    await r.link("30 - ACTIVE/04 - TEST", "/Users/x/Desktop/test");
    await expect(r.link("30 - ACTIVE/04 - TEST", "/Users/x/Desktop/other")).rejects.toThrow("already linked");
  });

  it("throws if code path already linked to different vault path", async () => {
    const r = makeRegistry();
    await r.link("30 - ACTIVE/04 - TEST", "/Users/x/Desktop/test");
    await expect(r.link("30 - ACTIVE/04 - OTHER", "/Users/x/Desktop/test")).rejects.toThrow("already linked");
  });

  it("unlink removes both directions", async () => {
    const r = makeRegistry();
    await r.link("30 - ACTIVE/04 - TEST", "/Users/x/Desktop/test");
    await r.unlink("30 - ACTIVE/04 - TEST");
    expect(r.getCodePath("30 - ACTIVE/04 - TEST")).toBeUndefined();
  });

  it("isLinked returns true for linked vault path", async () => {
    const r = makeRegistry();
    await r.link("30 - ACTIVE/04 - TEST", "/Users/x/Desktop/test");
    expect(r.isLinked("30 - ACTIVE/04 - TEST")).toBe(true);
  });

  it("isLinked returns false for unlinked vault path", () => {
    const r = makeRegistry();
    expect(r.isLinked("30 - ACTIVE/99 - UNKNOWN")).toBe(false);
  });

  it("load() round-trips data from store", async () => {
    const stored: Record<string, string> = { "30 - ACTIVE/04 - TEST": "/Users/x/Desktop/test" };
    const r = new LinkRegistry({
      load: jest.fn().mockResolvedValue(stored),
      save: jest.fn().mockResolvedValue(undefined)
    } as any);
    await r.load();
    expect(r.getCodePath("30 - ACTIVE/04 - TEST")).toBe("/Users/x/Desktop/test");
  });
});
