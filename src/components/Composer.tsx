import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ComposedModuleItem } from "./ComposedModuleItem";
import type { ComposedModule } from "../types/module";

interface Props {
  items: ComposedModule[];
  onRemove: (instanceId: string) => void;
}

export function Composer({ items, onRemove }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "composer-drop-zone" });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-64 flex-1 flex-col gap-2 rounded-lg border-2 border-dashed p-3 transition-colors ${
        isOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Composer
      </p>
      {items.length === 0 && (
        <p className="m-auto text-sm text-gray-400">
          Drag modules here to compose firmware
        </p>
      )}
      <SortableContext
        items={items.map((i) => i.instanceId)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <ComposedModuleItem key={item.instanceId} item={item} onRemove={onRemove} />
        ))}
      </SortableContext>
    </div>
  );
}
