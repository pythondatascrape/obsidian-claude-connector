import * as fs from "fs/promises";
import { detectProjectTypes, PROJECT_TYPE_INDICATORS } from "../src/project-detector";

jest.mock("fs/promises");
const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;

describe("detectProjectTypes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("detects python from pyproject.toml", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("pyproject.toml")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("python");
  });

  it("detects python from requirements.txt", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("requirements.txt")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("python");
  });

  it("detects node from package.json", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("package.json")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("node");
  });

  it("detects typescript from tsconfig.json", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("tsconfig.json")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("typescript");
  });

  it("detects go from go.mod", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("go.mod")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("go");
  });

  it("detects rust from Cargo.toml", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("Cargo.toml")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("rust");
  });

  it("detects multiple types", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("package.json") || String(p).endsWith("tsconfig.json")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("node");
    expect(types).toContain("typescript");
  });

  it("returns empty array when no indicators found", async () => {
    mockAccess.mockRejectedValue(new Error("not found"));
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toEqual([]);
  });
});
