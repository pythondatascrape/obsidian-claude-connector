import { execFile } from "child_process";
import { promisify } from "util";
import { expandTilde } from "./utils";

const execFileAsync = promisify(execFile);

export const TERMINAL_ALLOWLIST = [
  "Terminal",
  "iTerm",
  "iTerm2",
  "Warp",
  "Alacritty",
  "Hyper",
  "Kitty",
  "WezTerm",
  "Ghostty",
];

export function isAllowedTerminal(terminalApp: string): boolean {
  return TERMINAL_ALLOWLIST.includes(terminalApp);
}

export function buildFallbackMessage(codePath: string): string {
  return `Terminal launch failed. Run manually:\n\ncd ${codePath} && claude`;
}

export class TerminalService {
  private terminalApp: string;

  constructor(terminalApp: string) {
    this.terminalApp = terminalApp;
  }

  async launch(codePath: string): Promise<void> {
    if (!isAllowedTerminal(this.terminalApp)) {
      throw new Error(`Terminal "${this.terminalApp}" is not in the allowed list.`);
    }
    const resolved = expandTilde(codePath);
    try {
      await execFileAsync("open", ["-a", this.terminalApp, resolved]);
    } catch {
      throw new Error(buildFallbackMessage(resolved));
    }
  }
}
