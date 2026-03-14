export function expandTilde(p: string): string {
  if (p.startsWith("~")) {
    return (process.env.HOME ?? "") + p.slice(1);
  }
  return p;
}
