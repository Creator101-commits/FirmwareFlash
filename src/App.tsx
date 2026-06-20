import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  displayBoardName,
  formatUsbId,
  type UsbDevice,
} from "./types/usb";

function App() {
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
        if (!cancelled) {
          setDevices(detected);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to scan USB devices",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDevices();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Firmware Flash</h1>
      <p className="mt-1 text-gray-600">Connect a board and select it to continue.</p>

      <div className="mt-6">
        {loading && <p className="text-gray-500">Scanning USB devices...</p>}

        {!loading && error && (
          <p className="text-red-600">Could not scan USB devices: {error}</p>
        )}

        {!loading && !error && devices.length === 0 && (
          <p className="text-gray-500">No USB devices found. Plug in a board and try again.</p>
        )}

        {!loading && !error && devices.length > 0 && (
          <ul className="space-y-3">
            {devices.map((device) => {
              const isSelected =
                selectedBoard?.vid === device.vid &&
                selectedBoard?.pid === device.pid &&
                selectedBoard?.manufacturer === device.manufacturer;

              return (
                <li
                  key={`${device.vid}-${device.pid}-${device.manufacturer ?? "unknown"}`}
                  className={`rounded-lg border p-4 ${
                    isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <p className="font-medium">{displayBoardName(device)}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    VID: {formatUsbId(device.vid)} · PID: {formatUsbId(device.pid)}
                  </p>
                  {device.manufacturer && (
                    <p className="mt-1 text-sm text-gray-500">{device.manufacturer}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedBoard(device)}
                    className="mt-3 rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedBoard && (
        <p className="mt-6 text-sm text-gray-600">
          Selected: {displayBoardName(selectedBoard)} ({formatUsbId(selectedBoard.vid)} /{" "}
          {formatUsbId(selectedBoard.pid)})
        </p>
      )}
    </div>
  );
}

export default App;
