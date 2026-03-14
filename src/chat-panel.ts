import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import { scoreNotes, NoteNode } from "./graph";
import {
  estimateTokens,
  greedySelect,
  buildContextFile,
  writeContextFile,
  NoteWithContent,
} from "./context-builder";

export const CHAT_PANEL_VIEW = "obsidian-connector-chat";

export class ChatPanelView extends ItemView {
  plugin: any;

  constructor(leaf: WorkspaceLeaf, plugin: any) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return CHAT_PANEL_VIEW; }
  getDisplayText() { return "Claude Context"; }
  getIcon() { return "file-code"; }

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

    const vaultPath = (activeFile as any).parent?.path ?? "";
    const codePath = this.plugin.registry.getCodePath(vaultPath);

    if (!codePath) {
      containerEl.createEl("p", { text: "This folder is not linked to a code project." });
      const hint = containerEl.createEl("p");
      hint.createEl("code", { text: "Obsidian Connector: Link project" });
      return;
    }

    // Stale registry check
    const { access } = await import("fs/promises");
    const resolvedCode = codePath.replace(/^~/, process.env.HOME ?? "");
    let codePathExists = true;
    try { await access(resolvedCode); } catch { codePathExists = false; }

    if (!codePathExists) {
      const banner = containerEl.createEl("div", { cls: "oc-banner oc-warning" });
      banner.createEl("span", { text: `Code project not found: ${codePath}` });
      const relinkBtn = banner.createEl("button", { text: "Re-link" });
      relinkBtn.onclick = () => this.plugin.runLinkSetupPublic();
    }

    // Build graph context
    const allNotes = this.buildNoteNodes();
    const rootNode = allNotes.find(n => n.path === activeFile.path) ?? {
      path: activeFile.path, tags: [], links: [], backlinks: []
    };
    const scored = scoreNotes(rootNode, allNotes);
    const primaryContent = await this.app.vault.read(activeFile);
    const primaryTokens = estimateTokens(primaryContent);

    const candidatesWithContent: NoteWithContent[] = [];
    for (const s of scored) {
      const f = this.app.vault.getAbstractFileByPath(s.path);
      if (!f) continue;
      try {
        const content = await this.app.vault.read(f as any);
        candidatesWithContent.push({ ...s, content });
      } catch {}
    }

    const remaining = this.plugin.settings.tokenBudget - primaryTokens;
    const selectedNotes = greedySelect(candidatesWithContent, remaining);

    const excalidrawPaths = this.app.vault.getFiles()
      .filter((f: any) => f.path.startsWith(vaultPath) && f.extension === "excalidraw")
      .map((f: any) => f.path);

    const contextContent = buildContextFile(primaryContent, selectedNotes, excalidrawPaths);
    const totalTokens = estimateTokens(contextContent);

    // Header
    containerEl.createEl("h4", { text: "Context Preview" });

    // Token summary
    const summary = containerEl.createEl("div", { cls: "oc-token-summary" });
    summary.createEl("span", {
      text: `${totalTokens} tokens · ${selectedNotes.length + 1} notes · ${excalidrawPaths.length} diagrams`
    });

    // Primary note
    const primaryEl = containerEl.createEl("div", { cls: "oc-note-item oc-primary" });
    primaryEl.createEl("span", { text: `📄 ${activeFile.basename}` });
    primaryEl.createEl("span", { cls: "oc-tokens", text: `${primaryTokens}t` });

    // Related notes list
    if (selectedNotes.length > 0) {
      containerEl.createEl("p", { cls: "oc-section-label", text: "Related notes included:" });
      for (const note of selectedNotes) {
        const noteEl = containerEl.createEl("div", { cls: "oc-note-item" });
        const name = note.path.split("/").pop() ?? note.path;
        noteEl.createEl("span", { text: `↳ ${name}` });
        noteEl.createEl("span", { cls: "oc-tokens", text: `${estimateTokens(note.content)}t` });
      }
    }

    // Excalidraw files
    if (excalidrawPaths.length > 0) {
      containerEl.createEl("p", { cls: "oc-section-label", text: "Diagrams referenced:" });
      for (const p of excalidrawPaths) {
        const name = p.split("/").pop() ?? p;
        containerEl.createEl("div", { cls: "oc-note-item", text: `⬡ ${name}` });
      }
    }

    containerEl.createEl("hr");

    // Code project path
    const pathEl = containerEl.createEl("div", { cls: "oc-code-path" });
    pathEl.createEl("span", { text: `→ ${codePath}` });

    // Start Coding button
    const startBtn = containerEl.createEl("button", {
      text: "Start Coding →",
      cls: "oc-btn oc-primary"
    });
    startBtn.disabled = !codePathExists;
    startBtn.onclick = async () => {
      startBtn.disabled = true;
      startBtn.textContent = "Launching…";
      try {
        await writeContextFile(codePath, contextContent);
        await this.plugin.fileSyncService?.syncEnvExampleForPath(codePath);
        await this.plugin.terminalService?.launch(codePath);
        startBtn.textContent = "Launched ✓";
      } catch (e: any) {
        new Notice(`Start Coding failed: ${e.message}`);
        startBtn.disabled = false;
        startBtn.textContent = "Start Coding →";
      }
    };
  }

  private buildNoteNodes(): NoteNode[] {
    const files = this.app.vault.getMarkdownFiles();
    return files.map((f: any) => {
      const cache = this.app.metadataCache.getFileCache(f);
      const tags = cache?.tags?.map((t: any) => t.tag.replace("#", "")) ?? [];
      const links = cache?.links?.map((l: any) => {
        const dest = this.app.metadataCache.getFirstLinkpathDest(l.link, f.path);
        return dest?.path ?? "";
      }).filter(Boolean) ?? [];
      let backlinks: string[] = [];
      try {
        backlinks = Object.keys(
          (this.app.metadataCache.getBacklinksForFile(f) as any)?.data ?? {}
        );
      } catch {}
      return { path: f.path, tags, links, backlinks };
    });
  }
}
