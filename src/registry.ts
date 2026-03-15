interface RegistryStore {
  load(): Promise<Record<string, string>>;
  save(data: Record<string, string>): Promise<void>;
}

export class LinkRegistry {
  private store: RegistryStore;
  private map: Map<string, string> = new Map();

  constructor(store: RegistryStore) {
    this.store = store;
  }

  async load(): Promise<void> {
    const data = await this.store.load();
    this.map = new Map(Object.entries(data ?? {}));
  }

  async link(vaultPath: string, codePath: string): Promise<void> {
    if (!codePath || codePath.includes("\0")) {
      throw new Error("Invalid code path.");
    }
    if (!codePath.startsWith("/") && !codePath.startsWith("~/") && codePath !== "~") {
      throw new Error(`Code path must be absolute or start with ~/`);
    }
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

  async unlink(vaultPath: string): Promise<void> {
    this.map.delete(vaultPath);
    await this.persist();
  }

  getCodePath(vaultPath: string): string | undefined {
    return this.map.get(vaultPath);
  }

  getVaultPath(codePath: string): string | undefined {
    for (const [v, c] of this.map) {
      if (c === codePath) return v;
    }
    return undefined;
  }

  isLinked(vaultPath: string): boolean {
    return this.map.has(vaultPath);
  }

  entries(): Array<{ vaultPath: string; codePath: string }> {
    return Array.from(this.map.entries()).map(([vaultPath, codePath]) => ({ vaultPath, codePath }));
  }

  private async persist(): Promise<void> {
    const data: Record<string, string> = {};
    for (const [v, c] of this.map) data[v] = c;
    await this.store.save(data);
  }
}
