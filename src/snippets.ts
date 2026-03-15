export interface Snippet {
  label: string;
  content: string;
}

export const SNIPPETS: Snippet[] = [
  {
    label: "Run tests before commit",
    content: "\n## Testing\nBefore committing, always run the full test suite and fix any failures before proceeding.\n",
  },
  {
    label: "uv dependency management",
    content: "\n{{#if python}}\n## Dependencies\nUse `uv` to manage dependencies. Never use `pip` directly.\n- Add: `uv add <package>`\n- Remove: `uv remove <package>`\n- Sync: `uv sync`\n{{/if}}\n",
  },
  {
    label: "Changelog rule",
    content: "\n## After Each Git Commit\nWrite a changelog entry to `{{vaultPath}}/changelog.md`:\n- Format: `## YYYY-MM-DD HH:MM — <one-line summary>` followed by bullet points\n- Append to the top of the file; create the file if it doesn't exist\n- Sessions with no commits produce no entry\n",
  },
  {
    label: "Code style",
    content: "\n## Code Style\n- Prefer clear, readable code over clever one-liners\n- Keep functions small and focused on one responsibility\n- Write descriptive variable and function names\n",
  },
  {
    label: "Git discipline",
    content: "\n## Git Discipline\n- Commit messages: `type: short description` (e.g. `feat:`, `fix:`, `refactor:`)\n- One logical change per commit\n- Never commit secrets, `.env` files, or generated build artifacts\n",
  },
];
