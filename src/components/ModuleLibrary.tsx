import { useState } from "react";
import { ModuleCard } from "./ModuleCard";
import type { FirmwareModule } from "../types/module";

interface Props {
  modules: FirmwareModule[];
}

export function ModuleLibrary({ modules }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [...new Set(modules.map((m) => m.category ?? "Other").filter(Boolean))].sort();

  const filtered = modules.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q === "" ||
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q);
    const matchesCategory =
      activeCategory === null || (m.category ?? "Other") === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Modules
      </p>

      {/* search */}
      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
      />

      {/* category filter pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-2 py-0.5 text-xs transition ${
              activeCategory === null
                ? "bg-blue-600 text-white"
                : "border border-gray-200 text-gray-500 hover:bg-gray-100"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`rounded-full px-2 py-0.5 text-xs transition ${
                activeCategory === cat
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* module list */}
      <div className="flex flex-col gap-2 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No modules match.</p>
        )}
        {filtered.map((m) => (
          <ModuleCard key={m.id} module={m} />
        ))}
      </div>
    </aside>
  );
}
