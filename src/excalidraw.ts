export function buildFilename(noteName: string, descriptor: string, date: string): string {
  const safeName = noteName.replace(/\s+/g, "-");
  return `${safeName}-${descriptor}-${date}.excalidraw`;
}

export function resolveCollision(filename: string, existing: string[]): string {
  if (!existing.includes(filename)) return filename;
  const base = filename.replace(/\.excalidraw$/, "");
  let n = 2;
  while (existing.includes(`${base}-${n}.excalidraw`)) n++;
  return `${base}-${n}.excalidraw`;
}

export function validateExcalidrawJson(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

export class ExcalidrawService {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  async write(json: string, vaultFolderPath: string, descriptor = "diagram"): Promise<string | null> {
    if (!validateExcalidrawJson(json)) return null;

    const date = new Date().toISOString().slice(0, 10);
    const activeFile = this.app.workspace.getActiveFile();
    const noteName = activeFile?.basename ?? "note";
    const base = buildFilename(noteName, descriptor, date);

    const existingFiles = this.app.vault.getFiles()
      .filter((f: any) => f.path.startsWith(vaultFolderPath))
      .map((f: any) => f.name);

    const filename = resolveCollision(base, existingFiles);
    const destPath = `${vaultFolderPath}/${filename}`;

    await this.app.vault.create(destPath, json);
    return destPath;
  }
}
