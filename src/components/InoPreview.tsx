import { generateIno } from "../codegen";
import type { ComposedModule } from "../types/module";

interface Props {
  items: ComposedModule[];
}

export function InoPreview({ items }: Props) {
  const code = generateIno(items);

  return (
    <section className="mt-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Generated .ino
      </p>
      <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-xs leading-relaxed text-green-300">
        {code}
      </pre>
    </section>
  );
}
