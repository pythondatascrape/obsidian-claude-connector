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
