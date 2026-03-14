import { buildFilename, resolveCollision, validateExcalidrawJson } from "../src/excalidraw";

describe("buildFilename", () => {
  it("builds name from note name, descriptor, and date", () => {
    const name = buildFilename("BChecker", "handoff-flow", "2026-03-13");
    expect(name).toBe("BChecker-handoff-flow-2026-03-13.excalidraw");
  });

  it("sanitizes spaces in note name", () => {
    const name = buildFilename("My Note", "flow", "2026-03-13");
    expect(name).toBe("My-Note-flow-2026-03-13.excalidraw");
  });
});

describe("resolveCollision", () => {
  it("returns original if not in existing list", () => {
    expect(resolveCollision("file.excalidraw", [])).toBe("file.excalidraw");
  });

  it("appends -2 on first collision", () => {
    expect(resolveCollision("file.excalidraw", ["file.excalidraw"])).toBe("file-2.excalidraw");
  });

  it("appends -3 on second collision", () => {
    expect(resolveCollision("file.excalidraw", ["file.excalidraw", "file-2.excalidraw"]))
      .toBe("file-3.excalidraw");
  });
});

describe("validateExcalidrawJson", () => {
  it("returns true for valid JSON", () => {
    expect(validateExcalidrawJson('{"type":"excalidraw","elements":[]}')).toBe(true);
  });

  it("returns false for invalid JSON", () => {
    expect(validateExcalidrawJson("not json")).toBe(false);
  });
});
