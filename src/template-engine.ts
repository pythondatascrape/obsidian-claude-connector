export interface TemplateVars {
  vaultPath?: string;
  projectName?: string;
  date?: string;
  vaultName?: string;
  pluginVersion?: string;
  [key: string]: string | undefined;
}

export type ProjectType = "python" | "node" | "typescript" | "go" | "rust";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderTemplate(template: string, vars: TemplateVars, activeTypes: ProjectType[]): string {
  let result = template;

  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      const pattern = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, "g");
      result = result.replace(pattern, () => value);
    }
  }

  return result;
}
