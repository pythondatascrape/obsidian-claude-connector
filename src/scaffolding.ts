import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { expandTilde } from "./utils";

const execFileAsync = promisify(execFile);

export interface ScaffoldResult {
  uvDone: boolean;
  ghDone: boolean;
  claudeMdWritten: boolean;
  errors: string[];
}

export function buildClaudeMd(vaultAbsPath: string): string {
  return `# Obsidian Connector — Claude Code Instructions

## Context
This project is linked to an Obsidian vault folder.

**Vault docs:** ${vaultAbsPath}

## On Startup
1. Read \`.claude-context.md\` in this directory for curated project context.
2. Treat the vault folder above as the documentation source — refer to it for design decisions.

## After Each Git Commit
Write a changelog entry to \`${vaultAbsPath}/changelog.md\`:
- Format: \`## YYYY-MM-DD HH:MM — <one-line summary>\` followed by bullet points
- Append to the top of the file; create the file if it doesn't exist
- Sessions with no commits produce no entry
`;
}

export class ScaffoldingService {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  async scaffold(codePath: string, vaultAbsPath: string): Promise<ScaffoldResult> {
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
      await fs.writeFile(claudeMdPath, buildClaudeMd(vaultAbsPath), "utf-8");
      result.claudeMdWritten = true;
    } catch (e: any) {
      result.errors.push(`Failed to write CLAUDE.md: ${e.message}`);
    }

    return result;
  }
}
