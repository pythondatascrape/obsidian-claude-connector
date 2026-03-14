# Template Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full template engine to the CLAUDE.md generator with variable substitution, conditional blocks, and a snippet library with insert buttons in the settings UI.

**Architecture:** Three new modules (`template-engine.ts`, `project-detector.ts`, `snippets.ts`) plus updates to `settings.ts`, `scaffolding.ts`, and `main.ts`. The template engine is pure (no side effects), the detector is async (filesystem reads), and snippets are static data. The settings UI wires them together.

**Tech Stack:** TypeScript, Node.js `fs/promises`, Jest for tests, Obsidian Modal/Setting APIs

---

## Chunk 1: Template Engine + Project Detector

### Task 1: Template Engine — variables

**Files:**
- Create: `src/template-engine.ts`
- Create: `tests/template-engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/template-engine.test.ts
import { renderTemplate } from "../src/template-engine";

describe("renderTemplate — variables", () => {
  it("replaces {{vaultPath}}", () => {
    const result = renderTemplate("path: {{vaultPath}}", { vaultPath: "/my/vault" }, []);
    expect(result).toBe("path: /my/vault");
  });

  it("replaces {{projectName}}", () => {
    const result = renderTemplate("project: {{projectName}}", { projectName: "my-app" }, []);
    expect(result).toBe("project: my-app");
  });

  it("replaces {{date}} with YYYY-MM-DD format", () => {
    const result = renderTemplate("date: {{date}}", { date: "2026-03-14" }, []);
    expect(result).toBe("date: 2026-03-14");
  });

  it("replaces {{vaultName}}", () => {
    const result = renderTemplate("vault: {{vaultName}}", { vaultName: "Vault" }, []);
    expect(result).toBe("vault: Vault");
  });

  it("replaces {{pluginVersion}}", () => {
    const result = renderTemplate("v{{pluginVersion}}", { pluginVersion: "0.1.0" }, []);
    expect(result).toBe("v0.1.0");
  });

  it("replaces all occurrences of a variable", () => {
    const result = renderTemplate("{{projectName}} / {{projectName}}", { projectName: "x" }, []);
    expect(result).toBe("x / x");
  });

  it("leaves unknown variables untouched", () => {
    const result = renderTemplate("{{unknown}}", {}, []);
    expect(result).toBe("{{unknown}}");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/template-engine.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement variable substitution**

```typescript
// src/template-engine.ts
export interface TemplateVars {
  vaultPath?: string;
  projectName?: string;
  date?: string;
  vaultName?: string;
  pluginVersion?: string;
  [key: string]: string | undefined;
}

export type ProjectType = "python" | "node" | "typescript" | "go" | "rust";

export function renderTemplate(template: string, vars: TemplateVars, activeTypes: ProjectType[]): string {
  let result = template;

  // Replace variables
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/template-engine.test.ts --no-coverage
```
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/obsidian-connector && git add src/template-engine.ts tests/template-engine.test.ts
git commit -m "feat: add template engine with variable substitution"
```

---

### Task 2: Template Engine — conditional blocks

**Files:**
- Modify: `src/template-engine.ts`
- Modify: `tests/template-engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// Add to tests/template-engine.test.ts
describe("renderTemplate — conditionals", () => {
  it("includes block when condition is active", () => {
    const result = renderTemplate("{{#if python}}use uv{{/if}}", {}, ["python"]);
    expect(result).toBe("use uv");
  });

  it("excludes block when condition is inactive", () => {
    const result = renderTemplate("{{#if python}}use uv{{/if}}", {}, []);
    expect(result).toBe("");
  });

  it("handles multiline conditional blocks", () => {
    const template = "{{#if node}}\nnpm install\nnpm test\n{{/if}}";
    const result = renderTemplate(template, {}, ["node"]);
    expect(result).toBe("\nnpm install\nnpm test\n");
  });

  it("handles multiple conditional blocks independently", () => {
    const template = "{{#if python}}py{{/if}}{{#if node}}js{{/if}}";
    const result = renderTemplate(template, {}, ["python"]);
    expect(result).toBe("py");
  });

  it("supports all project types as conditions", () => {
    const types: ProjectType[] = ["python", "node", "typescript", "go", "rust"];
    for (const t of types) {
      const result = renderTemplate(`{{#if ${t}}}yes{{/if}}`, {}, [t]);
      expect(result).toBe("yes");
    }
  });

  it("variables inside conditional blocks are still replaced", () => {
    const result = renderTemplate("{{#if python}}{{projectName}}{{/if}}", { projectName: "myapp" }, ["python"]);
    expect(result).toBe("myapp");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/template-engine.test.ts --no-coverage
```
Expected: FAIL — conditional tests fail

- [ ] **Step 3: Implement conditional block processing**

```typescript
// Update renderTemplate in src/template-engine.ts
export function renderTemplate(template: string, vars: TemplateVars, activeTypes: ProjectType[]): string {
  let result = template;

  // Process conditional blocks first
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, condition, content) => {
    return activeTypes.includes(condition as ProjectType) ? content : "";
  });

  // Replace variables
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }

  return result;
}
```

- [ ] **Step 4: Run all template engine tests**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/template-engine.test.ts --no-coverage
```
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/obsidian-connector && git add src/template-engine.ts tests/template-engine.test.ts
git commit -m "feat: add conditional block support to template engine"
```

---

### Task 3: Project Detector

**Files:**
- Create: `src/project-detector.ts`
- Create: `tests/project-detector.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/project-detector.test.ts
import * as fs from "fs/promises";
import { detectProjectTypes, PROJECT_TYPE_INDICATORS } from "../src/project-detector";

jest.mock("fs/promises");
const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;

describe("detectProjectTypes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("detects python from pyproject.toml", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("pyproject.toml")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("python");
  });

  it("detects python from requirements.txt", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("requirements.txt")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("python");
  });

  it("detects node from package.json", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("package.json")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("node");
  });

  it("detects typescript from tsconfig.json", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("tsconfig.json")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("typescript");
  });

  it("detects go from go.mod", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("go.mod")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("go");
  });

  it("detects rust from Cargo.toml", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("Cargo.toml")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("rust");
  });

  it("detects multiple types", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (String(p).endsWith("package.json") || String(p).endsWith("tsconfig.json")) return;
      throw new Error("not found");
    });
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toContain("node");
    expect(types).toContain("typescript");
  });

  it("returns empty array when no indicators found", async () => {
    mockAccess.mockRejectedValue(new Error("not found"));
    const types = await detectProjectTypes("/code/my-project");
    expect(types).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/project-detector.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement project detector**

```typescript
// src/project-detector.ts
import * as fs from "fs/promises";
import * as path from "path";
import { ProjectType } from "./template-engine";

export const PROJECT_TYPE_INDICATORS: Record<ProjectType, string[]> = {
  python: ["pyproject.toml", "requirements.txt", "setup.py"],
  node: ["package.json"],
  typescript: ["tsconfig.json"],
  go: ["go.mod"],
  rust: ["Cargo.toml"],
};

export async function detectProjectTypes(codePath: string): Promise<ProjectType[]> {
  const detected: ProjectType[] = [];
  for (const [type, indicators] of Object.entries(PROJECT_TYPE_INDICATORS)) {
    for (const indicator of indicators) {
      try {
        await fs.access(path.join(codePath, indicator));
        detected.push(type as ProjectType);
        break; // one match per type is enough
      } catch {}
    }
  }
  return detected;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/project-detector.test.ts --no-coverage
```
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/obsidian-connector && git add src/project-detector.ts tests/project-detector.test.ts
git commit -m "feat: add project type auto-detector"
```

---

## Chunk 2: Snippets + Settings UI + Wiring

### Task 4: Snippet Library

**Files:**
- Create: `src/snippets.ts`
- Create: `tests/snippets.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/snippets.test.ts
import { SNIPPETS, Snippet } from "../src/snippets";

describe("SNIPPETS", () => {
  it("is a non-empty array", () => {
    expect(SNIPPETS.length).toBeGreaterThan(0);
  });

  it("every snippet has a label and content", () => {
    for (const s of SNIPPETS) {
      expect(typeof s.label).toBe("string");
      expect(s.label.length).toBeGreaterThan(0);
      expect(typeof s.content).toBe("string");
      expect(s.content.length).toBeGreaterThan(0);
    }
  });

  it("includes run-tests snippet", () => {
    expect(SNIPPETS.find(s => s.label === "Run tests before commit")).toBeDefined();
  });

  it("includes uv snippet with python conditional", () => {
    const s = SNIPPETS.find(s => s.label === "uv dependency management");
    expect(s?.content).toContain("{{#if python}}");
    expect(s?.content).toContain("{{/if}}");
  });

  it("includes changelog snippet", () => {
    expect(SNIPPETS.find(s => s.label === "Changelog rule")).toBeDefined();
  });

  it("includes git discipline snippet", () => {
    expect(SNIPPETS.find(s => s.label === "Git discipline")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/snippets.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement snippets**

```typescript
// src/snippets.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/snippets.test.ts --no-coverage
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/obsidian-connector && git add src/snippets.ts tests/snippets.test.ts
git commit -m "feat: add snippet library with 5 pre-built CLAUDE.md blocks"
```

---

### Task 5: Update scaffolding to use template engine

**Files:**
- Modify: `src/scaffolding.ts`
- Modify: `tests/scaffolding.test.ts`

- [ ] **Step 1: Update scaffolding tests**

Replace the existing `buildClaudeMd` tests in `tests/scaffolding.test.ts`:

```typescript
// tests/scaffolding.test.ts
import { ScaffoldingService, buildClaudeMd } from "../src/scaffolding";
import { DEFAULT_CLAUDE_MD_TEMPLATE } from "../src/settings";

describe("buildClaudeMd", () => {
  it("renders vaultPath variable into template", () => {
    const md = buildClaudeMd("/Users/x/vault/04 - TEST", "my-app", DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain("/Users/x/vault/04 - TEST");
  });

  it("renders projectName variable into template", () => {
    const md = buildClaudeMd("/Users/x/vault", "my-app", "project: {{projectName}}", []);
    expect(md).toBe("project: my-app");
  });

  it("renders date variable as YYYY-MM-DD", () => {
    const md = buildClaudeMd("/vault", "app", "{{date}}", [], "2026-03-14");
    expect(md).toBe("2026-03-14");
  });

  it("renders python conditional when type active", () => {
    const md = buildClaudeMd("/vault", "app", "{{#if python}}use uv{{/if}}", ["python"]);
    expect(md).toContain("use uv");
  });

  it("suppresses python conditional when type inactive", () => {
    const md = buildClaudeMd("/vault", "app", "{{#if python}}use uv{{/if}}", []);
    expect(md).toBe("");
  });

  it("instructs loading .claude-context.md by default", () => {
    const md = buildClaudeMd("/vault", "app", DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain(".claude-context.md");
  });

  it("instructs writing changelog to vault by default", () => {
    const md = buildClaudeMd("/vault", "app", DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain("changelog.md");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/scaffolding.test.ts --no-coverage
```
Expected: FAIL — signature mismatch

- [ ] **Step 3: Update `buildClaudeMd` in scaffolding.ts**

```typescript
// src/scaffolding.ts — update buildClaudeMd signature and import
import { renderTemplate, ProjectType } from "./template-engine";

export function buildClaudeMd(
  vaultAbsPath: string,
  projectName: string,
  template: string,
  activeTypes: ProjectType[],
  date?: string,
): string {
  const resolvedDate = date ?? new Date().toISOString().slice(0, 10);
  return renderTemplate(template, {
    vaultPath: vaultAbsPath,
    projectName,
    date: resolvedDate,
  }, activeTypes);
}
```

Also update the `scaffold` method signature to accept `activeTypes`:

```typescript
async scaffold(
  codePath: string,
  vaultAbsPath: string,
  claudeMdTemplate: string,
  activeTypes: ProjectType[] = [],
): Promise<ScaffoldResult>
```

And update the `writeFile` call inside `scaffold`:

```typescript
await fs.writeFile(claudeMdPath, buildClaudeMd(vaultAbsPath, projectName, claudeMdTemplate, activeTypes), "utf-8");
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/Desktop/obsidian-connector && npx jest tests/scaffolding.test.ts --no-coverage
```
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/obsidian-connector && git add src/scaffolding.ts tests/scaffolding.test.ts
git commit -m "refactor: wire template engine into scaffolding buildClaudeMd"
```

---

### Task 6: Update main.ts — detection modal + scaffold wiring

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add imports and detection modal**

Add to the top of `main.ts` (note: `expandTilde` may already be imported — verify before adding):

```typescript
import { detectProjectTypes } from "./project-detector";
import { ProjectType } from "./template-engine";
// import { expandTilde } from "./utils"; // only add if not already present
```

Add a private method `promptProjectTypes` after `confirm()`:

```typescript
private promptProjectTypes(detected: ProjectType[]): Promise<ProjectType[]> {
  const allTypes: ProjectType[] = ["python", "node", "typescript", "go", "rust"];
  return new Promise((resolve) => {
    let selected = new Set<ProjectType>(detected);
    let resolved = false;
    const modal = new (class extends Modal {
      onOpen() {
        this.contentEl.createEl("p", {
          text: detected.length > 0
            ? `Detected project types: ${detected.join(", ")}. Adjust if needed:`
            : "No project types detected. Select any that apply:",
        });
        for (const type of allTypes) {
          const row = this.contentEl.createEl("div", { attr: { style: "margin:4px 0" } });
          const cb = row.createEl("input", { attr: { type: "checkbox" } }) as HTMLInputElement;
          cb.checked = selected.has(type);
          cb.onchange = () => {
            if (cb.checked) selected.add(type);
            else selected.delete(type);
          };
          row.createEl("label", { text: ` ${type}`, attr: { style: "margin-left:6px" } });
        }
        const btn = this.contentEl.createEl("button", { text: "OK", attr: { style: "margin-top:12px" } });
        btn.onclick = () => { resolved = true; resolve(Array.from(selected)); this.close(); };
      }
      onClose() { if (!resolved) resolve(Array.from(selected)); }
    })(this.app);
    modal.open();
  });
}
```

- [ ] **Step 2: Update `runLinkSetupPublic` to detect + pass types**

Replace the scaffold call section in `runLinkSetupPublic`:

```typescript
const resolvedCode = expandTilde(codePath);
const detected = await detectProjectTypes(resolvedCode);
const activeTypes = await this.promptProjectTypes(detected);

const basePath = (this.app.vault.adapter as any).getBasePath?.() ?? "";
const vaultAbsPath = basePath ? `${basePath}/${vaultPath}` : vaultPath;
const result = await this.scaffoldingService.scaffold(
  codePath,
  vaultAbsPath,
  this.settings.claudeMdTemplate,
  activeTypes,
);
```

- [ ] **Step 3: Add a minimal test for the detection + scaffold path in `tests/main.test.ts` (if it exists) or skip if main.ts has no test file**

Since `main.ts` uses Obsidian APIs that are hard to mock, a build check is sufficient here. If a `tests/main.test.ts` exists, add a smoke test mocking `detectProjectTypes` to return `["python"]` and verify `scaffold` is called with `["python"]`.

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
cd ~/Desktop/obsidian-connector && npm run build 2>&1
```
Expected: clean build, no errors

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/obsidian-connector && git add src/main.ts
git commit -m "feat: detect project type at link time with user override modal"
```

> **Note:** After this task, `{{vaultName}}` and `{{pluginVersion}}` will appear in the settings UI variable reference (Task 7) but will render as literal text until Task 8 wires them through. This is expected mid-plan behavior.


---

### Task 7: Update settings UI — snippet insert buttons + variable reference

**Files:**
- Modify: `src/settings.ts`

- [ ] **Step 1: Add imports**

```typescript
import { SNIPPETS } from "./snippets";
```

- [ ] **Step 2: Replace the CLAUDE.md Template section in `display()`**

Find the section starting with `containerEl.createEl("h3", { text: "CLAUDE.md Template" })` and replace through the `resetBtn` with:

```typescript
containerEl.createEl("h3", { text: "CLAUDE.md Template" });
containerEl.createEl("p", {
  text: "Written to CLAUDE.md when linking a new project.",
  cls: "setting-item-description",
});

// Variable reference
const varRef = containerEl.createEl("details", { attr: { style: "margin-bottom:8px" } });
varRef.createEl("summary", { text: "Available variables", attr: { style: "cursor:pointer;font-size:12px;color:var(--text-muted)" } });
const varTable = varRef.createEl("table", { attr: { style: "font-size:12px;margin-top:4px;border-collapse:collapse" } });
const vars = [
  ["{{vaultPath}}", "Absolute path to the linked vault folder"],
  ["{{projectName}}", "Basename of the code directory"],
  ["{{date}}", "Link date as YYYY-MM-DD"],
  ["{{vaultName}}", "Obsidian vault name"],
  ["{{pluginVersion}}", "Plugin version"],
  ["{{#if python}}...{{/if}}", "Block shown only for Python projects"],
  ["{{#if node}}...{{/if}}", "Block shown only for Node projects"],
  ["{{#if typescript}}...{{/if}}", "Block shown only for TypeScript projects"],
  ["{{#if go}}...{{/if}}", "Block shown only for Go projects"],
  ["{{#if rust}}...{{/if}}", "Block shown only for Rust projects"],
];
for (const [v, desc] of vars) {
  const tr = varTable.createEl("tr");
  tr.createEl("td", { text: v, attr: { style: "font-family:monospace;padding:2px 8px 2px 0;white-space:nowrap" } });
  tr.createEl("td", { text: desc, attr: { style: "color:var(--text-muted)" } });
}

// Template editor
let templateTextArea: HTMLTextAreaElement;
new Setting(containerEl)
  .addTextArea((text) => {
    text
      .setValue(this.plugin.settings.claudeMdTemplate)
      .onChange(async (value: string) => {
        this.plugin.settings.claudeMdTemplate = value;
        await this.plugin.saveSettings();
      });
    text.inputEl.rows = 16;
    text.inputEl.style.width = "100%";
    text.inputEl.style.fontFamily = "monospace";
    text.inputEl.style.fontSize = "12px";
    templateTextArea = text.inputEl;
  });

// Snippet insert buttons
containerEl.createEl("p", { text: "Insert snippet:", attr: { style: "margin:6px 0 4px;font-size:12px;color:var(--text-muted)" } });
const snippetRow = containerEl.createEl("div", { attr: { style: "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px" } });
for (const snippet of SNIPPETS) {
  const btn = snippetRow.createEl("button", { text: snippet.label, cls: "oc-btn-small" });
  btn.onclick = () => {
    const ta = templateTextArea;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    ta.value = ta.value.slice(0, start) + snippet.content + ta.value.slice(start);
    ta.dispatchEvent(new Event("input"));
    this.plugin.settings.claudeMdTemplate = ta.value;
    this.plugin.saveSettings();
  };
}

// Reset button
const resetBtn = containerEl.createEl("button", { text: "Reset to default", cls: "oc-btn-small" });
resetBtn.onclick = async () => {
  this.plugin.settings.claudeMdTemplate = DEFAULT_CLAUDE_MD_TEMPLATE;
  await this.plugin.saveSettings();
  this.display();
};
```

- [ ] **Step 3: Add `vaultName` and `pluginVersion` to settings test**

```typescript
// tests/settings.test.ts — add:
it("has claudeMdTemplate with vaultPath variable", () => {
  expect(DEFAULT_SETTINGS.claudeMdTemplate).toContain("{{vaultPath}}");
});
```

- [ ] **Step 4: Run all tests**

```bash
cd ~/Desktop/obsidian-connector && npx jest --no-coverage
```
Expected: all tests PASS

- [ ] **Step 5: Build**

```bash
cd ~/Desktop/obsidian-connector && npm run build 2>&1
```
Expected: clean build

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/obsidian-connector && git add src/settings.ts tests/settings.test.ts
git commit -m "feat: add snippet insert buttons and variable reference to settings UI"
```

---

### Task 8: Wire vaultName + pluginVersion into main.ts render call

**Files:**
- Modify: `src/main.ts`

The `vaultName` and `pluginVersion` variables need to be passed to the template at scaffold time. Currently `buildClaudeMd` uses `renderTemplate` internally. We need to pass these through.

- [ ] **Step 1: Update `buildClaudeMd` in scaffolding.ts to accept full vars object**

```typescript
// src/scaffolding.ts
import { renderTemplate, TemplateVars, ProjectType } from "./template-engine";

export function buildClaudeMd(
  vars: TemplateVars,
  template: string,
  activeTypes: ProjectType[],
): string {
  return renderTemplate(template, vars, activeTypes);
}
```

Update the call inside `scaffold`:

```typescript
const vars: TemplateVars = {
  vaultPath: vaultAbsPath,
  projectName,
  date: new Date().toISOString().slice(0, 10),
  vaultName: this.vaultName,
  pluginVersion: this.pluginVersion,
};
await fs.writeFile(claudeMdPath, buildClaudeMd(vars, claudeMdTemplate, activeTypes), "utf-8");
```

Update `ScaffoldingService` constructor to accept `vaultName` and `pluginVersion`:

```typescript
export class ScaffoldingService {
  private app: any;
  private vaultName: string;
  private pluginVersion: string;

  constructor(app: any, vaultName: string, pluginVersion: string) {
    this.app = app;
    this.vaultName = vaultName;
    this.pluginVersion = pluginVersion;
  }
  // ... rest unchanged
}
```

- [ ] **Step 2: Update main.ts ScaffoldingService construction**

```typescript
// src/main.ts — in onload():
this.scaffoldingService = new ScaffoldingService(
  this.app,
  this.app.vault.getName(),
  this.manifest.version,
);
```

- [ ] **Step 3: Replace ALL content of `tests/scaffolding.test.ts` with the following** (the Task 5 signature is superseded — this is a full overwrite, not additive editing):

```typescript
// tests/scaffolding.test.ts — FULL FILE REPLACEMENT
import { buildClaudeMd } from "../src/scaffolding";
import { DEFAULT_CLAUDE_MD_TEMPLATE } from "../src/settings";

describe("buildClaudeMd", () => {
  it("renders vaultPath variable", () => {
    const md = buildClaudeMd({ vaultPath: "/my/vault" }, DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain("/my/vault");
  });

  it("renders projectName variable", () => {
    const md = buildClaudeMd({ projectName: "my-app" }, "project: {{projectName}}", []);
    expect(md).toBe("project: my-app");
  });

  it("renders date variable", () => {
    const md = buildClaudeMd({ date: "2026-03-14" }, "{{date}}", []);
    expect(md).toBe("2026-03-14");
  });

  it("renders vaultName variable", () => {
    const md = buildClaudeMd({ vaultName: "MyVault" }, "{{vaultName}}", []);
    expect(md).toBe("MyVault");
  });

  it("renders pluginVersion variable", () => {
    const md = buildClaudeMd({ pluginVersion: "0.2.0" }, "v{{pluginVersion}}", []);
    expect(md).toBe("v0.2.0");
  });

  it("renders python conditional when active", () => {
    const md = buildClaudeMd({}, "{{#if python}}use uv{{/if}}", ["python"]);
    expect(md).toContain("use uv");
  });

  it("suppresses python conditional when inactive", () => {
    const md = buildClaudeMd({}, "{{#if python}}use uv{{/if}}", []);
    expect(md).toBe("");
  });

  it("default template contains .claude-context.md", () => {
    const md = buildClaudeMd({ vaultPath: "/vault" }, DEFAULT_CLAUDE_MD_TEMPLATE, []);
    expect(md).toContain(".claude-context.md");
  });
});
```

- [ ] **Step 4: Run all tests**

```bash
cd ~/Desktop/obsidian-connector && npx jest --no-coverage
```
Expected: all tests PASS

- [ ] **Step 5: Build**

```bash
cd ~/Desktop/obsidian-connector && npm run build 2>&1
```
Expected: clean build

- [ ] **Step 6: Final commit**

```bash
cd ~/Desktop/obsidian-connector && git add src/scaffolding.ts src/main.ts tests/scaffolding.test.ts
git commit -m "feat: pass vaultName and pluginVersion into CLAUDE.md template renderer"
git push
```
