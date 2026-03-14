import * as fs from "fs/promises";
import * as path from "path";
import { expandTilde } from "./utils";

const BEGIN_MARKER = "# [Obsidian Connector] BEGIN";
const END_MARKER = "# [Obsidian Connector] END";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function injectManagedBlock(existingContent: string, rules: string): string {
  const block = `${BEGIN_MARKER}\n${rules.trim()}\n${END_MARKER}`;

  if (existingContent.includes(BEGIN_MARKER)) {
    return existingContent.replace(
      new RegExp(`${escapeRegex(BEGIN_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`),
      block
    );
  }

  return existingContent
    ? `${existingContent.trimEnd()}\n\n${block}\n`
    : `${block}\n`;
}

export function extractManagedBlock(content: string): string {
  const match = content.match(
    new RegExp(`${escapeRegex(BEGIN_MARKER)}\n([\\s\\S]*?)\n${escapeRegex(END_MARKER)}`)
  );
  return match ? match[1] : "";
}

export class FileSyncService {
  private plugin: any;

  constructor(plugin: any) {
    this.plugin = plugin;
  }

  async syncGitignore(): Promise<void> {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) return;
    const vaultPath = activeFile.parent?.path ?? "";
    const codePath = this.plugin.registry.getCodePath(vaultPath);
    if (!codePath) return;

    const resolved = expandTilde(codePath);
    const gitignorePath = path.join(resolved, ".gitignore");

    let existing = "";
    try { existing = await fs.readFile(gitignorePath, "utf-8"); } catch {}

    const updated = injectManagedBlock(existing, this.plugin.settings.gitignoreRules);
    await fs.writeFile(gitignorePath, updated, "utf-8");
  }

  async syncEnvExample(): Promise<void> {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) return;
    const vaultPath = activeFile.parent?.path ?? "";
    const codePath = this.plugin.registry.getCodePath(vaultPath);
    if (!codePath) return;

    const resolved = expandTilde(codePath);
    const dest = path.join(resolved, ".env.example");
    await fs.writeFile(dest, this.plugin.settings.envExampleContent, "utf-8");
  }

  async syncGitignoreForPath(codePath: string): Promise<void> {
    const resolved = expandTilde(codePath);
    const gitignorePath = path.join(resolved, ".gitignore");
    let existing = "";
    try { existing = await fs.readFile(gitignorePath, "utf-8"); } catch {}
    const updated = injectManagedBlock(existing, this.plugin.settings.gitignoreRules);
    await fs.writeFile(gitignorePath, updated, "utf-8");
  }

  async syncEnvExampleForPath(codePath: string): Promise<void> {
    const resolved = expandTilde(codePath);
    const dest = path.join(resolved, ".env.example");
    await fs.writeFile(dest, this.plugin.settings.envExampleContent, "utf-8");
  }
}
