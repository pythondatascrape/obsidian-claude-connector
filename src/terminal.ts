import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function buildTerminalCommand(terminalApp: string, codePath: string): string {
  return `open -a "${terminalApp}" "${codePath}"`;
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
    const resolved = codePath.replace("~", process.env.HOME ?? "");
    const cmd = buildTerminalCommand(this.terminalApp, resolved);
    try {
      await execAsync(cmd);
    } catch (e: any) {
      throw new Error(buildFallbackMessage(resolved));
    }
  }
}
