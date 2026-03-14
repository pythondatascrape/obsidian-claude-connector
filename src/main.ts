import { Plugin, Modal, Setting, Notice } from "obsidian";
import { ConnectorSettingTab, DEFAULT_SETTINGS, PluginSettings } from "./settings";
import { LinkRegistry } from "./registry";
import { ScaffoldingService } from "./scaffolding";
import { ExcalidrawService } from "./excalidraw";
import { TerminalService } from "./terminal";
import { FileSyncService } from "./file-sync";
import { ChatPanelView, CHAT_PANEL_VIEW } from "./chat-panel";

export default class ObsidianConnectorPlugin extends Plugin {
  settings: PluginSettings;
  registry: LinkRegistry;
  scaffoldingService: ScaffoldingService;
  excalidrawService: ExcalidrawService;
  terminalService: TerminalService;
  fileSyncService: FileSyncService;

  private _data: any = {};

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
      },
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
      callback: () => this.runLinkSetupPublic(),
    });

    this.addCommand({
      id: "open-chat-panel",
      name: "Open Claude chat panel",
      callback: () => this.openChatPanel(),
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
    const vaultPath = (activeFile as any).parent?.path ?? "";

    if (this.registry.isLinked(vaultPath)) {
      const proceed = await this.confirm(`"${vaultPath}" is already linked. Re-link?`);
      if (!proceed) return;
      await this.registry.unlink(vaultPath);
    }

    const codePath = await this.promptText("Code project directory (absolute path or ~/...):");
    if (!codePath) return;

    try {
      await this.registry.link(vaultPath, codePath);
    } catch (e: any) {
      new Notice(e.message);
      return;
    }

    const basePath = (this.app.vault.adapter as any).getBasePath?.() ?? "";
    const vaultAbsPath = basePath ? `${basePath}/${vaultPath}` : vaultPath;
    const result = await this.scaffoldingService.scaffold(codePath, vaultAbsPath);

    if (result.errors.some((e: string) => e.includes("uv is not installed"))) {
      new Notice(result.errors[0]);
      await this.registry.unlink(vaultPath);
      return;
    }

    if (result.errors.length > 0) {
      new Notice(result.errors.join("\n"));
    }

    await this.fileSyncService.syncGitignoreForPath(codePath);
    await this.fileSyncService.syncEnvExampleForPath(codePath);
    new Notice("Project linked successfully!");
  }

  private async openChatPanel() {
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: CHAT_PANEL_VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private promptText(message: string): Promise<string | null> {
    return new Promise((resolve) => {
      let result: string | null = null;
      const modal = new (class extends Modal {
        onOpen() {
          this.contentEl.createEl("p", { text: message });
          const input = this.contentEl.createEl("input", {
            attr: { type: "text", style: "width:100%;margin-bottom:8px" }
          }) as HTMLInputElement;
          input.oninput = () => { result = input.value; };
          const btn = this.contentEl.createEl("button", { text: "OK" });
          btn.onclick = () => this.close();
        }
        onClose() { resolve(result); }
      })(this.app);
      modal.open();
    });
  }

  private confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;
      const modal = new (class extends Modal {
        onOpen() {
          this.contentEl.createEl("p", { text: message });
          const row = this.contentEl.createEl("div");
          const yes = row.createEl("button", { text: "Yes" });
          const no = row.createEl("button", { text: "Cancel" });
          yes.onclick = () => { resolved = true; resolve(true); this.close(); };
          no.onclick = () => { resolved = true; resolve(false); this.close(); };
        }
        onClose() { if (!resolved) resolve(false); }
      })(this.app);
      modal.open();
    });
  }
}
