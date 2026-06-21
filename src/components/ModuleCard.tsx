import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { FirmwareModule } from "../types/module";

interface Props {
  module: FirmwareModule;
}

export function ModuleCard({ module }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: module.id, data: { module } });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm select-none active:cursor-grabbing"
    >
      <p className="text-sm font-semibold text-gray-800">{module.name}</p>
      <p className="mt-1 text-xs text-gray-500 leading-snug">{module.description}</p>
      {module.compatibleBoards.length > 0 && (
        <p className="mt-2 text-xs text-blue-500">
          {module.compatibleBoards.join(" · ")}
        </p>
      )}
    </div>
  );
}
