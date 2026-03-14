import { expandTilde } from "../src/utils";

describe("expandTilde", () => {
  it("expands ~ at start of path", () => {
    const original = process.env.HOME;
    process.env.HOME = "/Users/test";
    expect(expandTilde("~/Desktop/project")).toBe("/Users/test/Desktop/project");
    process.env.HOME = original;
  });

  it("leaves paths without tilde unchanged", () => {
    expect(expandTilde("/absolute/path")).toBe("/absolute/path");
  });

  it("does not expand tilde not at position 0", () => {
    expect(expandTilde("some~/thing")).toBe("some~/thing");
  });
});
