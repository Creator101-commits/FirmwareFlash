import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { invoke } from "@tauri-apps/api/core";

import { ModuleLibrary } from "./components/ModuleLibrary";
import { Composer } from "./components/Composer";
import { InoPreview } from "./components/InoPreview";
import { CompilePanel } from "./components/CompilePanel";
import { FlashPanel } from "./components/FlashPanel";
import { WiringPanel } from "./components/WiringPanel";
import { MemoryBars } from "./components/MemoryBars";
import { ConflictBanner } from "./components/ConflictBanner";
import { FlashHistory } from "./components/FlashHistory";
import { displayBoardName, formatUsbId, type UsbDevice } from "./types/usb";
import type { FirmwareModule, ComposedModule } from "./types/module";
import { generateIno } from "./codegen";
import { useHistory } from "./hooks/useHistory";
import { loadRecentBoards, saveRecentBoards } from "./utils/recentBoards";
import { detectConflicts, conflictedInstanceIds } from "./conflicts/detector";
import { estimateMemory } from "./memory/estimator";
import type { CompositionEntry } from "./utils/flashHistory";

import blinkRaw from "./modules/blink.json";
import wifiScannerRaw from "./modules/wifi-scanner.json";
import oledDisplayRaw from "./modules/oled-display.json";
import temperatureLoggerRaw from "./modules/temperature-logger.json";
import mqttPublisherRaw from "./modules/mqtt-publisher.json";
import servoControlRaw from "./modules/servo-control.json";
import ultrasonicRaw from "./modules/ultrasonic-distance.json";
import relayTriggerRaw from "./modules/relay-trigger.json";
import rgbLedRaw from "./modules/rgb-led-fade.json";
import buttonDebounceRaw from "./modules/button-debounce.json";

const ALL_MODULES: FirmwareModule[] = [
  blinkRaw,
  wifiScannerRaw,
  oledDisplayRaw,
  temperatureLoggerRaw,
  mqttPublisherRaw,
  servoControlRaw,
  ultrasonicRaw,
  relayTriggerRaw,
  rgbLedRaw,
  buttonDebounceRaw,
] as FirmwareModule[];

// ─── recipe file format ───────────────────────────────────────────────────────

interface RecipeEntry {
  moduleId: string;
  instanceId: string;
  paramValues: Record<string, string>;
}

interface RecipeFile {
  version: 1;
  composed: RecipeEntry[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function defaultParamValues(mod: FirmwareModule): Record<string, string> {
  return Object.fromEntries((mod.params ?? []).map((p) => [p.key, p.default]));
}

// ─── ConnectScreen ────────────────────────────────────────────────────────────

interface ConnectScreenProps {
  onSelect: (board: UsbDevice) => void;
  recentBoards: UsbDevice[];
}

function ConnectScreen({ onSelect, recentBoards }: ConnectScreenProps) {
  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<UsbDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDevices() {
      setLoading(true);
      setError(null);
      try {
        const detected = await invoke<UsbDevice[]>("list_usb_devices");
        if (!cancelled) setDevices(detected);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to scan USB devices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDevices();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold text-gray-900">Firmware Flash</h1>
      <p className="mt-1 text-sm text-gray-500">
        Select a connected board to start composing firmware.
      </p>

      {recentBoards.length > 0 && (
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Recently used
          </p>
          <div className="flex flex-wrap gap-2">
            {recentBoards.map((b) => (
              <button
                key={`${b.vid}-${b.pid}`}
                type="button"
                onClick={() => onSelect(b)}
                className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 transition hover:border-blue-400 hover:bg-gray-50"
              >
                {displayBoardName(b)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        {loading && <p className="text-sm text-gray-400">Scanning USB devices…</p>}

        {!loading && error && (
          <p className="text-sm text-red-500">Error: {error}</p>
        )}

        {!loading && !error && devices.length === 0 && (
          <p className="text-sm text-gray-400">
            No USB devices found. Plug in a board and restart the app.
          </p>
        )}

        {!loading && !error && devices.length > 0 && (
          <ul className="space-y-2">
            {devices.map((device) => {
              const key = `${device.vid}-${device.pid}-${device.manufacturer ?? ""}`;
              const isSelected =
                selectedBoard?.vid === device.vid &&
                selectedBoard?.pid === device.pid &&
                selectedBoard?.manufacturer === device.manufacturer;

              return (
                <li
                  key={key}
                  className={`rounded-lg border p-4 transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-gray-800">{displayBoardName(device)}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    VID: {formatUsbId(device.vid)} · PID: {formatUsbId(device.pid)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedBoard(device)}
                    className="mt-3 rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        disabled={!selectedBoard}
        onClick={() => selectedBoard && onSelect(selectedBoard)}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue to Composer →
      </button>
    </div>
  );
}

// ─── ComposerScreen ───────────────────────────────────────────────────────────

interface ComposerScreenProps {
  board: UsbDevice;
  onBack: () => void;
}

function ComposerScreen({ board, onBack }: ComposerScreenProps) {
  const history = useHistory<ComposedModule[]>([]);
  const composed = history.present;

  const [draggingModule, setDraggingModule] = useState<FirmwareModule | null>(null);
  const [hexPath, setHexPath] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const loadFileRef = useRef<HTMLInputElement>(null);

  const boardName = displayBoardName(board);

  // derived: conflict detection + memory estimate (memoised to avoid per-render recompute)
  const conflicts = useMemo(() => detectConflicts(composed), [composed]);
  const conflictIds = useMemo(() => conflictedInstanceIds(conflicts), [conflicts]);
  const memory = useMemo(() => estimateMemory(composed, boardName), [composed, boardName]);

  // ─── keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); history.undo(); }
      else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); history.redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history.undo, history.redo]);

  // ─── drag and drop ────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const mod = event.active.data.current?.module as FirmwareModule | undefined;
    if (mod) setDraggingModule(mod);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingModule(null);
      const { active, over } = event;
      if (!over) return;

      const isFromLibrary = ALL_MODULES.some((m) => m.id === active.id);
      const overId = over.id as string;

      if (isFromLibrary) {
        const mod = active.data.current?.module as FirmwareModule | undefined;
        if (!mod) return;
        const newItem: ComposedModule = {
          instanceId: `${mod.id}-${Date.now()}`,
          module: mod,
          paramValues: defaultParamValues(mod),
        };
        history.push((prev) => {
          const overIndex = prev.findIndex((i) => i.instanceId === overId);
          if (overIndex >= 0) {
            const next = [...prev];
            next.splice(overIndex, 0, newItem);
            return next;
          }
          return [...prev, newItem];
        });
        return;
      }

      if (active.id !== over.id) {
        history.push((prev) => {
          const oldIndex = prev.findIndex((i) => i.instanceId === active.id);
          const newIndex = prev.findIndex((i) => i.instanceId === over.id);
          if (oldIndex < 0 || newIndex < 0) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
    },
    [history.push],
  );

  const handleRemove = useCallback(
    (instanceId: string) => {
      history.push((prev) => prev.filter((i) => i.instanceId !== instanceId));
    },
    [history.push],
  );

  const updateParam = useCallback(
    (instanceId: string, key: string, value: string) => {
      history.set((prev) =>
        prev.map((item) =>
          item.instanceId === instanceId
            ? { ...item, paramValues: { ...item.paramValues, [key]: value } }
            : item,
        ),
      );
    },
    [history.set],
  );

  // ─── save / load recipe ───────────────────────────────────────────────────

  const saveRecipe = useCallback(() => {
    const recipe: RecipeFile = {
      version: 1,
      composed: composed.map((i) => ({
        moduleId: i.module.id,
        instanceId: i.instanceId,
        paramValues: i.paramValues,
      })),
    };
    downloadBlob(
      new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" }),
      "firmware-recipe.json",
    );
  }, [composed]);

  const handleLoadFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const recipe = JSON.parse(e.target?.result as string) as RecipeFile;
          if (recipe.version !== 1) throw new Error("unknown version");
          const restored: ComposedModule[] = recipe.composed.flatMap((entry) => {
            const mod = ALL_MODULES.find((m) => m.id === entry.moduleId);
            if (!mod) return [];
            return [{
              instanceId: entry.instanceId,
              module: mod,
              paramValues: { ...defaultParamValues(mod), ...entry.paramValues },
            }];
          });
          history.push(restored);
        } catch {
          // malformed recipe — silently ignore
        }
      };
      reader.readAsText(file);
    },
    [history.push],
  );

  // ─── restore from flash history ───────────────────────────────────────────

  const handleRestoreComposition = useCallback(
    (snapshot: CompositionEntry[]) => {
      const restored: ComposedModule[] = snapshot.flatMap((entry) => {
        const mod = ALL_MODULES.find((m) => m.id === entry.moduleId);
        if (!mod) return [];
        return [{
          instanceId: entry.instanceId,
          module: mod,
          paramValues: { ...defaultParamValues(mod), ...entry.paramValues },
        }];
      });
      history.push(restored);
      setHistoryOpen(false);
    },
    [history.push],
  );

  // ─── export project (JSZip) ───────────────────────────────────────────────

  const exportProject = useCallback(async () => {
    const { default: JSZip } = await import("jszip");
    const inoContent = generateIno(composed);
    const libs = [...new Set(composed.flatMap((i) => i.module.requiredLibraries))];
    const zip = new JSZip();
    const dir = zip.folder("firmware-flash-project")!;
    dir.file("sketch.ino", inoContent);
    dir.file(
      "libraries.txt",
      libs.length > 0 ? libs.join("\n") : "(no external libraries required)",
    );
    dir.file(
      "README.txt",
      [
        "Firmware Flash Export",
        "",
        libs.length > 0
          ? "Install these libraries in Arduino IDE before compiling:"
          : "No external libraries required.",
        ...libs.map((l) => `  - ${l}`),
        "",
        "Open sketch.ino in Arduino IDE to compile and upload.",
      ].join("\n"),
    );
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "firmware-flash-project.zip");
  }, [composed]);

  // ─── composed snapshot for FlashPanel ────────────────────────────────────

  const composedSnapshot: CompositionEntry[] = useMemo(
    () =>
      composed.map((i) => ({
        moduleId: i.module.id,
        instanceId: i.instanceId,
        moduleName: i.module.name,
        paramValues: i.paramValues,
      })),
    [composed],
  );

  // ─── compatible modules ───────────────────────────────────────────────────

  const compatibleModules = ALL_MODULES.filter(
    (m) => m.compatibleBoards.includes(boardName) || m.compatibleBoards.length === 0,
  );

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
            <h1 className="text-base font-semibold text-gray-800">Firmware Composer</h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* undo / redo */}
            <button
              type="button"
              disabled={!history.canUndo}
              onClick={history.undo}
              title="Undo (Cmd+Z)"
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              disabled={!history.canRedo}
              onClick={history.redo}
              title="Redo (Cmd+Shift+Z)"
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Redo
            </button>

            <span className="mx-1 text-gray-200">|</span>

            {/* save / load */}
            <button
              type="button"
              disabled={composed.length === 0}
              onClick={saveRecipe}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Recipe
            </button>
            <button
              type="button"
              onClick={() => loadFileRef.current?.click()}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Load Recipe
            </button>
            <input
              ref={loadFileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleLoadFile(e.target.files[0]);
                e.target.value = "";
              }}
            />

            <span className="mx-1 text-gray-200">|</span>

            {/* export */}
            <button
              type="button"
              disabled={composed.length === 0}
              onClick={() => { void exportProject(); }}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Project
            </button>

            {/* flash history */}
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              title="Flash history"
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              History
            </button>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              {boardName}
            </span>
          </div>
        </header>

        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <ModuleLibrary modules={compatibleModules} />

          <div className="flex flex-1 flex-col overflow-y-auto">
            <ConflictBanner conflicts={conflicts} />
            <Composer
              items={composed}
              onRemove={handleRemove}
              onParamChange={updateParam}
              conflictedIds={conflictIds}
            />
            <MemoryBars estimate={memory} />
            <InoPreview items={composed} />
            <WiringPanel composed={composed} board={board} />
            <CompilePanel composed={composed} boardName={boardName} onSuccess={setHexPath} />
            {hexPath && (
              <FlashPanel
                hexPath={hexPath}
                boardName={boardName}
                composedSnapshot={composedSnapshot}
              />
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggingModule && (
          <div className="rotate-1 rounded-lg border border-blue-300 bg-white p-3 shadow-lg">
            <p className="text-sm font-semibold text-gray-800">{draggingModule.name}</p>
          </div>
        )}
      </DragOverlay>

      <FlashHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestoreComposition}
      />
    </DndContext>
  );
}

// ─── App (root) ───────────────────────────────────────────────────────────────

type Screen = "connect" | "composer";

export default function App() {
  const [screen, setScreen] = useState<Screen>("connect");
  const [board, setBoard] = useState<UsbDevice | null>(null);
  const [recentBoards, setRecentBoards] = useState<UsbDevice[]>([]);

  useEffect(() => {
    void loadRecentBoards().then(setRecentBoards);
  }, []);

  const handleSelect = useCallback(
    (selected: UsbDevice) => {
      setBoard(selected);
      setScreen("composer");
      const updated = [
        selected,
        ...recentBoards.filter(
          (b) => !(b.vid === selected.vid && b.pid === selected.pid),
        ),
      ].slice(0, 3);
      setRecentBoards(updated);
      void saveRecentBoards(updated);
    },
    [recentBoards],
  );

  const handleBack = useCallback(() => setScreen("connect"), []);

  if (screen === "composer" && board) {
    return <ComposerScreen board={board} onBack={handleBack} />;
  }

  return <ConnectScreen onSelect={handleSelect} recentBoards={recentBoards} />;
}
