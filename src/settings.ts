import { App, PluginSettingTab, Setting } from "obsidian";

export interface PluginSettings {
  anthropicApiKey: string;
  tokenBudget: number;
  terminalApp: string;
  gitignoreRules: string;
  envExampleContent: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  anthropicApiKey: "",
  tokenBudget: 8000,
  terminalApp: "Terminal",
  gitignoreRules: "",
  envExampleContent: "ANTHROPIC_API_KEY=\n",
};

export class ConnectorSettingTab extends PluginSettingTab {
  plugin: any;

  constructor(app: App, plugin: any) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Obsidian Connector" });

    new Setting(containerEl)
      .setName("Anthropic API Key")
      .setDesc("Stored encrypted in plugin data. Never written to your vault.")
      .addText((text) =>
        text
          .setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.anthropicApiKey)
          .onChange(async (value: string) => {
            this.plugin.settings.anthropicApiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Token Budget")
      .setDesc("Max tokens for generated context file (default: 8000).")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.tokenBudget))
          .onChange(async (value: string) => {
            const n = parseInt(value);
            if (!isNaN(n) && n > 0) {
              this.plugin.settings.tokenBudget = n;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Terminal App")
      .setDesc("macOS terminal to launch (e.g. Terminal, iTerm, Warp).")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.terminalApp)
          .onChange(async (value: string) => {
            this.plugin.settings.terminalApp = value.trim() || "Terminal";
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "GitIgnore Manager" });
    new Setting(containerEl)
      .setName("Managed .gitignore rules")
      .setDesc("Synced into the # [Obsidian Connector] block in the linked project's .gitignore.")
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.gitignoreRules)
          .onChange(async (value: string) => {
            this.plugin.settings.gitignoreRules = value;
            await this.plugin.saveSettings();
            await this.plugin.fileSyncService?.syncGitignore();
          })
      );

    containerEl.createEl("h3", { text: ".env.example Manager" });
    new Setting(containerEl)
      .setName(".env.example content")
      .setDesc("Key names only (no values). Vault is authoritative.")
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.envExampleContent)
          .onChange(async (value: string) => {
            this.plugin.settings.envExampleContent = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
