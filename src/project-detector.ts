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
  const detected: ProjectType[] = [];
  for (const [type, indicators] of Object.entries(PROJECT_TYPE_INDICATORS)) {
    for (const indicator of indicators) {
      try {
        await fs.access(path.join(codePath, indicator));
        detected.push(type as ProjectType);
        break;
      } catch {}
    }
  }
  return detected;
}
