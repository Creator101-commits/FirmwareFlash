import type { PinConflict } from "../conflicts/detector";

interface Props {
  conflicts: PinConflict[];
}

export function ConflictBanner({ conflicts }: Props) {
  if (conflicts.length === 0) return null;

  return (
    <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <p className="text-xs font-semibold text-red-700">
        Pin conflict{conflicts.length > 1 ? "s" : ""} detected
      </p>
      <ul className="mt-1 space-y-1">
        {conflicts.map((c) => (
          <li key={c.pin} className="text-xs text-red-600">
            <span className="font-mono font-semibold">{c.pin}</span> is used by{" "}
            {c.moduleNames.join(" and ")}.{" "}
            <span className="text-red-500">
              Change the pin parameter in one of these modules.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
