import { escapeRegex } from "./utils";

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

  // Process conditional blocks first
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, condition, content) => {
    return activeTypes.includes(condition as ProjectType) ? content : "";
  });

  // Replace variables
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      const pattern = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, "g");
      result = result.replace(pattern, () => value);
    }
  }

  return result;
}
