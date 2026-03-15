import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import { execFile } from "child_process";
import { access } from "fs/promises";
import { SNIPPETS } from "./snippets";

export const DEFAULT_CLAUDE_MD_TEMPLATE = `# Obsidian Connector — Claude Code Instructions

## Context
This project is linked to an Obsidian vault folder.

**Vault docs:** {{vaultPath}}

## On Startup
1. Read \`.claude-context.md\` in this directory for curated project context.
2. Treat the vault folder above as the documentation source — refer to it for design decisions.

## After Each Git Commit
Write a changelog entry to \`{{vaultPath}}/changelog.md\`:
- Format: \`## YYYY-MM-DD HH:MM — <one-line summary>\` followed by bullet points
- Append to the top of the file; create the file if it doesn't exist
- Sessions with no commits produce no entry
`;

export interface PluginSettings {
  tokenBudget: number;
  terminalApp: string;
  gitignoreRules: string;
  envExampleContent: string;
  claudeMdTemplate: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  tokenBudget: 8000,
  terminalApp: "Terminal",
  gitignoreRules: "",
  envExampleContent: "ANTHROPIC_API_KEY=\n",
  claudeMdTemplate: DEFAULT_CLAUDE_MD_TEMPLATE,
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

    containerEl.createEl("h3", { text: "CLAUDE.md Template" });
    containerEl.createEl("p", {
      text: "Written to CLAUDE.md when linking a new project.",
      cls: "setting-item-description",
    });

    // Collapsible variable reference
    const varRef = containerEl.createEl("details", { attr: { style: "margin-bottom:8px" } });
    varRef.createEl("summary", { text: "Available variables", attr: { style: "cursor:pointer;font-size:12px;color:var(--text-muted)" } });
    const varTable = varRef.createEl("table", { attr: { style: "font-size:12px;margin-top:4px;border-collapse:collapse" } });
    const templateVars = [
      ["{{vaultPath}}", "Absolute path to the linked vault folder"],
      ["{{projectName}}", "Basename of the code directory"],
      ["{{date}}", "Link date as YYYY-MM-DD"],
      ["{{vaultName}}", "Obsidian vault name"],
      ["{{pluginVersion}}", "Plugin version"],
      ["{{#if python}}...{{/if}}", "Block shown only for Python projects"],
      ["{{#if node}}...{{/if}}", "Block shown only for Node projects"],
      ["{{#if typescript}}...{{/if}}", "Block shown only for TypeScript projects"],
      ["{{#if go}}...{{/if}}", "Block shown only for Go projects"],
      ["{{#if rust}}...{{/if}}", "Block shown only for Rust projects"],
    ];
    for (const [v, desc] of templateVars) {
      const tr = varTable.createEl("tr");
      tr.createEl("td", { text: v, attr: { style: "font-family:monospace;padding:2px 8px 2px 0;white-space:nowrap" } });
      tr.createEl("td", { text: desc, attr: { style: "color:var(--text-muted)" } });
    }

    // Template textarea
    let templateTextArea: HTMLTextAreaElement;
    new Setting(containerEl)
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.claudeMdTemplate)
          .onChange(async (value: string) => {
            this.plugin.settings.claudeMdTemplate = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 16;
        text.inputEl.style.width = "100%";
        text.inputEl.style.fontFamily = "monospace";
        text.inputEl.style.fontSize = "12px";
        templateTextArea = text.inputEl;
      });

    // Snippet insert buttons
    containerEl.createEl("p", { text: "Insert snippet:", attr: { style: "margin:6px 0 4px;font-size:12px;color:var(--text-muted)" } });
    const snippetRow = containerEl.createEl("div", { attr: { style: "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px" } });
    for (const snippet of SNIPPETS) {
      const btn = snippetRow.createEl("button", { text: snippet.label, cls: "oc-btn-small" });
      btn.onclick = () => {
        const ta = templateTextArea;
        if (!ta) return;
        const start = ta.selectionStart ?? ta.value.length;
        ta.value = ta.value.slice(0, start) + snippet.content + ta.value.slice(start);
        ta.dispatchEvent(new Event("input"));
        this.plugin.settings.claudeMdTemplate = ta.value;
        this.plugin.saveSettings();
      };
    }

    // Reset button
    const resetBtn = containerEl.createEl("button", { text: "Reset to default", cls: "oc-btn-small" });
    resetBtn.onclick = async () => {
      this.plugin.settings.claudeMdTemplate = DEFAULT_CLAUDE_MD_TEMPLATE;
      await this.plugin.saveSettings();
      this.display();
    };

    containerEl.createEl("h3", { text: "Linked Projects" });
    this.renderLinkedProjects(containerEl);
  }

  private renderLinkedProjects(containerEl: HTMLElement): void {
    const entries = this.plugin.registry?.entries?.() ?? [];

    if (entries.length === 0) {
      containerEl.createEl("p", {
        text: "No projects linked yet. Use the \"Obsidian Connector: Link project\" command.",
        cls: "oc-empty-state",
      });
      return;
    }

    const list = containerEl.createEl("div", { cls: "oc-linked-projects" });

    for (const { vaultPath, codePath } of entries) {
      const row = list.createEl("div", { cls: "oc-linked-row" });

      // Status indicator — async, starts as loading
      const status = row.createEl("span", { text: "…", cls: "oc-status" });

      // Vault path label
      row.createEl("span", { text: vaultPath, cls: "oc-vault-path" });
      row.createEl("span", { text: "→", cls: "oc-arrow" });

      // Code path label
      const resolvedCode = codePath.replace(/^~/, process.env.HOME ?? "");
      row.createEl("span", { text: codePath, cls: "oc-code-path" });

      // Reveal button (cross-platform)
      const revealLabel =
        process.platform === "darwin" ? "Reveal in Finder"
        : process.platform === "win32" ? "Open in Explorer"
        : "Open Folder";

      const revealBtn = row.createEl("button", { text: revealLabel, cls: "oc-btn-small" });
      revealBtn.onclick = () => revealInFileBrowser(resolvedCode);

      // Unlink button
      const unlinkBtn = row.createEl("button", { text: "Unlink", cls: "oc-btn-small oc-btn-danger" });
      unlinkBtn.onclick = async () => {
        await this.plugin.registry.unlink(vaultPath);
        new Notice(`Unlinked "${vaultPath}"`);
        this.display();
      };

      // Async status check
      access(resolvedCode)
        .then(() => {
          status.textContent = "✓";
          status.classList.add("oc-status-ok");
          revealBtn.disabled = false;
        })
        .catch(() => {
          status.textContent = "⚠";
          status.classList.add("oc-status-warn");
          revealBtn.disabled = true;
          unlinkBtn.textContent = "Re-link / Unlink";
        });
    }
  }
}

function revealInFileBrowser(absPath: string): void {
  const platform = process.platform;
  if (platform === "darwin") {
    execFile("open", [absPath]);
  } else if (platform === "win32") {
    execFile("explorer", [absPath]);
  } else {
    execFile("xdg-open", [absPath]);
  }
}
