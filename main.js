"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ObsidianConnectorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  tokenBudget: 8e3,
  terminalApp: "Terminal",
  gitignoreRules: "",
  envExampleContent: "ANTHROPIC_API_KEY=\n"
};
var ConnectorSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Obsidian Connector" });
    new import_obsidian.Setting(containerEl).setName("Token Budget").setDesc("Max tokens for generated context file (default: 8000).").addText(
      (text) => text.setValue(String(this.plugin.settings.tokenBudget)).onChange(async (value) => {
        const n = parseInt(value);
        if (!isNaN(n) && n > 0) {
          this.plugin.settings.tokenBudget = n;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Terminal App").setDesc("macOS terminal to launch (e.g. Terminal, iTerm, Warp).").addText(
      (text) => text.setValue(this.plugin.settings.terminalApp).onChange(async (value) => {
        this.plugin.settings.terminalApp = value.trim() || "Terminal";
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "GitIgnore Manager" });
    new import_obsidian.Setting(containerEl).setName("Managed .gitignore rules").setDesc("Synced into the # [Obsidian Connector] block in the linked project's .gitignore.").addTextArea(
      (text) => text.setValue(this.plugin.settings.gitignoreRules).onChange(async (value) => {
        this.plugin.settings.gitignoreRules = value;
        await this.plugin.saveSettings();
        await this.plugin.fileSyncService?.syncGitignore();
      })
    );
    containerEl.createEl("h3", { text: ".env.example Manager" });
    new import_obsidian.Setting(containerEl).setName(".env.example content").setDesc("Key names only (no values). Vault is authoritative.").addTextArea(
      (text) => text.setValue(this.plugin.settings.envExampleContent).onChange(async (value) => {
        this.plugin.settings.envExampleContent = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/registry.ts
var LinkRegistry = class {
  constructor(store) {
    this.map = /* @__PURE__ */ new Map();
    this.store = store;
  }
  async load() {
    const data = await this.store.load();
    this.map = new Map(Object.entries(data ?? {}));
  }
  async link(vaultPath, codePath) {
    if (this.map.has(vaultPath)) {
      throw new Error(`Vault path "${vaultPath}" is already linked to "${this.map.get(vaultPath)}"`);
    }
    for (const [v, c] of this.map) {
      if (c === codePath) {
        throw new Error(`Code path "${codePath}" is already linked to vault path "${v}"`);
      }
    }
    this.map.set(vaultPath, codePath);
    await this.persist();
  }
  async unlink(vaultPath) {
    this.map.delete(vaultPath);
    await this.persist();
  }
  getCodePath(vaultPath) {
    return this.map.get(vaultPath);
  }
  getVaultPath(codePath) {
    for (const [v, c] of this.map) {
      if (c === codePath) return v;
    }
    return void 0;
  }
  isLinked(vaultPath) {
    return this.map.has(vaultPath);
  }
  async persist() {
    const data = {};
    for (const [v, c] of this.map) data[v] = c;
    await this.store.save(data);
  }
};

// src/scaffolding.ts
var import_child_process = require("child_process");
var import_util = require("util");
var fs = __toESM(require("fs/promises"));
var path = __toESM(require("path"));

// src/utils.ts
function expandTilde(p) {
  if (p.startsWith("~")) {
    return (process.env.HOME ?? "") + p.slice(1);
  }
  return p;
}

// src/scaffolding.ts
var execFileAsync = (0, import_util.promisify)(import_child_process.execFile);
function buildClaudeMd(vaultAbsPath) {
  return `# Obsidian Connector \u2014 Claude Code Instructions

## Context
This project is linked to an Obsidian vault folder.

**Vault docs:** ${vaultAbsPath}

## On Startup
1. Read \`.claude-context.md\` in this directory for curated project context.
2. Treat the vault folder above as the documentation source \u2014 refer to it for design decisions.

## After Each Git Commit
Write a changelog entry to \`${vaultAbsPath}/changelog.md\`:
- Format: \`## YYYY-MM-DD HH:MM \u2014 <one-line summary>\` followed by bullet points
- Append to the top of the file; create the file if it doesn't exist
- Sessions with no commits produce no entry
`;
}
var ScaffoldingService = class {
  constructor(app) {
    this.app = app;
  }
  async scaffold(codePath, vaultAbsPath) {
    const result = { uvDone: false, ghDone: false, claudeMdWritten: false, errors: [] };
    const resolved = expandTilde(codePath);
    let dirExists = false;
    try {
      await fs.access(resolved);
      dirExists = true;
    } catch {
    }
    if (!dirExists) {
      try {
        await execFileAsync("uv", ["init", resolved]);
        result.uvDone = true;
      } catch (e) {
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
    } catch (e) {
      result.errors.push(`GitHub setup skipped: ${e.message}`);
    }
    try {
      const claudeMdPath = path.join(resolved, "CLAUDE.md");
      await fs.writeFile(claudeMdPath, buildClaudeMd(vaultAbsPath), "utf-8");
      result.claudeMdWritten = true;
    } catch (e) {
      result.errors.push(`Failed to write CLAUDE.md: ${e.message}`);
    }
    return result;
  }
};

// src/excalidraw.ts
function buildFilename(noteName, descriptor, date) {
  const safeName = noteName.replace(/\s+/g, "-");
  return `${safeName}-${descriptor}-${date}.excalidraw`;
}
function resolveCollision(filename, existing) {
  if (!existing.includes(filename)) return filename;
  const base = filename.replace(/\.excalidraw$/, "");
  let n = 2;
  while (existing.includes(`${base}-${n}.excalidraw`)) n++;
  return `${base}-${n}.excalidraw`;
}
function validateExcalidrawJson(json) {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}
var ExcalidrawService = class {
  constructor(app) {
    this.app = app;
  }
  async write(json, vaultFolderPath, descriptor = "diagram") {
    if (!validateExcalidrawJson(json)) return null;
    const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const activeFile = this.app.workspace.getActiveFile();
    const noteName = activeFile?.basename ?? "note";
    const base = buildFilename(noteName, descriptor, date);
    const existingFiles = this.app.vault.getFiles().filter((f) => f.path.startsWith(vaultFolderPath)).map((f) => f.name);
    const filename = resolveCollision(base, existingFiles);
    const destPath = `${vaultFolderPath}/${filename}`;
    await this.app.vault.create(destPath, json);
    return destPath;
  }
};

// src/terminal.ts
var import_child_process2 = require("child_process");
var import_util2 = require("util");
var execAsync = (0, import_util2.promisify)(import_child_process2.exec);
function buildTerminalCommand(terminalApp, codePath) {
  return `open -a "${terminalApp}" "${codePath}"`;
}
function buildFallbackMessage(codePath) {
  return `Terminal launch failed. Run manually:

cd ${codePath} && claude`;
}
var TerminalService = class {
  constructor(terminalApp) {
    this.terminalApp = terminalApp;
  }
  async launch(codePath) {
    const resolved = expandTilde(codePath);
    const cmd = buildTerminalCommand(this.terminalApp, resolved);
    try {
      await execAsync(cmd);
    } catch (e) {
      throw new Error(buildFallbackMessage(resolved));
    }
  }
};

// src/file-sync.ts
var fs2 = __toESM(require("fs/promises"));
var path2 = __toESM(require("path"));
var BEGIN_MARKER = "# [Obsidian Connector] BEGIN";
var END_MARKER = "# [Obsidian Connector] END";
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function injectManagedBlock(existingContent, rules) {
  const block = `${BEGIN_MARKER}
${rules.trim()}
${END_MARKER}`;
  if (existingContent.includes(BEGIN_MARKER)) {
    return existingContent.replace(
      new RegExp(`${escapeRegex(BEGIN_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`),
      block
    );
  }
  return existingContent ? `${existingContent.trimEnd()}

${block}
` : `${block}
`;
}
var FileSyncService = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  async syncGitignore() {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) return;
    const vaultPath = activeFile.parent?.path ?? "";
    const codePath = this.plugin.registry.getCodePath(vaultPath);
    if (!codePath) return;
    const resolved = expandTilde(codePath);
    const gitignorePath = path2.join(resolved, ".gitignore");
    let existing = "";
    try {
      existing = await fs2.readFile(gitignorePath, "utf-8");
    } catch {
    }
    const updated = injectManagedBlock(existing, this.plugin.settings.gitignoreRules);
    await fs2.writeFile(gitignorePath, updated, "utf-8");
  }
  async syncEnvExample() {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) return;
    const vaultPath = activeFile.parent?.path ?? "";
    const codePath = this.plugin.registry.getCodePath(vaultPath);
    if (!codePath) return;
    const resolved = expandTilde(codePath);
    const dest = path2.join(resolved, ".env.example");
    await fs2.writeFile(dest, this.plugin.settings.envExampleContent, "utf-8");
  }
  async syncGitignoreForPath(codePath) {
    const resolved = expandTilde(codePath);
    const gitignorePath = path2.join(resolved, ".gitignore");
    let existing = "";
    try {
      existing = await fs2.readFile(gitignorePath, "utf-8");
    } catch {
    }
    const updated = injectManagedBlock(existing, this.plugin.settings.gitignoreRules);
    await fs2.writeFile(gitignorePath, updated, "utf-8");
  }
  async syncEnvExampleForPath(codePath) {
    const resolved = expandTilde(codePath);
    const dest = path2.join(resolved, ".env.example");
    await fs2.writeFile(dest, this.plugin.settings.envExampleContent, "utf-8");
  }
};

// src/chat-panel.ts
var import_obsidian2 = require("obsidian");

// src/graph.ts
var HOP1_BASE = 10;
var HOP2_BASE = 4;
var TAG_BONUS = 3;
function scoreNotes(root, allNotes) {
  const noteByPath = new Map(allNotes.map((n) => [n.path, n]));
  const rootTags = new Set(root.tags);
  const visited = /* @__PURE__ */ new Set([root.path]);
  const scores = /* @__PURE__ */ new Map();
  const hop1Paths = /* @__PURE__ */ new Set([...root.links, ...root.backlinks]);
  for (const p of hop1Paths) {
    if (!noteByPath.has(p)) continue;
    const note = noteByPath.get(p);
    const tagBonus = note.tags.filter((t) => rootTags.has(t)).length * TAG_BONUS;
    scores.set(p, { path: p, score: HOP1_BASE + tagBonus, hop: 1 });
    visited.add(p);
  }
  for (const p of hop1Paths) {
    const note = noteByPath.get(p);
    if (!note) continue;
    for (const p2 of [...note.links, ...note.backlinks]) {
      if (visited.has(p2) || !noteByPath.has(p2)) continue;
      const note2 = noteByPath.get(p2);
      const tagBonus = note2.tags.filter((t) => rootTags.has(t)).length * TAG_BONUS;
      scores.set(p2, { path: p2, score: HOP2_BASE + tagBonus, hop: 2 });
      visited.add(p2);
    }
  }
  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}

// src/context-builder.ts
var fs3 = __toESM(require("fs/promises"));
var path3 = __toESM(require("path"));
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
function greedySelect(notes, budgetTokens) {
  const sorted = [...notes].sort((a, b) => b.score - a.score);
  const selected = [];
  let used = 0;
  for (const note of sorted) {
    const t = estimateTokens(note.content);
    if (used + t <= budgetTokens) {
      selected.push(note);
      used += t;
    }
  }
  return selected;
}
function buildContextFile(designContent, relatedNotes, diagramPaths) {
  const lines = ["# Claude Context\n", "## Design\n", designContent.trim(), ""];
  if (relatedNotes.length > 0) {
    lines.push("## Related\n");
    for (const note of relatedNotes) {
      lines.push(`### ${note.path}
`);
      lines.push(note.content.trim());
      lines.push("");
    }
  }
  if (diagramPaths.length > 0) {
    lines.push("## Diagrams\n");
    for (const p of diagramPaths) {
      lines.push(`- ${p}`);
    }
  }
  return lines.join("\n");
}
async function writeContextFile(codePath, content) {
  const resolved = expandTilde(codePath);
  const dest = path3.join(resolved, ".claude-context.md");
  await fs3.writeFile(dest, content, "utf-8");
}

// src/chat-panel.ts
var CHAT_PANEL_VIEW = "obsidian-connector-chat";
var ChatPanelView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return CHAT_PANEL_VIEW;
  }
  getDisplayText() {
    return "Claude Context";
  }
  getIcon() {
    return "file-code";
  }
  async onOpen() {
    await this.render();
  }
  async render() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("obsidian-connector-panel");
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      containerEl.createEl("p", { text: "Open a note to see context." });
      return;
    }
    const vaultPath = activeFile.parent?.path ?? "";
    const codePath = this.plugin.registry.getCodePath(vaultPath);
    if (!codePath) {
      containerEl.createEl("p", { text: "This folder is not linked to a code project." });
      const hint = containerEl.createEl("p");
      hint.createEl("code", { text: "Obsidian Connector: Link project" });
      return;
    }
    const { access: access2 } = await import("fs/promises");
    const resolvedCode = codePath.replace(/^~/, process.env.HOME ?? "");
    let codePathExists = true;
    try {
      await access2(resolvedCode);
    } catch {
      codePathExists = false;
    }
    if (!codePathExists) {
      const banner = containerEl.createEl("div", { cls: "oc-banner oc-warning" });
      banner.createEl("span", { text: `Code project not found: ${codePath}` });
      const relinkBtn = banner.createEl("button", { text: "Re-link" });
      relinkBtn.onclick = () => this.plugin.runLinkSetupPublic();
    }
    const allNotes = this.buildNoteNodes();
    const rootNode = allNotes.find((n) => n.path === activeFile.path) ?? {
      path: activeFile.path,
      tags: [],
      links: [],
      backlinks: []
    };
    const scored = scoreNotes(rootNode, allNotes);
    const primaryContent = await this.app.vault.read(activeFile);
    const primaryTokens = estimateTokens(primaryContent);
    const candidatesWithContent = [];
    for (const s of scored) {
      const f = this.app.vault.getAbstractFileByPath(s.path);
      if (!f) continue;
      try {
        const content = await this.app.vault.read(f);
        candidatesWithContent.push({ ...s, content });
      } catch {
      }
    }
    const remaining = this.plugin.settings.tokenBudget - primaryTokens;
    const selectedNotes = greedySelect(candidatesWithContent, remaining);
    const excalidrawPaths = this.app.vault.getFiles().filter((f) => f.path.startsWith(vaultPath) && f.extension === "excalidraw").map((f) => f.path);
    const contextContent = buildContextFile(primaryContent, selectedNotes, excalidrawPaths);
    const totalTokens = estimateTokens(contextContent);
    containerEl.createEl("h4", { text: "Context Preview" });
    const summary = containerEl.createEl("div", { cls: "oc-token-summary" });
    summary.createEl("span", {
      text: `${totalTokens} tokens \xB7 ${selectedNotes.length + 1} notes \xB7 ${excalidrawPaths.length} diagrams`
    });
    const primaryEl = containerEl.createEl("div", { cls: "oc-note-item oc-primary" });
    primaryEl.createEl("span", { text: `\u{1F4C4} ${activeFile.basename}` });
    primaryEl.createEl("span", { cls: "oc-tokens", text: `${primaryTokens}t` });
    if (selectedNotes.length > 0) {
      containerEl.createEl("p", { cls: "oc-section-label", text: "Related notes included:" });
      for (const note of selectedNotes) {
        const noteEl = containerEl.createEl("div", { cls: "oc-note-item" });
        const name = note.path.split("/").pop() ?? note.path;
        noteEl.createEl("span", { text: `\u21B3 ${name}` });
        noteEl.createEl("span", { cls: "oc-tokens", text: `${estimateTokens(note.content)}t` });
      }
    }
    if (excalidrawPaths.length > 0) {
      containerEl.createEl("p", { cls: "oc-section-label", text: "Diagrams referenced:" });
      for (const p of excalidrawPaths) {
        const name = p.split("/").pop() ?? p;
        containerEl.createEl("div", { cls: "oc-note-item", text: `\u2B21 ${name}` });
      }
    }
    containerEl.createEl("hr");
    const pathEl = containerEl.createEl("div", { cls: "oc-code-path" });
    pathEl.createEl("span", { text: `\u2192 ${codePath}` });
    const startBtn = containerEl.createEl("button", {
      text: "Start Coding \u2192",
      cls: "oc-btn oc-primary"
    });
    startBtn.disabled = !codePathExists;
    startBtn.onclick = async () => {
      startBtn.disabled = true;
      startBtn.textContent = "Launching\u2026";
      try {
        await writeContextFile(codePath, contextContent);
        await this.plugin.fileSyncService?.syncEnvExampleForPath(codePath);
        await this.plugin.terminalService?.launch(codePath);
        startBtn.textContent = "Launched \u2713";
      } catch (e) {
        new import_obsidian2.Notice(`Start Coding failed: ${e.message}`);
        startBtn.disabled = false;
        startBtn.textContent = "Start Coding \u2192";
      }
    };
  }
  buildNoteNodes() {
    const files = this.app.vault.getMarkdownFiles();
    return files.map((f) => {
      const cache = this.app.metadataCache.getFileCache(f);
      const tags = cache?.tags?.map((t) => t.tag.replace("#", "")) ?? [];
      const links = cache?.links?.map((l) => {
        const dest = this.app.metadataCache.getFirstLinkpathDest(l.link, f.path);
        return dest?.path ?? "";
      }).filter(Boolean) ?? [];
      let backlinks = [];
      try {
        backlinks = Object.keys(
          this.app.metadataCache.getBacklinksForFile(f)?.data ?? {}
        );
      } catch {
      }
      return { path: f.path, tags, links, backlinks };
    });
  }
};

// src/main.ts
var ObsidianConnectorPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this._data = {};
  }
  async onload() {
    await this.loadSettings();
    this.registry = new LinkRegistry({
      load: async () => {
        const d = await this.loadData();
        return d?.registry ?? {};
      },
      save: async (data) => {
        this._data.registry = data;
        await this.saveData(this._data);
      }
    });
    await this.registry.load();
    this.scaffoldingService = new ScaffoldingService(this.app);
    this.excalidrawService = new ExcalidrawService(this.app);
    this.terminalService = new TerminalService(this.settings.terminalApp);
    this.fileSyncService = new FileSyncService(this);
    this.registerView(CHAT_PANEL_VIEW, (leaf) => new ChatPanelView(leaf, this));
    this.addSettingTab(new ConnectorSettingTab(this.app, this));
    this.addCommand({
      id: "link-project",
      name: "Link project: connect this vault folder to a code directory",
      callback: () => this.runLinkSetupPublic()
    });
    this.addCommand({
      id: "open-chat-panel",
      name: "Open Claude chat panel",
      callback: () => this.openChatPanel()
    });
  }
  async loadSettings() {
    const data = await this.loadData();
    this._data = data ?? {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
  }
  async saveSettings() {
    this._data.settings = this.settings;
    await this.saveData(this._data);
    this.terminalService = new TerminalService(this.settings.terminalApp);
  }
  async runLinkSetupPublic() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;
    const vaultPath = activeFile.parent?.path ?? "";
    if (this.registry.isLinked(vaultPath)) {
      const proceed = await this.confirm(`"${vaultPath}" is already linked. Re-link?`);
      if (!proceed) return;
      await this.registry.unlink(vaultPath);
    }
    const codePath = await this.promptText("Code project directory (absolute path or ~/...):");
    if (!codePath) return;
    try {
      await this.registry.link(vaultPath, codePath);
    } catch (e) {
      new import_obsidian3.Notice(e.message);
      return;
    }
    const basePath = this.app.vault.adapter.getBasePath?.() ?? "";
    const vaultAbsPath = basePath ? `${basePath}/${vaultPath}` : vaultPath;
    const result = await this.scaffoldingService.scaffold(codePath, vaultAbsPath);
    if (result.errors.some((e) => e.includes("uv is not installed"))) {
      new import_obsidian3.Notice(result.errors[0]);
      await this.registry.unlink(vaultPath);
      return;
    }
    if (result.errors.length > 0) {
      new import_obsidian3.Notice(result.errors.join("\n"));
    }
    await this.fileSyncService.syncGitignoreForPath(codePath);
    await this.fileSyncService.syncEnvExampleForPath(codePath);
    new import_obsidian3.Notice("Project linked successfully!");
  }
  async openChatPanel() {
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: CHAT_PANEL_VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  promptText(message) {
    return new Promise((resolve) => {
      let result = null;
      const modal = new class extends import_obsidian3.Modal {
        onOpen() {
          this.contentEl.createEl("p", { text: message });
          const input = this.contentEl.createEl("input", {
            attr: { type: "text", style: "width:100%;margin-bottom:8px" }
          });
          input.oninput = () => {
            result = input.value;
          };
          const btn = this.contentEl.createEl("button", { text: "OK" });
          btn.onclick = () => this.close();
        }
        onClose() {
          resolve(result);
        }
      }(this.app);
      modal.open();
    });
  }
  confirm(message) {
    return new Promise((resolve) => {
      let resolved = false;
      const modal = new class extends import_obsidian3.Modal {
        onOpen() {
          this.contentEl.createEl("p", { text: message });
          const row = this.contentEl.createEl("div");
          const yes = row.createEl("button", { text: "Yes" });
          const no = row.createEl("button", { text: "Cancel" });
          yes.onclick = () => {
            resolved = true;
            resolve(true);
            this.close();
          };
          no.onclick = () => {
            resolved = true;
            resolve(false);
            this.close();
          };
        }
        onClose() {
          if (!resolved) resolve(false);
        }
      }(this.app);
      modal.open();
    });
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL3NldHRpbmdzLnRzIiwgInNyYy9yZWdpc3RyeS50cyIsICJzcmMvc2NhZmZvbGRpbmcudHMiLCAic3JjL3V0aWxzLnRzIiwgInNyYy9leGNhbGlkcmF3LnRzIiwgInNyYy90ZXJtaW5hbC50cyIsICJzcmMvZmlsZS1zeW5jLnRzIiwgInNyYy9jaGF0LXBhbmVsLnRzIiwgInNyYy9ncmFwaC50cyIsICJzcmMvY29udGV4dC1idWlsZGVyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBQbHVnaW4sIE1vZGFsLCBTZXR0aW5nLCBOb3RpY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IENvbm5lY3RvclNldHRpbmdUYWIsIERFRkFVTFRfU0VUVElOR1MsIFBsdWdpblNldHRpbmdzIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB7IExpbmtSZWdpc3RyeSB9IGZyb20gXCIuL3JlZ2lzdHJ5XCI7XG5pbXBvcnQgeyBTY2FmZm9sZGluZ1NlcnZpY2UgfSBmcm9tIFwiLi9zY2FmZm9sZGluZ1wiO1xuaW1wb3J0IHsgRXhjYWxpZHJhd1NlcnZpY2UgfSBmcm9tIFwiLi9leGNhbGlkcmF3XCI7XG5pbXBvcnQgeyBUZXJtaW5hbFNlcnZpY2UgfSBmcm9tIFwiLi90ZXJtaW5hbFwiO1xuaW1wb3J0IHsgRmlsZVN5bmNTZXJ2aWNlIH0gZnJvbSBcIi4vZmlsZS1zeW5jXCI7XG5pbXBvcnQgeyBDaGF0UGFuZWxWaWV3LCBDSEFUX1BBTkVMX1ZJRVcgfSBmcm9tIFwiLi9jaGF0LXBhbmVsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9ic2lkaWFuQ29ubmVjdG9yUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFBsdWdpblNldHRpbmdzO1xuICByZWdpc3RyeTogTGlua1JlZ2lzdHJ5O1xuICBzY2FmZm9sZGluZ1NlcnZpY2U6IFNjYWZmb2xkaW5nU2VydmljZTtcbiAgZXhjYWxpZHJhd1NlcnZpY2U6IEV4Y2FsaWRyYXdTZXJ2aWNlO1xuICB0ZXJtaW5hbFNlcnZpY2U6IFRlcm1pbmFsU2VydmljZTtcbiAgZmlsZVN5bmNTZXJ2aWNlOiBGaWxlU3luY1NlcnZpY2U7XG5cbiAgcHJpdmF0ZSBfZGF0YTogYW55ID0ge307XG5cbiAgYXN5bmMgb25sb2FkKCkge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG5cbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbmV3IExpbmtSZWdpc3RyeSh7XG4gICAgICBsb2FkOiBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGQgPSBhd2FpdCB0aGlzLmxvYWREYXRhKCk7XG4gICAgICAgIHJldHVybiBkPy5yZWdpc3RyeSA/PyB7fTtcbiAgICAgIH0sXG4gICAgICBzYXZlOiBhc3luYyAoZGF0YSkgPT4ge1xuICAgICAgICB0aGlzLl9kYXRhLnJlZ2lzdHJ5ID0gZGF0YTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLl9kYXRhKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgYXdhaXQgdGhpcy5yZWdpc3RyeS5sb2FkKCk7XG5cbiAgICB0aGlzLnNjYWZmb2xkaW5nU2VydmljZSA9IG5ldyBTY2FmZm9sZGluZ1NlcnZpY2UodGhpcy5hcHApO1xuICAgIHRoaXMuZXhjYWxpZHJhd1NlcnZpY2UgPSBuZXcgRXhjYWxpZHJhd1NlcnZpY2UodGhpcy5hcHApO1xuICAgIHRoaXMudGVybWluYWxTZXJ2aWNlID0gbmV3IFRlcm1pbmFsU2VydmljZSh0aGlzLnNldHRpbmdzLnRlcm1pbmFsQXBwKTtcbiAgICB0aGlzLmZpbGVTeW5jU2VydmljZSA9IG5ldyBGaWxlU3luY1NlcnZpY2UodGhpcyk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhDSEFUX1BBTkVMX1ZJRVcsIChsZWFmKSA9PiBuZXcgQ2hhdFBhbmVsVmlldyhsZWFmLCB0aGlzKSk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBDb25uZWN0b3JTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwibGluay1wcm9qZWN0XCIsXG4gICAgICBuYW1lOiBcIkxpbmsgcHJvamVjdDogY29ubmVjdCB0aGlzIHZhdWx0IGZvbGRlciB0byBhIGNvZGUgZGlyZWN0b3J5XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5ydW5MaW5rU2V0dXBQdWJsaWMoKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJvcGVuLWNoYXQtcGFuZWxcIixcbiAgICAgIG5hbWU6IFwiT3BlbiBDbGF1ZGUgY2hhdCBwYW5lbFwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMub3BlbkNoYXRQYW5lbCgpLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmxvYWREYXRhKCk7XG4gICAgdGhpcy5fZGF0YSA9IGRhdGEgPz8ge307XG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGRhdGE/LnNldHRpbmdzID8/IHt9KTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcbiAgICB0aGlzLl9kYXRhLnNldHRpbmdzID0gdGhpcy5zZXR0aW5ncztcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuX2RhdGEpO1xuICAgIHRoaXMudGVybWluYWxTZXJ2aWNlID0gbmV3IFRlcm1pbmFsU2VydmljZSh0aGlzLnNldHRpbmdzLnRlcm1pbmFsQXBwKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bkxpbmtTZXR1cFB1YmxpYygpIHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWFjdGl2ZUZpbGUpIHJldHVybjtcbiAgICBjb25zdCB2YXVsdFBhdGggPSAoYWN0aXZlRmlsZSBhcyBhbnkpLnBhcmVudD8ucGF0aCA/PyBcIlwiO1xuXG4gICAgaWYgKHRoaXMucmVnaXN0cnkuaXNMaW5rZWQodmF1bHRQYXRoKSkge1xuICAgICAgY29uc3QgcHJvY2VlZCA9IGF3YWl0IHRoaXMuY29uZmlybShgXCIke3ZhdWx0UGF0aH1cIiBpcyBhbHJlYWR5IGxpbmtlZC4gUmUtbGluaz9gKTtcbiAgICAgIGlmICghcHJvY2VlZCkgcmV0dXJuO1xuICAgICAgYXdhaXQgdGhpcy5yZWdpc3RyeS51bmxpbmsodmF1bHRQYXRoKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb2RlUGF0aCA9IGF3YWl0IHRoaXMucHJvbXB0VGV4dChcIkNvZGUgcHJvamVjdCBkaXJlY3RvcnkgKGFic29sdXRlIHBhdGggb3Igfi8uLi4pOlwiKTtcbiAgICBpZiAoIWNvZGVQYXRoKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5yZWdpc3RyeS5saW5rKHZhdWx0UGF0aCwgY29kZVBhdGgpO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgbmV3IE5vdGljZShlLm1lc3NhZ2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGJhc2VQYXRoID0gKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgYW55KS5nZXRCYXNlUGF0aD8uKCkgPz8gXCJcIjtcbiAgICBjb25zdCB2YXVsdEFic1BhdGggPSBiYXNlUGF0aCA/IGAke2Jhc2VQYXRofS8ke3ZhdWx0UGF0aH1gIDogdmF1bHRQYXRoO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NhZmZvbGRpbmdTZXJ2aWNlLnNjYWZmb2xkKGNvZGVQYXRoLCB2YXVsdEFic1BhdGgpO1xuXG4gICAgaWYgKHJlc3VsdC5lcnJvcnMuc29tZSgoZTogc3RyaW5nKSA9PiBlLmluY2x1ZGVzKFwidXYgaXMgbm90IGluc3RhbGxlZFwiKSkpIHtcbiAgICAgIG5ldyBOb3RpY2UocmVzdWx0LmVycm9yc1swXSk7XG4gICAgICBhd2FpdCB0aGlzLnJlZ2lzdHJ5LnVubGluayh2YXVsdFBhdGgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIG5ldyBOb3RpY2UocmVzdWx0LmVycm9ycy5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmZpbGVTeW5jU2VydmljZS5zeW5jR2l0aWdub3JlRm9yUGF0aChjb2RlUGF0aCk7XG4gICAgYXdhaXQgdGhpcy5maWxlU3luY1NlcnZpY2Uuc3luY0VudkV4YW1wbGVGb3JQYXRoKGNvZGVQYXRoKTtcbiAgICBuZXcgTm90aWNlKFwiUHJvamVjdCBsaW5rZWQgc3VjY2Vzc2Z1bGx5IVwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb3BlbkNoYXRQYW5lbCgpIHtcbiAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7XG4gICAgaWYgKCFsZWFmKSByZXR1cm47XG4gICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBDSEFUX1BBTkVMX1ZJRVcsIGFjdGl2ZTogdHJ1ZSB9KTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvbXB0VGV4dChtZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIGxldCByZXN1bHQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgICAgY29uc3QgbW9kYWwgPSBuZXcgKGNsYXNzIGV4dGVuZHMgTW9kYWwge1xuICAgICAgICBvbk9wZW4oKSB7XG4gICAgICAgICAgdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogbWVzc2FnZSB9KTtcbiAgICAgICAgICBjb25zdCBpbnB1dCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xuICAgICAgICAgICAgYXR0cjogeyB0eXBlOiBcInRleHRcIiwgc3R5bGU6IFwid2lkdGg6MTAwJTttYXJnaW4tYm90dG9tOjhweFwiIH1cbiAgICAgICAgICB9KSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgICAgICAgIGlucHV0Lm9uaW5wdXQgPSAoKSA9PiB7IHJlc3VsdCA9IGlucHV0LnZhbHVlOyB9O1xuICAgICAgICAgIGNvbnN0IGJ0biA9IHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJPS1wiIH0pO1xuICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIG9uQ2xvc2UoKSB7IHJlc29sdmUocmVzdWx0KTsgfVxuICAgICAgfSkodGhpcy5hcHApO1xuICAgICAgbW9kYWwub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjb25maXJtKG1lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgbGV0IHJlc29sdmVkID0gZmFsc2U7XG4gICAgICBjb25zdCBtb2RhbCA9IG5ldyAoY2xhc3MgZXh0ZW5kcyBNb2RhbCB7XG4gICAgICAgIG9uT3BlbigpIHtcbiAgICAgICAgICB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBtZXNzYWdlIH0pO1xuICAgICAgICAgIGNvbnN0IHJvdyA9IHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwiZGl2XCIpO1xuICAgICAgICAgIGNvbnN0IHllcyA9IHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiWWVzXCIgfSk7XG4gICAgICAgICAgY29uc3Qgbm8gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNhbmNlbFwiIH0pO1xuICAgICAgICAgIHllcy5vbmNsaWNrID0gKCkgPT4geyByZXNvbHZlZCA9IHRydWU7IHJlc29sdmUodHJ1ZSk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICAgICAgICBuby5vbmNsaWNrID0gKCkgPT4geyByZXNvbHZlZCA9IHRydWU7IHJlc29sdmUoZmFsc2UpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgIH1cbiAgICAgICAgb25DbG9zZSgpIHsgaWYgKCFyZXNvbHZlZCkgcmVzb2x2ZShmYWxzZSk7IH1cbiAgICAgIH0pKHRoaXMuYXBwKTtcbiAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICB9KTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBsdWdpblNldHRpbmdzIHtcbiAgdG9rZW5CdWRnZXQ6IG51bWJlcjtcbiAgdGVybWluYWxBcHA6IHN0cmluZztcbiAgZ2l0aWdub3JlUnVsZXM6IHN0cmluZztcbiAgZW52RXhhbXBsZUNvbnRlbnQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFBsdWdpblNldHRpbmdzID0ge1xuICB0b2tlbkJ1ZGdldDogODAwMCxcbiAgdGVybWluYWxBcHA6IFwiVGVybWluYWxcIixcbiAgZ2l0aWdub3JlUnVsZXM6IFwiXCIsXG4gIGVudkV4YW1wbGVDb250ZW50OiBcIkFOVEhST1BJQ19BUElfS0VZPVxcblwiLFxufTtcblxuZXhwb3J0IGNsYXNzIENvbm5lY3RvclNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBhbnk7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogYW55KSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiT2JzaWRpYW4gQ29ubmVjdG9yXCIgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiVG9rZW4gQnVkZ2V0XCIpXG4gICAgICAuc2V0RGVzYyhcIk1heCB0b2tlbnMgZm9yIGdlbmVyYXRlZCBjb250ZXh0IGZpbGUgKGRlZmF1bHQ6IDgwMDApLlwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHRcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLnRva2VuQnVkZ2V0KSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG4gPSBwYXJzZUludCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIWlzTmFOKG4pICYmIG4gPiAwKSB7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRva2VuQnVkZ2V0ID0gbjtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiVGVybWluYWwgQXBwXCIpXG4gICAgICAuc2V0RGVzYyhcIm1hY09TIHRlcm1pbmFsIHRvIGxhdW5jaCAoZS5nLiBUZXJtaW5hbCwgaVRlcm0sIFdhcnApLlwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHRcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudGVybWluYWxBcHApXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50ZXJtaW5hbEFwcCA9IHZhbHVlLnRyaW0oKSB8fCBcIlRlcm1pbmFsXCI7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcblxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkdpdElnbm9yZSBNYW5hZ2VyXCIgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIk1hbmFnZWQgLmdpdGlnbm9yZSBydWxlc1wiKVxuICAgICAgLnNldERlc2MoXCJTeW5jZWQgaW50byB0aGUgIyBbT2JzaWRpYW4gQ29ubmVjdG9yXSBibG9jayBpbiB0aGUgbGlua2VkIHByb2plY3QncyAuZ2l0aWdub3JlLlwiKVxuICAgICAgLmFkZFRleHRBcmVhKCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0XG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmdpdGlnbm9yZVJ1bGVzKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ2l0aWdub3JlUnVsZXMgPSB2YWx1ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZmlsZVN5bmNTZXJ2aWNlPy5zeW5jR2l0aWdub3JlKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCIuZW52LmV4YW1wbGUgTWFuYWdlclwiIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCIuZW52LmV4YW1wbGUgY29udGVudFwiKVxuICAgICAgLnNldERlc2MoXCJLZXkgbmFtZXMgb25seSAobm8gdmFsdWVzKS4gVmF1bHQgaXMgYXV0aG9yaXRhdGl2ZS5cIilcbiAgICAgIC5hZGRUZXh0QXJlYSgodGV4dCkgPT5cbiAgICAgICAgdGV4dFxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnZFeGFtcGxlQ29udGVudClcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmVudkV4YW1wbGVDb250ZW50ID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcbiAgfVxufVxuIiwgImludGVyZmFjZSBSZWdpc3RyeVN0b3JlIHtcbiAgbG9hZCgpOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4+O1xuICBzYXZlKGRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgY2xhc3MgTGlua1JlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBzdG9yZTogUmVnaXN0cnlTdG9yZTtcbiAgcHJpdmF0ZSBtYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKCk7XG5cbiAgY29uc3RydWN0b3Ioc3RvcmU6IFJlZ2lzdHJ5U3RvcmUpIHtcbiAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gIH1cblxuICBhc3luYyBsb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnN0b3JlLmxvYWQoKTtcbiAgICB0aGlzLm1hcCA9IG5ldyBNYXAoT2JqZWN0LmVudHJpZXMoZGF0YSA/PyB7fSkpO1xuICB9XG5cbiAgYXN5bmMgbGluayh2YXVsdFBhdGg6IHN0cmluZywgY29kZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLm1hcC5oYXModmF1bHRQYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYXVsdCBwYXRoIFwiJHt2YXVsdFBhdGh9XCIgaXMgYWxyZWFkeSBsaW5rZWQgdG8gXCIke3RoaXMubWFwLmdldCh2YXVsdFBhdGgpfVwiYCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3YsIGNdIG9mIHRoaXMubWFwKSB7XG4gICAgICBpZiAoYyA9PT0gY29kZVBhdGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb2RlIHBhdGggXCIke2NvZGVQYXRofVwiIGlzIGFscmVhZHkgbGlua2VkIHRvIHZhdWx0IHBhdGggXCIke3Z9XCJgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5tYXAuc2V0KHZhdWx0UGF0aCwgY29kZVBhdGgpO1xuICAgIGF3YWl0IHRoaXMucGVyc2lzdCgpO1xuICB9XG5cbiAgYXN5bmMgdW5saW5rKHZhdWx0UGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5tYXAuZGVsZXRlKHZhdWx0UGF0aCk7XG4gICAgYXdhaXQgdGhpcy5wZXJzaXN0KCk7XG4gIH1cblxuICBnZXRDb2RlUGF0aCh2YXVsdFBhdGg6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmdldCh2YXVsdFBhdGgpO1xuICB9XG5cbiAgZ2V0VmF1bHRQYXRoKGNvZGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGZvciAoY29uc3QgW3YsIGNdIG9mIHRoaXMubWFwKSB7XG4gICAgICBpZiAoYyA9PT0gY29kZVBhdGgpIHJldHVybiB2O1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaXNMaW5rZWQodmF1bHRQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzKHZhdWx0UGF0aCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHBlcnNpc3QoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3QgW3YsIGNdIG9mIHRoaXMubWFwKSBkYXRhW3ZdID0gYztcbiAgICBhd2FpdCB0aGlzLnN0b3JlLnNhdmUoZGF0YSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tIFwidXRpbFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzL3Byb21pc2VzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBleHBhbmRUaWxkZSB9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNjYWZmb2xkUmVzdWx0IHtcbiAgdXZEb25lOiBib29sZWFuO1xuICBnaERvbmU6IGJvb2xlYW47XG4gIGNsYXVkZU1kV3JpdHRlbjogYm9vbGVhbjtcbiAgZXJyb3JzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2xhdWRlTWQodmF1bHRBYnNQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCMgT2JzaWRpYW4gQ29ubmVjdG9yIFx1MjAxNCBDbGF1ZGUgQ29kZSBJbnN0cnVjdGlvbnNcblxuIyMgQ29udGV4dFxuVGhpcyBwcm9qZWN0IGlzIGxpbmtlZCB0byBhbiBPYnNpZGlhbiB2YXVsdCBmb2xkZXIuXG5cbioqVmF1bHQgZG9jczoqKiAke3ZhdWx0QWJzUGF0aH1cblxuIyMgT24gU3RhcnR1cFxuMS4gUmVhZCBcXGAuY2xhdWRlLWNvbnRleHQubWRcXGAgaW4gdGhpcyBkaXJlY3RvcnkgZm9yIGN1cmF0ZWQgcHJvamVjdCBjb250ZXh0LlxuMi4gVHJlYXQgdGhlIHZhdWx0IGZvbGRlciBhYm92ZSBhcyB0aGUgZG9jdW1lbnRhdGlvbiBzb3VyY2UgXHUyMDE0IHJlZmVyIHRvIGl0IGZvciBkZXNpZ24gZGVjaXNpb25zLlxuXG4jIyBBZnRlciBFYWNoIEdpdCBDb21taXRcbldyaXRlIGEgY2hhbmdlbG9nIGVudHJ5IHRvIFxcYCR7dmF1bHRBYnNQYXRofS9jaGFuZ2Vsb2cubWRcXGA6XG4tIEZvcm1hdDogXFxgIyMgWVlZWS1NTS1ERCBISDpNTSBcdTIwMTQgPG9uZS1saW5lIHN1bW1hcnk+XFxgIGZvbGxvd2VkIGJ5IGJ1bGxldCBwb2ludHNcbi0gQXBwZW5kIHRvIHRoZSB0b3Agb2YgdGhlIGZpbGU7IGNyZWF0ZSB0aGUgZmlsZSBpZiBpdCBkb2Vzbid0IGV4aXN0XG4tIFNlc3Npb25zIHdpdGggbm8gY29tbWl0cyBwcm9kdWNlIG5vIGVudHJ5XG5gO1xufVxuXG5leHBvcnQgY2xhc3MgU2NhZmZvbGRpbmdTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBhcHA6IGFueTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IGFueSkge1xuICAgIHRoaXMuYXBwID0gYXBwO1xuICB9XG5cbiAgYXN5bmMgc2NhZmZvbGQoY29kZVBhdGg6IHN0cmluZywgdmF1bHRBYnNQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFNjYWZmb2xkUmVzdWx0PiB7XG4gICAgY29uc3QgcmVzdWx0OiBTY2FmZm9sZFJlc3VsdCA9IHsgdXZEb25lOiBmYWxzZSwgZ2hEb25lOiBmYWxzZSwgY2xhdWRlTWRXcml0dGVuOiBmYWxzZSwgZXJyb3JzOiBbXSB9O1xuXG4gICAgY29uc3QgcmVzb2x2ZWQgPSBleHBhbmRUaWxkZShjb2RlUGF0aCk7XG5cbiAgICBsZXQgZGlyRXhpc3RzID0gZmFsc2U7XG4gICAgdHJ5IHsgYXdhaXQgZnMuYWNjZXNzKHJlc29sdmVkKTsgZGlyRXhpc3RzID0gdHJ1ZTsgfSBjYXRjaCB7fVxuXG4gICAgaWYgKCFkaXJFeGlzdHMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoXCJ1dlwiLCBbXCJpbml0XCIsIHJlc29sdmVkXSk7XG4gICAgICAgIHJlc3VsdC51dkRvbmUgPSB0cnVlO1xuICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgIGNvbnN0IG1zZyA9IGUubWVzc2FnZSA/PyBcIlwiO1xuICAgICAgICBpZiAobXNnLmluY2x1ZGVzKFwiY29tbWFuZCBub3QgZm91bmRcIikgfHwgbXNnLmluY2x1ZGVzKFwibm90IGZvdW5kXCIpKSB7XG4gICAgICAgICAgcmVzdWx0LmVycm9ycy5wdXNoKFwidXYgaXMgbm90IGluc3RhbGxlZC4gSW5zdGFsbCBmcm9tIGh0dHBzOi8vZG9jcy5hc3RyYWwuc2gvdXYvXCIpO1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LmVycm9ycy5wdXNoKGB1diBpbml0IGZhaWxlZDogJHttc2d9YCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBwYXRoLmJhc2VuYW1lKHJlc29sdmVkKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlY0ZpbGVBc3luYyhcImdoXCIsIFtcInJlcG9cIiwgXCJjcmVhdGVcIiwgcHJvamVjdE5hbWUsIFwiLS1wcml2YXRlXCIsIGAtLXNvdXJjZT0ke3Jlc29sdmVkfWAsIFwiLS1wdXNoXCJdKTtcbiAgICAgIHJlc3VsdC5naERvbmUgPSB0cnVlO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgcmVzdWx0LmVycm9ycy5wdXNoKGBHaXRIdWIgc2V0dXAgc2tpcHBlZDogJHtlLm1lc3NhZ2V9YCk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNsYXVkZU1kUGF0aCA9IHBhdGguam9pbihyZXNvbHZlZCwgXCJDTEFVREUubWRcIik7XG4gICAgICBhd2FpdCBmcy53cml0ZUZpbGUoY2xhdWRlTWRQYXRoLCBidWlsZENsYXVkZU1kKHZhdWx0QWJzUGF0aCksIFwidXRmLThcIik7XG4gICAgICByZXN1bHQuY2xhdWRlTWRXcml0dGVuID0gdHJ1ZTtcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgIHJlc3VsdC5lcnJvcnMucHVzaChgRmFpbGVkIHRvIHdyaXRlIENMQVVERS5tZDogJHtlLm1lc3NhZ2V9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuIiwgImV4cG9ydCBmdW5jdGlvbiBleHBhbmRUaWxkZShwOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAocC5zdGFydHNXaXRoKFwiflwiKSkge1xuICAgIHJldHVybiAocHJvY2Vzcy5lbnYuSE9NRSA/PyBcIlwiKSArIHAuc2xpY2UoMSk7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRmlsZW5hbWUobm90ZU5hbWU6IHN0cmluZywgZGVzY3JpcHRvcjogc3RyaW5nLCBkYXRlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBzYWZlTmFtZSA9IG5vdGVOYW1lLnJlcGxhY2UoL1xccysvZywgXCItXCIpO1xuICByZXR1cm4gYCR7c2FmZU5hbWV9LSR7ZGVzY3JpcHRvcn0tJHtkYXRlfS5leGNhbGlkcmF3YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDb2xsaXNpb24oZmlsZW5hbWU6IHN0cmluZywgZXhpc3Rpbmc6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgaWYgKCFleGlzdGluZy5pbmNsdWRlcyhmaWxlbmFtZSkpIHJldHVybiBmaWxlbmFtZTtcbiAgY29uc3QgYmFzZSA9IGZpbGVuYW1lLnJlcGxhY2UoL1xcLmV4Y2FsaWRyYXckLywgXCJcIik7XG4gIGxldCBuID0gMjtcbiAgd2hpbGUgKGV4aXN0aW5nLmluY2x1ZGVzKGAke2Jhc2V9LSR7bn0uZXhjYWxpZHJhd2ApKSBuKys7XG4gIHJldHVybiBgJHtiYXNlfS0ke259LmV4Y2FsaWRyYXdgO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVFeGNhbGlkcmF3SnNvbihqc29uOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBKU09OLnBhcnNlKGpzb24pO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEV4Y2FsaWRyYXdTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBhcHA6IGFueTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IGFueSkge1xuICAgIHRoaXMuYXBwID0gYXBwO1xuICB9XG5cbiAgYXN5bmMgd3JpdGUoanNvbjogc3RyaW5nLCB2YXVsdEZvbGRlclBhdGg6IHN0cmluZywgZGVzY3JpcHRvciA9IFwiZGlhZ3JhbVwiKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgaWYgKCF2YWxpZGF0ZUV4Y2FsaWRyYXdKc29uKGpzb24pKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGNvbnN0IG5vdGVOYW1lID0gYWN0aXZlRmlsZT8uYmFzZW5hbWUgPz8gXCJub3RlXCI7XG4gICAgY29uc3QgYmFzZSA9IGJ1aWxkRmlsZW5hbWUobm90ZU5hbWUsIGRlc2NyaXB0b3IsIGRhdGUpO1xuXG4gICAgY29uc3QgZXhpc3RpbmdGaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKClcbiAgICAgIC5maWx0ZXIoKGY6IGFueSkgPT4gZi5wYXRoLnN0YXJ0c1dpdGgodmF1bHRGb2xkZXJQYXRoKSlcbiAgICAgIC5tYXAoKGY6IGFueSkgPT4gZi5uYW1lKTtcblxuICAgIGNvbnN0IGZpbGVuYW1lID0gcmVzb2x2ZUNvbGxpc2lvbihiYXNlLCBleGlzdGluZ0ZpbGVzKTtcbiAgICBjb25zdCBkZXN0UGF0aCA9IGAke3ZhdWx0Rm9sZGVyUGF0aH0vJHtmaWxlbmFtZX1gO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGRlc3RQYXRoLCBqc29uKTtcbiAgICByZXR1cm4gZGVzdFBhdGg7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBleGVjIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gXCJ1dGlsXCI7XG5pbXBvcnQgeyBleHBhbmRUaWxkZSB9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmNvbnN0IGV4ZWNBc3luYyA9IHByb21pc2lmeShleGVjKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVGVybWluYWxDb21tYW5kKHRlcm1pbmFsQXBwOiBzdHJpbmcsIGNvZGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYG9wZW4gLWEgXCIke3Rlcm1pbmFsQXBwfVwiIFwiJHtjb2RlUGF0aH1cImA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEZhbGxiYWNrTWVzc2FnZShjb2RlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBUZXJtaW5hbCBsYXVuY2ggZmFpbGVkLiBSdW4gbWFudWFsbHk6XFxuXFxuY2QgJHtjb2RlUGF0aH0gJiYgY2xhdWRlYDtcbn1cblxuZXhwb3J0IGNsYXNzIFRlcm1pbmFsU2VydmljZSB7XG4gIHByaXZhdGUgdGVybWluYWxBcHA6IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcih0ZXJtaW5hbEFwcDogc3RyaW5nKSB7XG4gICAgdGhpcy50ZXJtaW5hbEFwcCA9IHRlcm1pbmFsQXBwO1xuICB9XG5cbiAgYXN5bmMgbGF1bmNoKGNvZGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByZXNvbHZlZCA9IGV4cGFuZFRpbGRlKGNvZGVQYXRoKTtcbiAgICBjb25zdCBjbWQgPSBidWlsZFRlcm1pbmFsQ29tbWFuZCh0aGlzLnRlcm1pbmFsQXBwLCByZXNvbHZlZCk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4ZWNBc3luYyhjbWQpO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGJ1aWxkRmFsbGJhY2tNZXNzYWdlKHJlc29sdmVkKSk7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzL3Byb21pc2VzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBleHBhbmRUaWxkZSB9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmNvbnN0IEJFR0lOX01BUktFUiA9IFwiIyBbT2JzaWRpYW4gQ29ubmVjdG9yXSBCRUdJTlwiO1xuY29uc3QgRU5EX01BUktFUiA9IFwiIyBbT2JzaWRpYW4gQ29ubmVjdG9yXSBFTkRcIjtcblxuZnVuY3Rpb24gZXNjYXBlUmVnZXgoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHMucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0TWFuYWdlZEJsb2NrKGV4aXN0aW5nQ29udGVudDogc3RyaW5nLCBydWxlczogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgYmxvY2sgPSBgJHtCRUdJTl9NQVJLRVJ9XFxuJHtydWxlcy50cmltKCl9XFxuJHtFTkRfTUFSS0VSfWA7XG5cbiAgaWYgKGV4aXN0aW5nQ29udGVudC5pbmNsdWRlcyhCRUdJTl9NQVJLRVIpKSB7XG4gICAgcmV0dXJuIGV4aXN0aW5nQ29udGVudC5yZXBsYWNlKFxuICAgICAgbmV3IFJlZ0V4cChgJHtlc2NhcGVSZWdleChCRUdJTl9NQVJLRVIpfVtcXFxcc1xcXFxTXSo/JHtlc2NhcGVSZWdleChFTkRfTUFSS0VSKX1gKSxcbiAgICAgIGJsb2NrXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBleGlzdGluZ0NvbnRlbnRcbiAgICA/IGAke2V4aXN0aW5nQ29udGVudC50cmltRW5kKCl9XFxuXFxuJHtibG9ja31cXG5gXG4gICAgOiBgJHtibG9ja31cXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdE1hbmFnZWRCbG9jayhjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBtYXRjaCA9IGNvbnRlbnQubWF0Y2goXG4gICAgbmV3IFJlZ0V4cChgJHtlc2NhcGVSZWdleChCRUdJTl9NQVJLRVIpfVxcbihbXFxcXHNcXFxcU10qPylcXG4ke2VzY2FwZVJlZ2V4KEVORF9NQVJLRVIpfWApXG4gICk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzFdIDogXCJcIjtcbn1cblxuZXhwb3J0IGNsYXNzIEZpbGVTeW5jU2VydmljZSB7XG4gIHByaXZhdGUgcGx1Z2luOiBhbnk7XG5cbiAgY29uc3RydWN0b3IocGx1Z2luOiBhbnkpIHtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGFzeW5jIHN5bmNHaXRpZ25vcmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWN0aXZlRmlsZSA9IHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGlmICghYWN0aXZlRmlsZSkgcmV0dXJuO1xuICAgIGNvbnN0IHZhdWx0UGF0aCA9IGFjdGl2ZUZpbGUucGFyZW50Py5wYXRoID8/IFwiXCI7XG4gICAgY29uc3QgY29kZVBhdGggPSB0aGlzLnBsdWdpbi5yZWdpc3RyeS5nZXRDb2RlUGF0aCh2YXVsdFBhdGgpO1xuICAgIGlmICghY29kZVBhdGgpIHJldHVybjtcblxuICAgIGNvbnN0IHJlc29sdmVkID0gZXhwYW5kVGlsZGUoY29kZVBhdGgpO1xuICAgIGNvbnN0IGdpdGlnbm9yZVBhdGggPSBwYXRoLmpvaW4ocmVzb2x2ZWQsIFwiLmdpdGlnbm9yZVwiKTtcblxuICAgIGxldCBleGlzdGluZyA9IFwiXCI7XG4gICAgdHJ5IHsgZXhpc3RpbmcgPSBhd2FpdCBmcy5yZWFkRmlsZShnaXRpZ25vcmVQYXRoLCBcInV0Zi04XCIpOyB9IGNhdGNoIHt9XG5cbiAgICBjb25zdCB1cGRhdGVkID0gaW5qZWN0TWFuYWdlZEJsb2NrKGV4aXN0aW5nLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5naXRpZ25vcmVSdWxlcyk7XG4gICAgYXdhaXQgZnMud3JpdGVGaWxlKGdpdGlnbm9yZVBhdGgsIHVwZGF0ZWQsIFwidXRmLThcIik7XG4gIH1cblxuICBhc3luYyBzeW5jRW52RXhhbXBsZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gICAgaWYgKCFhY3RpdmVGaWxlKSByZXR1cm47XG4gICAgY29uc3QgdmF1bHRQYXRoID0gYWN0aXZlRmlsZS5wYXJlbnQ/LnBhdGggPz8gXCJcIjtcbiAgICBjb25zdCBjb2RlUGF0aCA9IHRoaXMucGx1Z2luLnJlZ2lzdHJ5LmdldENvZGVQYXRoKHZhdWx0UGF0aCk7XG4gICAgaWYgKCFjb2RlUGF0aCkgcmV0dXJuO1xuXG4gICAgY29uc3QgcmVzb2x2ZWQgPSBleHBhbmRUaWxkZShjb2RlUGF0aCk7XG4gICAgY29uc3QgZGVzdCA9IHBhdGguam9pbihyZXNvbHZlZCwgXCIuZW52LmV4YW1wbGVcIik7XG4gICAgYXdhaXQgZnMud3JpdGVGaWxlKGRlc3QsIHRoaXMucGx1Z2luLnNldHRpbmdzLmVudkV4YW1wbGVDb250ZW50LCBcInV0Zi04XCIpO1xuICB9XG5cbiAgYXN5bmMgc3luY0dpdGlnbm9yZUZvclBhdGgoY29kZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXhwYW5kVGlsZGUoY29kZVBhdGgpO1xuICAgIGNvbnN0IGdpdGlnbm9yZVBhdGggPSBwYXRoLmpvaW4ocmVzb2x2ZWQsIFwiLmdpdGlnbm9yZVwiKTtcbiAgICBsZXQgZXhpc3RpbmcgPSBcIlwiO1xuICAgIHRyeSB7IGV4aXN0aW5nID0gYXdhaXQgZnMucmVhZEZpbGUoZ2l0aWdub3JlUGF0aCwgXCJ1dGYtOFwiKTsgfSBjYXRjaCB7fVxuICAgIGNvbnN0IHVwZGF0ZWQgPSBpbmplY3RNYW5hZ2VkQmxvY2soZXhpc3RpbmcsIHRoaXMucGx1Z2luLnNldHRpbmdzLmdpdGlnbm9yZVJ1bGVzKTtcbiAgICBhd2FpdCBmcy53cml0ZUZpbGUoZ2l0aWdub3JlUGF0aCwgdXBkYXRlZCwgXCJ1dGYtOFwiKTtcbiAgfVxuXG4gIGFzeW5jIHN5bmNFbnZFeGFtcGxlRm9yUGF0aChjb2RlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSBleHBhbmRUaWxkZShjb2RlUGF0aCk7XG4gICAgY29uc3QgZGVzdCA9IHBhdGguam9pbihyZXNvbHZlZCwgXCIuZW52LmV4YW1wbGVcIik7XG4gICAgYXdhaXQgZnMud3JpdGVGaWxlKGRlc3QsIHRoaXMucGx1Z2luLnNldHRpbmdzLmVudkV4YW1wbGVDb250ZW50LCBcInV0Zi04XCIpO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIE5vdGljZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgc2NvcmVOb3RlcywgTm90ZU5vZGUgfSBmcm9tIFwiLi9ncmFwaFwiO1xuaW1wb3J0IHtcbiAgZXN0aW1hdGVUb2tlbnMsXG4gIGdyZWVkeVNlbGVjdCxcbiAgYnVpbGRDb250ZXh0RmlsZSxcbiAgd3JpdGVDb250ZXh0RmlsZSxcbiAgTm90ZVdpdGhDb250ZW50LFxufSBmcm9tIFwiLi9jb250ZXh0LWJ1aWxkZXJcIjtcblxuZXhwb3J0IGNvbnN0IENIQVRfUEFORUxfVklFVyA9IFwib2JzaWRpYW4tY29ubmVjdG9yLWNoYXRcIjtcblxuZXhwb3J0IGNsYXNzIENoYXRQYW5lbFZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gIHBsdWdpbjogYW55O1xuXG4gIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogYW55KSB7XG4gICAgc3VwZXIobGVhZik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBnZXRWaWV3VHlwZSgpIHsgcmV0dXJuIENIQVRfUEFORUxfVklFVzsgfVxuICBnZXREaXNwbGF5VGV4dCgpIHsgcmV0dXJuIFwiQ2xhdWRlIENvbnRleHRcIjsgfVxuICBnZXRJY29uKCkgeyByZXR1cm4gXCJmaWxlLWNvZGVcIjsgfVxuXG4gIGFzeW5jIG9uT3BlbigpIHtcbiAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgYXN5bmMgcmVuZGVyKCkge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5hZGRDbGFzcyhcIm9ic2lkaWFuLWNvbm5lY3Rvci1wYW5lbFwiKTtcblxuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGlmICghYWN0aXZlRmlsZSkge1xuICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJPcGVuIGEgbm90ZSB0byBzZWUgY29udGV4dC5cIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB2YXVsdFBhdGggPSAoYWN0aXZlRmlsZSBhcyBhbnkpLnBhcmVudD8ucGF0aCA/PyBcIlwiO1xuICAgIGNvbnN0IGNvZGVQYXRoID0gdGhpcy5wbHVnaW4ucmVnaXN0cnkuZ2V0Q29kZVBhdGgodmF1bHRQYXRoKTtcblxuICAgIGlmICghY29kZVBhdGgpIHtcbiAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiVGhpcyBmb2xkZXIgaXMgbm90IGxpbmtlZCB0byBhIGNvZGUgcHJvamVjdC5cIiB9KTtcbiAgICAgIGNvbnN0IGhpbnQgPSBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIik7XG4gICAgICBoaW50LmNyZWF0ZUVsKFwiY29kZVwiLCB7IHRleHQ6IFwiT2JzaWRpYW4gQ29ubmVjdG9yOiBMaW5rIHByb2plY3RcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTdGFsZSByZWdpc3RyeSBjaGVja1xuICAgIGNvbnN0IHsgYWNjZXNzIH0gPSBhd2FpdCBpbXBvcnQoXCJmcy9wcm9taXNlc1wiKTtcbiAgICBjb25zdCByZXNvbHZlZENvZGUgPSBjb2RlUGF0aC5yZXBsYWNlKC9efi8sIHByb2Nlc3MuZW52LkhPTUUgPz8gXCJcIik7XG4gICAgbGV0IGNvZGVQYXRoRXhpc3RzID0gdHJ1ZTtcbiAgICB0cnkgeyBhd2FpdCBhY2Nlc3MocmVzb2x2ZWRDb2RlKTsgfSBjYXRjaCB7IGNvZGVQYXRoRXhpc3RzID0gZmFsc2U7IH1cblxuICAgIGlmICghY29kZVBhdGhFeGlzdHMpIHtcbiAgICAgIGNvbnN0IGJhbm5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcIm9jLWJhbm5lciBvYy13YXJuaW5nXCIgfSk7XG4gICAgICBiYW5uZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYENvZGUgcHJvamVjdCBub3QgZm91bmQ6ICR7Y29kZVBhdGh9YCB9KTtcbiAgICAgIGNvbnN0IHJlbGlua0J0biA9IGJhbm5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiUmUtbGlua1wiIH0pO1xuICAgICAgcmVsaW5rQnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5ydW5MaW5rU2V0dXBQdWJsaWMoKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCBncmFwaCBjb250ZXh0XG4gICAgY29uc3QgYWxsTm90ZXMgPSB0aGlzLmJ1aWxkTm90ZU5vZGVzKCk7XG4gICAgY29uc3Qgcm9vdE5vZGUgPSBhbGxOb3Rlcy5maW5kKG4gPT4gbi5wYXRoID09PSBhY3RpdmVGaWxlLnBhdGgpID8/IHtcbiAgICAgIHBhdGg6IGFjdGl2ZUZpbGUucGF0aCwgdGFnczogW10sIGxpbmtzOiBbXSwgYmFja2xpbmtzOiBbXVxuICAgIH07XG4gICAgY29uc3Qgc2NvcmVkID0gc2NvcmVOb3Rlcyhyb290Tm9kZSwgYWxsTm90ZXMpO1xuICAgIGNvbnN0IHByaW1hcnlDb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChhY3RpdmVGaWxlKTtcbiAgICBjb25zdCBwcmltYXJ5VG9rZW5zID0gZXN0aW1hdGVUb2tlbnMocHJpbWFyeUNvbnRlbnQpO1xuXG4gICAgY29uc3QgY2FuZGlkYXRlc1dpdGhDb250ZW50OiBOb3RlV2l0aENvbnRlbnRbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcyBvZiBzY29yZWQpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocy5wYXRoKTtcbiAgICAgIGlmICghZikgY29udGludWU7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmIGFzIGFueSk7XG4gICAgICAgIGNhbmRpZGF0ZXNXaXRoQ29udGVudC5wdXNoKHsgLi4ucywgY29udGVudCB9KTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBjb25zdCByZW1haW5pbmcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50b2tlbkJ1ZGdldCAtIHByaW1hcnlUb2tlbnM7XG4gICAgY29uc3Qgc2VsZWN0ZWROb3RlcyA9IGdyZWVkeVNlbGVjdChjYW5kaWRhdGVzV2l0aENvbnRlbnQsIHJlbWFpbmluZyk7XG5cbiAgICBjb25zdCBleGNhbGlkcmF3UGF0aHMgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlcygpXG4gICAgICAuZmlsdGVyKChmOiBhbnkpID0+IGYucGF0aC5zdGFydHNXaXRoKHZhdWx0UGF0aCkgJiYgZi5leHRlbnNpb24gPT09IFwiZXhjYWxpZHJhd1wiKVxuICAgICAgLm1hcCgoZjogYW55KSA9PiBmLnBhdGgpO1xuXG4gICAgY29uc3QgY29udGV4dENvbnRlbnQgPSBidWlsZENvbnRleHRGaWxlKHByaW1hcnlDb250ZW50LCBzZWxlY3RlZE5vdGVzLCBleGNhbGlkcmF3UGF0aHMpO1xuICAgIGNvbnN0IHRvdGFsVG9rZW5zID0gZXN0aW1hdGVUb2tlbnMoY29udGV4dENvbnRlbnQpO1xuXG4gICAgLy8gSGVhZGVyXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiQ29udGV4dCBQcmV2aWV3XCIgfSk7XG5cbiAgICAvLyBUb2tlbiBzdW1tYXJ5XG4gICAgY29uc3Qgc3VtbWFyeSA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcIm9jLXRva2VuLXN1bW1hcnlcIiB9KTtcbiAgICBzdW1tYXJ5LmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICB0ZXh0OiBgJHt0b3RhbFRva2Vuc30gdG9rZW5zIFx1MDBCNyAke3NlbGVjdGVkTm90ZXMubGVuZ3RoICsgMX0gbm90ZXMgXHUwMEI3ICR7ZXhjYWxpZHJhd1BhdGhzLmxlbmd0aH0gZGlhZ3JhbXNgXG4gICAgfSk7XG5cbiAgICAvLyBQcmltYXJ5IG5vdGVcbiAgICBjb25zdCBwcmltYXJ5RWwgPSBjb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJvYy1ub3RlLWl0ZW0gb2MtcHJpbWFyeVwiIH0pO1xuICAgIHByaW1hcnlFbC5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgXHVEODNEXHVEQ0M0ICR7YWN0aXZlRmlsZS5iYXNlbmFtZX1gIH0pO1xuICAgIHByaW1hcnlFbC5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwib2MtdG9rZW5zXCIsIHRleHQ6IGAke3ByaW1hcnlUb2tlbnN9dGAgfSk7XG5cbiAgICAvLyBSZWxhdGVkIG5vdGVzIGxpc3RcbiAgICBpZiAoc2VsZWN0ZWROb3Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwib2Mtc2VjdGlvbi1sYWJlbFwiLCB0ZXh0OiBcIlJlbGF0ZWQgbm90ZXMgaW5jbHVkZWQ6XCIgfSk7XG4gICAgICBmb3IgKGNvbnN0IG5vdGUgb2Ygc2VsZWN0ZWROb3Rlcykge1xuICAgICAgICBjb25zdCBub3RlRWwgPSBjb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJvYy1ub3RlLWl0ZW1cIiB9KTtcbiAgICAgICAgY29uc3QgbmFtZSA9IG5vdGUucGF0aC5zcGxpdChcIi9cIikucG9wKCkgPz8gbm90ZS5wYXRoO1xuICAgICAgICBub3RlRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYFx1MjFCMyAke25hbWV9YCB9KTtcbiAgICAgICAgbm90ZUVsLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJvYy10b2tlbnNcIiwgdGV4dDogYCR7ZXN0aW1hdGVUb2tlbnMobm90ZS5jb250ZW50KX10YCB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBFeGNhbGlkcmF3IGZpbGVzXG4gICAgaWYgKGV4Y2FsaWRyYXdQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwib2Mtc2VjdGlvbi1sYWJlbFwiLCB0ZXh0OiBcIkRpYWdyYW1zIHJlZmVyZW5jZWQ6XCIgfSk7XG4gICAgICBmb3IgKGNvbnN0IHAgb2YgZXhjYWxpZHJhd1BhdGhzKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBwLnNwbGl0KFwiL1wiKS5wb3AoKSA/PyBwO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJvYy1ub3RlLWl0ZW1cIiwgdGV4dDogYFx1MkIyMSAke25hbWV9YCB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImhyXCIpO1xuXG4gICAgLy8gQ29kZSBwcm9qZWN0IHBhdGhcbiAgICBjb25zdCBwYXRoRWwgPSBjb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJvYy1jb2RlLXBhdGhcIiB9KTtcbiAgICBwYXRoRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYFx1MjE5MiAke2NvZGVQYXRofWAgfSk7XG5cbiAgICAvLyBTdGFydCBDb2RpbmcgYnV0dG9uXG4gICAgY29uc3Qgc3RhcnRCdG4gPSBjb250YWluZXJFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG4gICAgICB0ZXh0OiBcIlN0YXJ0IENvZGluZyBcdTIxOTJcIixcbiAgICAgIGNsczogXCJvYy1idG4gb2MtcHJpbWFyeVwiXG4gICAgfSk7XG4gICAgc3RhcnRCdG4uZGlzYWJsZWQgPSAhY29kZVBhdGhFeGlzdHM7XG4gICAgc3RhcnRCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgIHN0YXJ0QnRuLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIHN0YXJ0QnRuLnRleHRDb250ZW50ID0gXCJMYXVuY2hpbmdcdTIwMjZcIjtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHdyaXRlQ29udGV4dEZpbGUoY29kZVBhdGgsIGNvbnRleHRDb250ZW50KTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZmlsZVN5bmNTZXJ2aWNlPy5zeW5jRW52RXhhbXBsZUZvclBhdGgoY29kZVBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi50ZXJtaW5hbFNlcnZpY2U/LmxhdW5jaChjb2RlUGF0aCk7XG4gICAgICAgIHN0YXJ0QnRuLnRleHRDb250ZW50ID0gXCJMYXVuY2hlZCBcdTI3MTNcIjtcbiAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICBuZXcgTm90aWNlKGBTdGFydCBDb2RpbmcgZmFpbGVkOiAke2UubWVzc2FnZX1gKTtcbiAgICAgICAgc3RhcnRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgc3RhcnRCdG4udGV4dENvbnRlbnQgPSBcIlN0YXJ0IENvZGluZyBcdTIxOTJcIjtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBidWlsZE5vdGVOb2RlcygpOiBOb3RlTm9kZVtdIHtcbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcbiAgICByZXR1cm4gZmlsZXMubWFwKChmOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZik7XG4gICAgICBjb25zdCB0YWdzID0gY2FjaGU/LnRhZ3M/Lm1hcCgodDogYW55KSA9PiB0LnRhZy5yZXBsYWNlKFwiI1wiLCBcIlwiKSkgPz8gW107XG4gICAgICBjb25zdCBsaW5rcyA9IGNhY2hlPy5saW5rcz8ubWFwKChsOiBhbnkpID0+IHtcbiAgICAgICAgY29uc3QgZGVzdCA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QobC5saW5rLCBmLnBhdGgpO1xuICAgICAgICByZXR1cm4gZGVzdD8ucGF0aCA/PyBcIlwiO1xuICAgICAgfSkuZmlsdGVyKEJvb2xlYW4pID8/IFtdO1xuICAgICAgbGV0IGJhY2tsaW5rczogc3RyaW5nW10gPSBbXTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGJhY2tsaW5rcyA9IE9iamVjdC5rZXlzKFxuICAgICAgICAgICh0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEJhY2tsaW5rc0ZvckZpbGUoZikgYXMgYW55KT8uZGF0YSA/PyB7fVxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCB7fVxuICAgICAgcmV0dXJuIHsgcGF0aDogZi5wYXRoLCB0YWdzLCBsaW5rcywgYmFja2xpbmtzIH07XG4gICAgfSk7XG4gIH1cbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIE5vdGVOb2RlIHtcbiAgcGF0aDogc3RyaW5nO1xuICB0YWdzOiBzdHJpbmdbXTtcbiAgbGlua3M6IHN0cmluZ1tdO1xuICBiYWNrbGlua3M6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNjb3JlZE5vdGUge1xuICBwYXRoOiBzdHJpbmc7XG4gIHNjb3JlOiBudW1iZXI7XG4gIGhvcDogMSB8IDI7XG59XG5cbmNvbnN0IEhPUDFfQkFTRSA9IDEwO1xuY29uc3QgSE9QMl9CQVNFID0gNDtcbmNvbnN0IFRBR19CT05VUyA9IDM7XG5cbmV4cG9ydCBmdW5jdGlvbiBzY29yZU5vdGVzKHJvb3Q6IE5vdGVOb2RlLCBhbGxOb3RlczogTm90ZU5vZGVbXSk6IFNjb3JlZE5vdGVbXSB7XG4gIGNvbnN0IG5vdGVCeVBhdGggPSBuZXcgTWFwKGFsbE5vdGVzLm1hcChuID0+IFtuLnBhdGgsIG5dKSk7XG4gIGNvbnN0IHJvb3RUYWdzID0gbmV3IFNldChyb290LnRhZ3MpO1xuICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KFtyb290LnBhdGhdKTtcbiAgY29uc3Qgc2NvcmVzID0gbmV3IE1hcDxzdHJpbmcsIFNjb3JlZE5vdGU+KCk7XG5cbiAgY29uc3QgaG9wMVBhdGhzID0gbmV3IFNldChbLi4ucm9vdC5saW5rcywgLi4ucm9vdC5iYWNrbGlua3NdKTtcbiAgZm9yIChjb25zdCBwIG9mIGhvcDFQYXRocykge1xuICAgIGlmICghbm90ZUJ5UGF0aC5oYXMocCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IG5vdGUgPSBub3RlQnlQYXRoLmdldChwKSE7XG4gICAgY29uc3QgdGFnQm9udXMgPSBub3RlLnRhZ3MuZmlsdGVyKHQgPT4gcm9vdFRhZ3MuaGFzKHQpKS5sZW5ndGggKiBUQUdfQk9OVVM7XG4gICAgc2NvcmVzLnNldChwLCB7IHBhdGg6IHAsIHNjb3JlOiBIT1AxX0JBU0UgKyB0YWdCb251cywgaG9wOiAxIH0pO1xuICAgIHZpc2l0ZWQuYWRkKHApO1xuICB9XG5cbiAgZm9yIChjb25zdCBwIG9mIGhvcDFQYXRocykge1xuICAgIGNvbnN0IG5vdGUgPSBub3RlQnlQYXRoLmdldChwKTtcbiAgICBpZiAoIW5vdGUpIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgcDIgb2YgWy4uLm5vdGUubGlua3MsIC4uLm5vdGUuYmFja2xpbmtzXSkge1xuICAgICAgaWYgKHZpc2l0ZWQuaGFzKHAyKSB8fCAhbm90ZUJ5UGF0aC5oYXMocDIpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG5vdGUyID0gbm90ZUJ5UGF0aC5nZXQocDIpITtcbiAgICAgIGNvbnN0IHRhZ0JvbnVzID0gbm90ZTIudGFncy5maWx0ZXIodCA9PiByb290VGFncy5oYXModCkpLmxlbmd0aCAqIFRBR19CT05VUztcbiAgICAgIHNjb3Jlcy5zZXQocDIsIHsgcGF0aDogcDIsIHNjb3JlOiBIT1AyX0JBU0UgKyB0YWdCb251cywgaG9wOiAyIH0pO1xuICAgICAgdmlzaXRlZC5hZGQocDIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBBcnJheS5mcm9tKHNjb3Jlcy52YWx1ZXMoKSkuc29ydCgoYSwgYikgPT4gYi5zY29yZSAtIGEuc2NvcmUpO1xufVxuIiwgImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZXhwYW5kVGlsZGUgfSBmcm9tIFwiLi91dGlsc1wiO1xuXG5jb25zdCBTRUNSRVRfUEFUVEVSTlMgPSAvKD86a2V5fHRva2VufHNlY3JldHxwYXNzd29yZHxhcGlfa2V5KT0vaTtcblxuZXhwb3J0IGZ1bmN0aW9uIGVzdGltYXRlVG9rZW5zKHRleHQ6IHN0cmluZyk6IG51bWJlciB7XG4gIHJldHVybiBNYXRoLmNlaWwodGV4dC5sZW5ndGggLyA0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNjYW5TZWNyZXRzKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIGNvbnRlbnQuc3BsaXQoXCJcXG5cIikuZmlsdGVyKGxpbmUgPT4gU0VDUkVUX1BBVFRFUk5TLnRlc3QobGluZSkpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5vdGVXaXRoQ29udGVudCB7XG4gIHBhdGg6IHN0cmluZztcbiAgY29udGVudDogc3RyaW5nO1xuICBzY29yZTogbnVtYmVyO1xuICBob3A6IDEgfCAyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ3JlZWR5U2VsZWN0KG5vdGVzOiBOb3RlV2l0aENvbnRlbnRbXSwgYnVkZ2V0VG9rZW5zOiBudW1iZXIpOiBOb3RlV2l0aENvbnRlbnRbXSB7XG4gIGNvbnN0IHNvcnRlZCA9IFsuLi5ub3Rlc10uc29ydCgoYSwgYikgPT4gYi5zY29yZSAtIGEuc2NvcmUpO1xuICBjb25zdCBzZWxlY3RlZDogTm90ZVdpdGhDb250ZW50W10gPSBbXTtcbiAgbGV0IHVzZWQgPSAwO1xuICBmb3IgKGNvbnN0IG5vdGUgb2Ygc29ydGVkKSB7XG4gICAgY29uc3QgdCA9IGVzdGltYXRlVG9rZW5zKG5vdGUuY29udGVudCk7XG4gICAgaWYgKHVzZWQgKyB0IDw9IGJ1ZGdldFRva2Vucykge1xuICAgICAgc2VsZWN0ZWQucHVzaChub3RlKTtcbiAgICAgIHVzZWQgKz0gdDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHNlbGVjdGVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb250ZXh0RmlsZShcbiAgZGVzaWduQ29udGVudDogc3RyaW5nLFxuICByZWxhdGVkTm90ZXM6IE5vdGVXaXRoQ29udGVudFtdLFxuICBkaWFncmFtUGF0aHM6IHN0cmluZ1tdXG4pOiBzdHJpbmcge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXCIjIENsYXVkZSBDb250ZXh0XFxuXCIsIFwiIyMgRGVzaWduXFxuXCIsIGRlc2lnbkNvbnRlbnQudHJpbSgpLCBcIlwiXTtcblxuICBpZiAocmVsYXRlZE5vdGVzLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKFwiIyMgUmVsYXRlZFxcblwiKTtcbiAgICBmb3IgKGNvbnN0IG5vdGUgb2YgcmVsYXRlZE5vdGVzKSB7XG4gICAgICBsaW5lcy5wdXNoKGAjIyMgJHtub3RlLnBhdGh9XFxuYCk7XG4gICAgICBsaW5lcy5wdXNoKG5vdGUuY29udGVudC50cmltKCkpO1xuICAgICAgbGluZXMucHVzaChcIlwiKTtcbiAgICB9XG4gIH1cblxuICBpZiAoZGlhZ3JhbVBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKFwiIyMgRGlhZ3JhbXNcXG5cIik7XG4gICAgZm9yIChjb25zdCBwIG9mIGRpYWdyYW1QYXRocykge1xuICAgICAgbGluZXMucHVzaChgLSAke3B9YCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUNvbnRleHRGaWxlKGNvZGVQYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCByZXNvbHZlZCA9IGV4cGFuZFRpbGRlKGNvZGVQYXRoKTtcbiAgY29uc3QgZGVzdCA9IHBhdGguam9pbihyZXNvbHZlZCwgXCIuY2xhdWRlLWNvbnRleHQubWRcIik7XG4gIGF3YWl0IGZzLndyaXRlRmlsZShkZXN0LCBjb250ZW50LCBcInV0Zi04XCIpO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUErQzs7O0FDQS9DLHNCQUErQztBQVN4QyxJQUFNLG1CQUFtQztBQUFBLEVBQzlDLGFBQWE7QUFBQSxFQUNiLGFBQWE7QUFBQSxFQUNiLGdCQUFnQjtBQUFBLEVBQ2hCLG1CQUFtQjtBQUNyQjtBQUVPLElBQU0sc0JBQU4sY0FBa0MsaUNBQWlCO0FBQUEsRUFHeEQsWUFBWSxLQUFVLFFBQWE7QUFDakMsVUFBTSxLQUFLLE1BQU07QUFDakIsU0FBSyxTQUFTO0FBQUEsRUFDaEI7QUFBQSxFQUVBLFVBQWdCO0FBQ2QsVUFBTSxFQUFFLFlBQVksSUFBSTtBQUN4QixnQkFBWSxNQUFNO0FBQ2xCLGdCQUFZLFNBQVMsTUFBTSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFekQsUUFBSSx3QkFBUSxXQUFXLEVBQ3BCLFFBQVEsY0FBYyxFQUN0QixRQUFRLHdEQUF3RCxFQUNoRTtBQUFBLE1BQVEsQ0FBQyxTQUNSLEtBQ0csU0FBUyxPQUFPLEtBQUssT0FBTyxTQUFTLFdBQVcsQ0FBQyxFQUNqRCxTQUFTLE9BQU8sVUFBa0I7QUFDakMsY0FBTSxJQUFJLFNBQVMsS0FBSztBQUN4QixZQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxHQUFHO0FB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S0FBSyxJQUFJLFNBQVMsVUFBVSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3BELGNBQUksVUFBVSxNQUFNO0FBQUUsdUJBQVc7QUFBTSxvQkFBUSxJQUFJO0FBQUcsaUJBQUssTUFBTTtBQUFBLFVBQUc7QUFDcEUsYUFBRyxVQUFVLE1BQU07QUFBRSx1QkFBVztBQUFNLG9CQUFRLEtBQUs7QUFBRyxpQkFBSyxNQUFNO0FBQUEsVUFBRztBQUFBLFFBQ3RFO0FBQUEsUUFDQSxVQUFVO0FBQUUsY0FBSSxDQUFDLFNBQVUsU0FBUSxLQUFLO0FBQUEsUUFBRztBQUFBLE1BQzdDLEVBQUcsS0FBSyxHQUFHO0FBQ1gsWUFBTSxLQUFLO0FBQUEsSUFDYixDQUFDO0FBQUEsRUFDSDtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X2NoaWxkX3Byb2Nlc3MiLCAiaW1wb3J0X3V0aWwiLCAiZnMiLCAicGF0aCIsICJpbXBvcnRfb2JzaWRpYW4iLCAiZnMiLCAicGF0aCIsICJhY2Nlc3MiXQp9Cg==
