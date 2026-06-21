import { useEffect, useState, useCallback } from "react";
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
import { displayBoardName, formatUsbId, type UsbDevice } from "./types/usb";
import type { FirmwareModule, ComposedModule } from "./types/module";

import blinkRaw from "./modules/blink.json";
import wifiScannerRaw from "./modules/wifi-scanner.json";
import oledDisplayRaw from "./modules/oled-display.json";
import temperatureLoggerRaw from "./modules/temperature-logger.json";
import mqttPublisherRaw from "./modules/mqtt-publisher.json";

const ALL_MODULES: FirmwareModule[] = [
  blinkRaw,
  wifiScannerRaw,
  oledDisplayRaw,
  temperatureLoggerRaw,
  mqttPublisherRaw,
];

interface ConnectScreenProps {
  onSelect: (board: UsbDevice) => void;
}

function ConnectScreen({ onSelect }: ConnectScreenProps) {
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
                    {isSelected ? "Selected ✓" : "Select"}
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

interface ComposerScreenProps {
  board: UsbDevice;
  onBack: () => void;
}

function ComposerScreen({ board, onBack }: ComposerScreenProps) {
  const [composed, setComposed] = useState<ComposedModule[]>([]);
  const [draggingModule, setDraggingModule] = useState<FirmwareModule | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const mod = event.active.data.current?.module as FirmwareModule | undefined;
    if (mod) setDraggingModule(mod);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
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
      };
      setComposed((prev) => {
        // insert before the target item if dropped onto one, otherwise append.
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

    // reorder within the composer.
    if (active.id !== over.id) {
      setComposed((prev) => {
        const oldIndex = prev.findIndex((i) => i.instanceId === active.id);
        const newIndex = prev.findIndex((i) => i.instanceId === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleRemove = useCallback((instanceId: string) => {
    setComposed((prev) => prev.filter((i) => i.instanceId !== instanceId));
  }, []);

  const boardName = displayBoardName(board);
  const compatibleModules = ALL_MODULES.filter(
    (m) => m.compatibleBoards.includes(boardName) || m.compatibleBoards.length === 0,
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
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
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {boardName}
          </span>
        </header>

        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <ModuleLibrary modules={compatibleModules} />

          <div className="flex flex-1 flex-col overflow-y-auto">
            <Composer items={composed} onRemove={handleRemove} />
            <InoPreview items={composed} />
            <CompilePanel composed={composed} boardName={boardName} />
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
    </DndContext>
  );
}

type Screen = "connect" | "composer";

export default function App() {
  const [screen, setScreen] = useState<Screen>("connect");
  const [board, setBoard] = useState<UsbDevice | null>(null);

  const handleSelect = useCallback((selected: UsbDevice) => {
    setBoard(selected);
    setScreen("composer");
  }, []);

  const handleBack = useCallback(() => {
    setScreen("connect");
  }, []);

  if (screen === "composer" && board) {
    return <ComposerScreen board={board} onBack={handleBack} />;
  }

  return <ConnectScreen onSelect={handleSelect} />;
}
