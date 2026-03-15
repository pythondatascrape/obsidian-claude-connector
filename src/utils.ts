import * as path from "path";

export function expandTilde(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    return (process.env.HOME ?? "") + p.slice(1);
  }
  if (p.startsWith("~")) {
    throw new Error(`Path "${p}" uses ~username syntax which is not supported. Use an absolute path or ~/...`);
  }
  return p;
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertSafePath(resolved: string, allowedRoot?: string): void {
  if (resolved.includes("\0")) {
    throw new Error("Path contains null bytes.");
  }
  if (!path.isAbsolute(resolved)) {
    throw new Error("Path must be absolute after tilde expansion.");
  }
  if (allowedRoot && !resolved.startsWith(allowedRoot + path.sep) && resolved !== allowedRoot) {
    throw new Error("Path escapes the allowed directory.");
  }
}
