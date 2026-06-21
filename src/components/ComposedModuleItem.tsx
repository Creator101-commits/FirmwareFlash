import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ComposedModule } from "../types/module";

interface Props {
  item: ComposedModule;
  onRemove: (instanceId: string) => void;
}

export function ComposedModuleItem({ item, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.instanceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <div
        {...listeners}
        {...attributes}
        className="mt-0.5 cursor-grab text-gray-300 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        ⠿
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{item.module.name}</p>
        <p className="mt-0.5 text-xs text-gray-500 leading-snug">{item.module.description}</p>
        {item.module.requiredLibraries.length > 0 && (
          <p className="mt-1 text-xs text-amber-600">
            Requires: {item.module.requiredLibraries.join(", ")}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.instanceId)}
        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Remove module"
      >
        ✕
      </button>
    </div>
  );
}
