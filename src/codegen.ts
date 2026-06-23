import type { ComposedModule, ModuleParam } from "./types/module";

// replaces {{key}} placeholders with param values, falling back to the param default.
function applyParams(
  code: string,
  params: ModuleParam[] | undefined,
  values: Record<string, string>,
): string {
  const defaults = Object.fromEntries((params ?? []).map((p) => [p.key, p.default]));
  const merged = { ...defaults, ...values };
  return code.replace(/\{\{(\w+)\}\}/g, (_, key: string) => merged[key] ?? `{{${key}}}`);
}

// builds a valid .ino from the composed module list.
// libraries are deduplicated; setup/loop blocks are concatenated in order.
// {{paramKey}} placeholders in setupCode/loopCode are substituted before output.
export function generateIno(items: ComposedModule[]): string {
  if (items.length === 0) {
    return "// add modules to the composer to generate code.";
  }

  const libs = [...new Set(items.flatMap((i) => i.module.requiredLibraries))];
  const includes = libs.map((l) => `#include <${l}.h>`).join("\n");

  const setupBody = items
    .map((i) => {
      const code = applyParams(i.module.setupCode, i.module.params, i.paramValues);
      return `  // --- ${i.module.name} ---\n${code}`;
    })
    .join("\n\n");

  const loopBody = items
    .map((i) => {
      const code = applyParams(i.module.loopCode, i.module.params, i.paramValues);
      return `  // --- ${i.module.name} ---\n${code}`;
    })
    .join("\n\n");

  const parts: string[] = [];
  if (includes) parts.push(includes, "");
  parts.push("void setup() {", setupBody, "}", "", "void loop() {", loopBody, "}");

  return parts.join("\n");
}
