import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { expandTilde } from "./utils";
import { renderTemplate, ProjectType } from "./template-engine";

const execFileAsync = promisify(execFile);

export interface ScaffoldResult {
  uvDone: boolean;
  ghDone: boolean;
  claudeMdWritten: boolean;
  errors: string[];
}

export function buildClaudeMd(
  vaultAbsPath: string,
  projectName: string,
  template: string,
  activeTypes: ProjectType[],
  date?: string,
): string {
  const resolvedDate = date ?? new Date().toISOString().slice(0, 10);
  return renderTemplate(template, {
    vaultPath: vaultAbsPath,
    projectName,
    date: resolvedDate,
  }, activeTypes);
}

export class ScaffoldingService {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  async scaffold(
    codePath: string,
    vaultAbsPath: string,
    claudeMdTemplate: string,
    activeTypes: ProjectType[] = [],
  ): Promise<ScaffoldResult> {
    const result: ScaffoldResult = { uvDone: false, ghDone: false, claudeMdWritten: false, errors: [] };

    const resolved = expandTilde(codePath);

    let dirExists = false;
    try { await fs.access(resolved); dirExists = true; } catch {}

    if (!dirExists) {
      try {
        await execFileAsync("uv", ["init", resolved]);
        result.uvDone = true;
      } catch (e: any) {
        const msg = e.message ?? "";
        if (msg.includes("command not found") || msg.includes("not found")) {
          result.errors.push("uv is not installed. Install from https://docs.astral.sh/uv/");
          return result;
        }
        result.errors.push(`uv init failed: ${msg}`);
        return result;
      }
    }

    const projectName = path.basename(resolved);
    try {
      await execFileAsync("gh", ["repo", "create", projectName, "--private", `--source=${resolved}`, "--push"]);
      result.ghDone = true;
    } catch (e: any) {
      result.errors.push(`GitHub setup skipped: ${e.message}`);
    }

    try {
      const claudeMdPath = path.join(resolved, "CLAUDE.md");
      await fs.writeFile(claudeMdPath, buildClaudeMd(vaultAbsPath, projectName, claudeMdTemplate, activeTypes), "utf-8");
      result.claudeMdWritten = true;
    } catch (e: any) {
      result.errors.push(`Failed to write CLAUDE.md: ${e.message}`);
    }

    return result;
  }
}
