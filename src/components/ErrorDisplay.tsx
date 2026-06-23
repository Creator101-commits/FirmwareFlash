import { troubleshoot } from "../errors/troubleshooter";

interface Props {
  error: string;
}

// shows a plain-English fix tip above the raw technical error.
export function ErrorDisplay({ error }: Props) {
  const fix = troubleshoot(error);

  return (
    <div className="mt-2 space-y-2">
      {fix && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">{fix}</p>
        </div>
      )}
      <details>
        <summary className="cursor-pointer select-none text-xs text-gray-400 hover:text-gray-600">
          Technical details
        </summary>
        <pre className="mt-1 overflow-x-auto rounded border border-gray-700 bg-gray-950 p-2 text-xs leading-relaxed text-red-300">
          {error}
        </pre>
      </details>
    </div>
  );
}
