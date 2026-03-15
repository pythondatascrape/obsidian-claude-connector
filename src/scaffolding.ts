import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { expandTilde, assertSafePath } from "./utils";
import { renderTemplate, TemplateVars, ProjectType } from "./template-engine";

const execFileAsync = promisify(execFile);

export interface ScaffoldResult {
  uvDone: boolean;
  ghDone: boolean;
  claudeMdWritten: boolean;
  errors: string[];
}

export class ScaffoldingService {
  private app: any;
  private vaultName: string;
  private pluginVersion: string;

  constructor(app: any, vaultName: string, pluginVersion: string) {
    this.app = app;
    this.vaultName = vaultName;
    this.pluginVersion = pluginVersion;
  }

  async scaffold(
    codePath: string,
    vaultAbsPath: string,
    claudeMdTemplate: string,
    activeTypes: ProjectType[] = [],
  ): Promise<ScaffoldResult> {
    const result: ScaffoldResult = { uvDone: false, ghDone: false, claudeMdWritten: false, errors: [] };

    const resolved = expandTilde(codePath);
    assertSafePath(resolved);

    try {
      await execFileAsync("uv", ["init", resolved]);
      result.uvDone = true;
    } catch (e: any) {
      const msg = e.message ?? "";
      if (msg.includes("command not found") || msg.includes("not found")) {
        result.errors.push("uv is not installed. Install from https://docs.astral.sh/uv/");
        return result;
      }
      // Directory likely already exists — not fatal, continue
      if (!msg.includes("already exists") && !msg.includes("destination")) {
        result.errors.push("uv init failed. Check that the path is valid.");
        return result;
      }
    }

    const projectName = path.basename(resolved);
    try {
      await execFileAsync("gh", ["repo", "create", projectName, "--private", `--source=${resolved}`, "--push"]);
      result.ghDone = true;
    } catch {
      result.errors.push("GitHub setup skipped: gh not installed or repo already exists.");
    }

    try {
      const claudeMdPath = path.join(resolved, "CLAUDE.md");
      const vars: TemplateVars = {
        vaultPath: vaultAbsPath,
        projectName,
        date: new Date().toISOString().slice(0, 10),
        vaultName: this.vaultName,
        pluginVersion: this.pluginVersion,
      };
      await fs.writeFile(claudeMdPath, renderTemplate(claudeMdTemplate, vars, activeTypes), "utf-8");
      result.claudeMdWritten = true;
    } catch (e: any) {
      result.errors.push(`Failed to write CLAUDE.md: ${e.message}`);
    }

    return result;
  }
}
