import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { ErrorDisplay } from "./ErrorDisplay";
import { appendFlashHistory, type CompositionEntry } from "../utils/flashHistory";

interface FlashProgress {
  page: number;
  total: number;
  percent: number;
}

interface VerifyProgress {
  page: number;
  total: number;
  percent: number;
}

interface FlashResult {
  verified: boolean;
  mismatchPages: number[];
}

type FlashStatus = "idle" | "flashing" | "done" | "error";

interface Props {
  hexPath: string;
  boardName: string;
  composedSnapshot: CompositionEntry[];
}

export function FlashPanel({ hexPath, boardName, composedSnapshot }: Props) {
  const [ports, setPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [status, setStatus] = useState<FlashStatus>("idle");
  const [flashProgress, setFlashProgress] = useState<FlashProgress | null>(null);
  const [verifyProgress, setVerifyProgress] = useState<VerifyProgress | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [flashResult, setFlashResult] = useState<FlashResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const unlistenFlash = useRef<UnlistenFn | null>(null);
  const unlistenVerify = useRef<UnlistenFn | null>(null);

  async function loadPorts() {
    try {
      const p = await invoke<string[]>("list_serial_ports");
      setPorts(p);
      if (p.length > 0 && selectedPort === "") setSelectedPort(p[0]);
    } catch {
      setPorts([]);
    }
  }

  useEffect(() => {
    void loadPorts();
    return () => {
      unlistenFlash.current?.();
      unlistenVerify.current?.();
    };
  }, []);

  const canFlash = selectedPort !== "" && status !== "flashing";

  async function handleFlash() {
    if (!canFlash) return;

    setStatus("flashing");
    setFlashProgress(null);
    setVerifyProgress(null);
    setIsVerifying(false);
    setFlashResult(null);
    setErrorMsg(null);

    unlistenFlash.current?.();
    unlistenVerify.current?.();

    // register event listeners before invoking so no events are missed
    const unFlash = await listen<FlashProgress>("flash-progress", (e) => {
      setFlashProgress(e.payload);
    });
    unlistenFlash.current = unFlash;

    const unVerify = await listen<VerifyProgress>("verify-progress", (e) => {
      setIsVerifying(true);
      setVerifyProgress(e.payload);
    });
    unlistenVerify.current = unVerify;

    let success = false;
    let errMsg: string | undefined;
    let result: FlashResult | undefined;

    try {
      result = await invoke<FlashResult>("flash_firmware", {
        portName: selectedPort,
        hexPath,
      });
      setFlashResult(result);
      setStatus("done");
      success = true;
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "unknown error";
      errMsg = msg;
      setErrorMsg(msg);
      setStatus("error");
    } finally {
      await new Promise<void>((r) => setTimeout(r, 150));
      unFlash();
      unVerify();
      unlistenFlash.current = null;
      unlistenVerify.current = null;
    }

    // save to flash history regardless of outcome
    void appendFlashHistory({
      timestamp: Date.now(),
      boardName,
      moduleNames: composedSnapshot.map((e) => e.moduleName),
      composed: composedSnapshot,
      success,
      errorMessage: errMsg,
      verification: result
        ? { verified: result.verified, mismatchPages: result.mismatchPages }
        : undefined,
    });
  }

  const showFlashBar = status === "flashing" && !isVerifying && flashProgress;
  const showVerifyBar = status === "flashing" && isVerifying && verifyProgress;

  return (
    <section className="mt-4 border-t border-gray-100 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Flash to board
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
          disabled={status === "flashing"}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-700 disabled:opacity-50"
        >
          {ports.length === 0 ? (
            <option value="">No ports found</option>
          ) : (
            ports.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))
          )}
        </select>

        <button
          type="button"
          onClick={() => { void loadPorts(); }}
          disabled={status === "flashing"}
          className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>

        <button
          type="button"
          onClick={() => { void handleFlash(); }}
          disabled={!canFlash}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "flashing"
            ? isVerifying
              ? "Verifying…"
              : "Flashing…"
            : "Flash"}
        </button>

        {status === "error" && (
          <button
            type="button"
            onClick={() => { void handleFlash(); }}
            className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Retry Flash
          </button>
        )}
      </div>

      {/* flash write progress */}
      {showFlashBar && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Writing page {flashProgress.page} of {flashProgress.total}</span>
            <span>{flashProgress.percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-150"
              style={{ width: `${flashProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* verification progress */}
      {showVerifyBar && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Verifying page {verifyProgress.page} of {verifyProgress.total}</span>
            <span>{verifyProgress.percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-purple-500 transition-all duration-150"
              style={{ width: `${verifyProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {status === "done" && flashResult?.verified && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-semibold text-green-700">
            Flash verified — all {flashProgress?.total ?? verifyProgress?.total ?? "?"} pages match
          </p>
          <p className="mt-0.5 text-xs text-green-600">{hexPath}</p>
        </div>
      )}

      {status === "done" && flashResult && !flashResult.verified && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            Flash written but verification failed
          </p>
          <p className="mt-0.5 text-xs text-red-600">
            Mismatched pages:{" "}
            {flashResult.mismatchPages.map((p) => `#${p}`).join(", ")}
          </p>
          <p className="mt-1 text-xs text-red-500">
            Try flashing again. If this repeats, check your USB cable or board.
          </p>
          <button
            type="button"
            onClick={() => { void handleFlash(); }}
            className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            Retry Flash
          </button>
        </div>
      )}

      {/* error */}
      {status === "error" && errorMsg && (
        <ErrorDisplay error={errorMsg} />
      )}
    </section>
  );
}
