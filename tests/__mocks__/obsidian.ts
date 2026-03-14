export class Plugin {
  app: any;
  manifest: any;
  constructor(app: any, manifest: any) { this.app = app; this.manifest = manifest; }
  loadData(): Promise<any> { return Promise.resolve({}); }
  saveData(_: any): Promise<void> { return Promise.resolve(); }
  addCommand(_: any) {}
  addSettingTab(_: any) {}
  registerView(_: string, __: any) {}
}
export class App {
  vault = {
    getAbstractFileByPath: jest.fn(),
    getFiles: jest.fn(() => []),
    getMarkdownFiles: jest.fn(() => []),
    read: jest.fn(() => Promise.resolve("")),
    create: jest.fn(() => Promise.resolve()),
    adapter: { exists: jest.fn(), read: jest.fn(), write: jest.fn(), getBasePath: jest.fn(() => "/Users/emeyer/Desktop/Vault") }
  };
  metadataCache = {
    getBacklinksForFile: jest.fn(() => ({ data: {} })),
    getFileCache: jest.fn(() => null),
    getFirstLinkpathDest: jest.fn(() => null)
  };
  workspace = {
    getLeavesOfType: jest.fn(() => []),
    getRightLeaf: jest.fn(),
    revealLeaf: jest.fn(),
    getActiveFile: jest.fn(() => null)
  };
  setting = { open: jest.fn() };
}
export class ItemView {
  containerEl = { empty: jest.fn(), createEl: jest.fn(() => ({ createEl: jest.fn(), textContent: "", onclick: null, addClass: jest.fn() })), addClass: jest.fn() };
  app: any;
  leaf: any;
  constructor(leaf: any) { this.leaf = leaf; this.app = new App(); }
  getViewType() { return ""; }
  getDisplayText() { return ""; }
  getIcon() { return ""; }
}
export class PluginSettingTab {
  containerEl = { empty: jest.fn(), createEl: jest.fn(() => ({ createEl: jest.fn() })) };
  constructor(_: any, __: any) {}
  display() {}
}
export class Setting {
  constructor(_: any) {}
  setName(_: string) { return this; }
  setDesc(_: string) { return this; }
  addText(_: any) { return this; }
  addTextArea(_: any) { return this; }
}
export class Notice { constructor(_: string) {} }
export class Modal {
  app: any;
  contentEl = { createEl: jest.fn(() => ({ createEl: jest.fn(), onclick: null })), empty: jest.fn() };
  constructor(app: any) { this.app = app; }
  open() {}
  close() {}
}
export class TFile { path = ""; name = ""; basename = ""; extension = ""; }
export const normalizePath = (p: string) => p.replace(/\\/g, "/");
