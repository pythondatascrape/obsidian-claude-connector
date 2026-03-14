import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import { scoreNotes, NoteNode } from "./graph";
import {
  estimateTokens,
  greedySelect,
  buildContextFile,
  writeContextFile,
  scanSecrets,
  NoteWithContent,
} from "./context-builder";
import { streamMessage, Message } from "./claude-api";

export const CHAT_PANEL_VIEW = "obsidian-connector-chat";

export class ChatPanelView extends ItemView {
  plugin: any;
  private messages: Message[] = [];
  private systemPrompt = "";
  private selectedNotes: NoteWithContent[] = [];

  constructor(leaf: WorkspaceLeaf, plugin: any) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return CHAT_PANEL_VIEW; }
  getDisplayText() { return "Claude Chat"; }
  getIcon() { return "message-square"; }

  async onOpen() {
    await this.render();
  }

  async render() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("obsidian-connector-chat");

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      containerEl.createEl("p", { text: "Open a note to start." });
      return;
    }

    const vaultPath = (activeFile as any).parent?.path ?? "";
    const codePath = this.plugin.registry.getCodePath(vaultPath);

    if (!codePath) {
      containerEl.createEl("p", { text: "This folder is not linked to a code project." });
      containerEl.createEl("p", { text: "Run: Obsidian Connector: Link project" });
      return;
    }

    // API key guard — spec requires inline error + disabled panel if key missing
    if (!this.plugin.settings.anthropicApiKey) {
      const errEl = containerEl.createEl("div", { cls: "oc-banner oc-error" });
      errEl.createEl("span", { text: "Anthropic API key not set. " });
      const link = errEl.createEl("a", { text: "Open settings", href: "#" });
      link.onclick = () => (this.app as any).setting?.open();
      return;
    }

    // Stale registry check
    const { access } = await import("fs/promises");
    const resolvedCode = codePath.replace("~", process.env.HOME ?? "");
    let codePathExists = true;
    try { await access(resolvedCode); } catch { codePathExists = false; }

    if (!codePathExists) {
      const banner = containerEl.createEl("div", { cls: "oc-banner oc-warning" });
      banner.createEl("span", { text: `Code project not found: ${codePath}` });
      const relinkBtn = banner.createEl("button", { text: "Re-link" });
      relinkBtn.onclick = () => this.plugin.runLinkSetupPublic();
      containerEl.createEl("hr");
    }

    // Build graph + select notes
    const allNotes = this.buildNoteNodes();
    const rootNode = allNotes.find(n => n.path === activeFile.path) ?? {
      path: activeFile.path, tags: [], links: [], backlinks: []
    };
    const scored = scoreNotes(rootNode, allNotes);
    const primaryContent = await this.app.vault.read(activeFile);

    const candidatesWithContent: NoteWithContent[] = [];
    for (const s of scored) {
      const f = this.app.vault.getAbstractFileByPath(s.path);
      if (!f) continue;
      try {
        const content = await this.app.vault.read(f as any);
        candidatesWithContent.push({ ...s, content });
      } catch {}
    }

    const primaryTokens = estimateTokens(primaryContent);
    const remaining = this.plugin.settings.tokenBudget - primaryTokens;
    this.selectedNotes = greedySelect(candidatesWithContent, remaining);

    const excalidrawPaths = this.findExcalidrawFiles(vaultPath);
    const contextContent = buildContextFile(primaryContent, this.selectedNotes, excalidrawPaths);
    this.systemPrompt = `You are a development assistant. The following is the project context from the linked Obsidian vault.\n\n${contextContent}\n\nWhen asked to create a diagram, output a valid .excalidraw JSON object wrapped in a code block labeled \`excalidraw\`.`;

    // Token summary
    const totalTokens = estimateTokens(contextContent);
    const summary = containerEl.createEl("div", { cls: "oc-token-summary" });
    summary.createEl("span", { text: `Context: ${totalTokens} tokens (${this.selectedNotes.length + 1} notes)` });

    // Secret warnings
    const allContent = [primaryContent, ...this.selectedNotes.map(n => n.content)];
    const warnings = allContent.flatMap(c => scanSecrets(c));
    if (warnings.length > 0) {
      const warnEl = containerEl.createEl("div", { cls: "oc-banner oc-warning" });
      warnEl.createEl("strong", { text: "⚠ Secret patterns detected in context notes." });
      const preview = warnings.slice(0, 3).join(", ") + (warnings.length > 3 ? "..." : "");
      warnEl.createEl("p", { text: preview });
    }

    // Chat history
    const historyEl = containerEl.createEl("div", { cls: "oc-chat-history" });
    this.messages.forEach(m => this.appendMessage(historyEl, m.role, m.content));

    // Input
    const inputEl = containerEl.createEl("textarea", {
      cls: "oc-chat-input",
      attr: { placeholder: "Ask Claude..." }
    }) as HTMLTextAreaElement;

    const sendBtn = containerEl.createEl("button", { text: "Send", cls: "oc-btn" });
    sendBtn.onclick = async () => {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = "";
      this.messages.push({ role: "user", content: text });
      this.appendMessage(historyEl, "user", text);

      const assistantEl = historyEl.createEl("div", { cls: "oc-msg oc-assistant" });
      let full = "";

      await streamMessage({
        apiKey: this.plugin.settings.anthropicApiKey,
        systemPrompt: this.systemPrompt,
        messages: this.messages,
        onChunk: (chunk) => { full += chunk; assistantEl.textContent = full; },
        onDone: async () => {
          this.messages.push({ role: "assistant", content: full });
          await this.handleExcalidraw(full, vaultPath);
        },
        onError: (err) => { assistantEl.textContent = `Error: ${err}`; },
      });
    };

    // Start Coding button
    const startBtn = containerEl.createEl("button", { text: "Start Coding →", cls: "oc-btn oc-primary" });
    startBtn.onclick = async () => {
      try {
        await writeContextFile(codePath, contextContent);
        await this.plugin.fileSyncService?.syncEnvExample();
        await this.plugin.terminalService?.launch(codePath);
      } catch (e: any) {
        new Notice(`Start Coding failed: ${e.message}`);
      }
    };
  }

  private appendMessage(container: HTMLElement, role: "user" | "assistant", content: string) {
    const el = container.createEl("div", { cls: `oc-msg oc-${role}` });
    el.textContent = content;
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

  private findExcalidrawFiles(vaultFolderPath: string): string[] {
    return this.app.vault.getFiles()
      .filter((f: any) => f.path.startsWith(vaultFolderPath) && f.extension === "excalidraw")
      .map((f: any) => f.path);
  }

  private async handleExcalidraw(response: string, vaultPath: string) {
    const match = response.match(/```excalidraw\n([\s\S]*?)\n```/);
    if (!match) return;
    const json = match[1];
    await this.plugin.excalidrawService?.write(json, vaultPath);
  }
}
