export interface NoteNode {
  path: string;
  tags: string[];
  links: string[];
  backlinks: string[];
}

export interface ScoredNote {
  path: string;
  score: number;
  hop: 1 | 2;
}

const HOP1_BASE = 10;
const HOP2_BASE = 4;
const TAG_BONUS = 3;

export function scoreNotes(root: NoteNode, allNotes: NoteNode[]): ScoredNote[] {
  const noteByPath = new Map(allNotes.map(n => [n.path, n]));
  const rootTags = new Set(root.tags);
  const visited = new Set<string>([root.path]);
  const scores = new Map<string, ScoredNote>();

  const hop1Paths = new Set([...root.links, ...root.backlinks]);
  for (const p of hop1Paths) {
    if (!noteByPath.has(p)) continue;
    const note = noteByPath.get(p)!;
    const tagBonus = note.tags.filter(t => rootTags.has(t)).length * TAG_BONUS;
    scores.set(p, { path: p, score: HOP1_BASE + tagBonus, hop: 1 });
    visited.add(p);
  }

  for (const p of hop1Paths) {
    const note = noteByPath.get(p);
    if (!note) continue;
    for (const p2 of [...note.links, ...note.backlinks]) {
      if (visited.has(p2) || !noteByPath.has(p2)) continue;
      const note2 = noteByPath.get(p2)!;
      const tagBonus = note2.tags.filter(t => rootTags.has(t)).length * TAG_BONUS;
      scores.set(p2, { path: p2, score: HOP2_BASE + tagBonus, hop: 2 });
      visited.add(p2);
    }
  }

  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}
