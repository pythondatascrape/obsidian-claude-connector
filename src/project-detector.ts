import * as fs from "fs/promises";
import * as path from "path";
import { ProjectType } from "./template-engine";

export const PROJECT_TYPE_INDICATORS: Record<ProjectType, string[]> = {
  python: ["pyproject.toml", "requirements.txt", "setup.py"],
  node: ["package.json"],
  typescript: ["tsconfig.json"],
  go: ["go.mod"],
  rust: ["Cargo.toml"],
};

export async function detectProjectTypes(codePath: string): Promise<ProjectType[]> {
  const checks = Object.entries(PROJECT_TYPE_INDICATORS).map(async ([type, indicators]) => {
    for (const indicator of indicators) {
      try {
        await fs.access(path.join(codePath, indicator));
        return type as ProjectType;
      } catch {}
    }
    return null;
  });
  const results = await Promise.all(checks);
  return results.filter((t): t is ProjectType => t !== null);
}
