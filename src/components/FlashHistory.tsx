import { useEffect, useState } from "react";
import {
  loadFlashHistory,
  clearFlashHistory,
  type FlashHistoryEntry,
  type CompositionEntry,
} from "../utils/flashHistory";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (composed: CompositionEntry[]) => void;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FlashHistory({ isOpen, onClose, onRestore }: Props) {
  const [entries, setEntries] = useState<FlashHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    void loadFlashHistory()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleClear = async () => {
    await clearFlashHistory();
    setEntries([]);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Flash History</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <p className="text-xs text-gray-400">Loading...</p>
          )}

          {!loading && entries.length === 0 && (
            <p className="text-xs text-gray-400">No flash attempts recorded yet.</p>
          )}

          {!loading && entries.map((entry) => (
            <div
              key={entry.id}
              className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-700">
                    {entry.boardName}
                  </p>
                  <p className="text-xs text-gray-400">{formatTs(entry.timestamp)}</p>
                </div>
                <span
                  className={`shrink-0 text-xs font-bold ${
                    entry.success ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {entry.success ? "OK" : "Failed"}
                </span>
              </div>

              {entry.moduleNames.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {entry.moduleNames.join(", ")}
                </p>
              )}

              {entry.verification && (
                <p
                  className={`mt-0.5 text-xs ${
                    entry.verification.verified ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {entry.verification.verified
                    ? "Verified"
                    : `Verify failed — ${entry.verification.mismatchPages.length} page(s) mismatched`}
                </p>
              )}

              {entry.errorMessage && (
                <p className="mt-1 truncate text-xs text-red-500">
                  {entry.errorMessage}
                </p>
              )}

              {entry.composed.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRestore(entry.composed)}
                  className="mt-2 w-full rounded border border-gray-300 py-1 text-xs text-gray-600 hover:bg-gray-100"
                >
                  Restore this composition
                </button>
              )}
            </div>
          ))}
        </div>

        {entries.length > 0 && (
          <div className="border-t border-gray-200 p-3">
            <button
              type="button"
              onClick={() => { void handleClear(); }}
              className="w-full rounded border border-red-200 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              Clear history
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
