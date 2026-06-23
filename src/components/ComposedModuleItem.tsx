import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ComposedModule } from "../types/module";

interface Props {
  item: ComposedModule;
  onRemove: (instanceId: string) => void;
  onParamChange: (instanceId: string, key: string, value: string) => void;
  isConflicted?: boolean;
}

export function ComposedModuleItem({ item, onRemove, onParamChange, isConflicted = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.instanceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const params = item.module.params ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start justify-between gap-3 rounded-lg border p-3 shadow-sm ${
        isConflicted ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="mt-0.5 cursor-grab text-gray-300 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        ::
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">
          {item.module.name}
          {isConflicted && (
            <span className="ml-1.5 text-xs text-red-500" title="Pin conflict">!</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 leading-snug">{item.module.description}</p>
        {item.module.requiredLibraries.length > 0 && (
          <p className="mt-1 text-xs text-amber-600">
            Requires: {item.module.requiredLibraries.join(", ")}
          </p>
        )}

        {params.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
            {params.map((param) => (
              <div key={param.key} className="flex items-center gap-2">
                <label
                  htmlFor={`${item.instanceId}-${param.key}`}
                  className="w-28 shrink-0 text-xs text-gray-500"
                >
                  {param.label}
                </label>
                {param.type === "select" ? (
                  <select
                    id={`${item.instanceId}-${param.key}`}
                    value={item.paramValues[param.key] ?? param.default}
                    onChange={(e) => onParamChange(item.instanceId, param.key, e.target.value)}
                    className="rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:border-blue-400 focus:outline-none"
                  >
                    {(param.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`${item.instanceId}-${param.key}`}
                    type={param.type}
                    value={item.paramValues[param.key] ?? param.default}
                    onChange={(e) => onParamChange(item.instanceId, param.key, e.target.value)}
                    className="w-24 rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:border-blue-400 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.instanceId)}
        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Remove module"
      >
        x
      </button>
    </div>
  );
}
