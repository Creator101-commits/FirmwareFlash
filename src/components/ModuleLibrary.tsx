import { ModuleCard } from "./ModuleCard";
import type { FirmwareModule } from "../types/module";

interface Props {
  modules: FirmwareModule[];
}

export function ModuleLibrary({ modules }: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Modules
      </p>
      {modules.map((m) => (
        <ModuleCard key={m.id} module={m} />
      ))}
    </aside>
  );
}
