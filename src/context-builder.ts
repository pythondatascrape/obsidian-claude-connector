import * as fs from "fs/promises";
import * as path from "path";
import { expandTilde } from "./utils";

const SECRET_PATTERNS = /(?:key|token|secret|password|api_key)=/i;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function scanSecrets(content: string): string[] {
  return content.split("\n").filter(line => SECRET_PATTERNS.test(line));
}

export interface NoteWithContent {
  path: string;
  content: string;
  score: number;
  hop: 1 | 2;
}

export function greedySelect(notes: NoteWithContent[], budgetTokens: number): NoteWithContent[] {
  const sorted = [...notes].sort((a, b) => b.score - a.score);
  const selected: NoteWithContent[] = [];
  let used = 0;
  for (const note of sorted) {
    const t = estimateTokens(note.content);
    if (used + t <= budgetTokens) {
      selected.push(note);
      used += t;
    }
  }
  return selected;
}

export function buildContextFile(
  designContent: string,
  relatedNotes: NoteWithContent[],
  diagramPaths: string[]
): string {
  const lines: string[] = ["# Claude Context\n", "## Design\n", designContent.trim(), ""];

  if (relatedNotes.length > 0) {
    lines.push("## Related\n");
    for (const note of relatedNotes) {
      lines.push(`### ${note.path}\n`);
      lines.push(note.content.trim());
      lines.push("");
    }
  }

  if (diagramPaths.length > 0) {
    lines.push("## Diagrams\n");
    for (const p of diagramPaths) {
      lines.push(`- ${p}`);
    }
  }

  return lines.join("\n");
}

export async function writeContextFile(codePath: string, content: string): Promise<void> {
  const resolved = expandTilde(codePath);
  const dest = path.join(resolved, ".claude-context.md");
  await fs.writeFile(dest, content, "utf-8");
}
