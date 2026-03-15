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
