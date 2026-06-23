import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { generateIno } from "../codegen";
import { boardFqbn } from "../types/fqbn";
import type { ComposedModule } from "../types/module";
import { troubleshootAll } from "../errors/troubleshooter";

type CompileStatus = "idle" | "compiling" | "success" | "error";

interface Props {
  composed: ComposedModule[];
  boardName: string;
  onSuccess?: (hexPath: string) => void;
}

export function CompilePanel({ composed, boardName, onSuccess }: Props) {
  const [status, setStatus] = useState<CompileStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [hexPath, setHexPath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // clean up listener if this component unmounts mid-compile.
  useEffect(() => {
    return () => { unlistenRef.current?.(); };
  }, []);

  const fqbn = boardFqbn(boardName);
  const canCompile = composed.length > 0 && fqbn !== null && status !== "compiling";

  async function handleCompile() {
    if (!canCompile || !fqbn) return;

    setStatus("compiling");
    setLogs([]);
    setHexPath(null);
    setErrorMsg(null);

    unlistenRef.current?.();
    unlistenRef.current = null;

    // listen before invoking so we don't miss early log events.
    const unlisten = await listen<string>("compile-log", (event) => {
      setLogs((prev) => [...prev, event.payload]);
    });
    unlistenRef.current = unlisten;

    try {
      const inoContent = generateIno(composed);
      const path = await invoke<string>("compile_sketch", {
        inoContent,
        boardFqbn: fqbn,
      });
      setHexPath(path);
      setStatus("success");
      onSuccess?.(path);
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setErrorMsg(msg);
      setStatus("error");
    } finally {
      // small delay so trailing log events arrive before we unlisten.
      await new Promise<void>((r) => setTimeout(r, 150));
      unlisten();
      if (unlistenRef.current === unlisten) unlistenRef.current = null;
    }
  }

  const showLog = status !== "idle";
  const tip = status === "error" ? troubleshootAll(logs) : null;

  return (
    <section className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { void handleCompile(); }}
          disabled={!canCompile}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "compiling" ? "Compiling…" : "Compile"}
        </button>

        {!fqbn && (
          <p className="text-xs text-amber-600">No FQBN mapping for "{boardName}"</p>
        )}

        {status === "success" && (
          <span className="text-sm font-medium text-green-600">Compiled successfully</span>
        )}

        {status === "error" && (
          <span className="text-sm font-medium text-red-500">Compilation failed</span>
        )}
      </div>

      {/* plain-English tip above the log when compilation fails */}
      {status === "error" && tip && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">{tip}</p>
        </div>
      )}

      {showLog && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-gray-950 p-3 font-mono text-xs leading-relaxed">
          {logs.length === 0 && status === "compiling" && (
            <p className="text-gray-500">Waiting for arduino-cli output…</p>
          )}

          {logs.map((line, i) => (
            <p key={i} className="text-gray-300">{line}</p>
          ))}

          {status === "success" && hexPath && (
            <p className="mt-2 text-green-400">Output → {hexPath}</p>
          )}

          {status === "error" && errorMsg && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300">
                Technical details
              </summary>
              <p className="mt-1 text-red-400">{errorMsg}</p>
            </details>
          )}

          <div ref={logsEndRef} />
        </div>
      )}
    </section>
  );
}
