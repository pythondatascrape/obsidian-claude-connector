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
