import { Plugin } from "obsidian";
import { ConnectorSettingTab, DEFAULT_SETTINGS, PluginSettings } from "./settings";
import { LinkRegistry } from "./registry";

export default class ObsidianConnectorPlugin extends Plugin {
  settings: PluginSettings;
  registry: LinkRegistry;
  // These will be populated in Task 13 when all services are wired:
  fileSyncService: any;
  scaffoldingService: any;
  excalidrawService: any;
  terminalService: any;

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
    // terminalService will be re-created in Task 13 when settings change
  }

  async runLinkSetupPublic() {
    // Full implementation in Task 13
  }

  private async openChatPanel() {
    // Full implementation in Task 13
  }
}
