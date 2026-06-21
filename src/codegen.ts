import type { ComposedModule } from "./types/module";

// builds a valid .ino from the composed module list.
// libraries are deduplicated; setup/loop blocks are concatenated in order.
export function generateIno(items: ComposedModule[]): string {
  if (items.length === 0) {
    return "// Add modules to the composer to generate code.";
  }

  const libs = [...new Set(items.flatMap((i) => i.module.requiredLibraries))];
  const includes = libs.map((l) => `#include <${l}.h>`).join("\n");

  const setupBody = items
    .map((i) => `  // --- ${i.module.name} ---\n${i.module.setupCode}`)
    .join("\n\n");

  const loopBody = items
    .map((i) => `  // --- ${i.module.name} ---\n${i.module.loopCode}`)
    .join("\n\n");

  const parts: string[] = [];
  if (includes) parts.push(includes, "");
  parts.push("void setup() {", setupBody, "}", "", "void loop() {", loopBody, "}");

  return parts.join("\n");
}
