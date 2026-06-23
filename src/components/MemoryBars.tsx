import { type MemoryEstimate, formatBytes } from "../memory/estimator";

interface BarProps {
  label: string;
  used: number;
  total: number;
}

function Bar({ label, used, total }: BarProps) {
  const pct = Math.min(100, (used / total) * 100);
  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-yellow-400" : "bg-blue-500";
  const textColor =
    pct >= 90 ? "text-red-600" : pct >= 75 ? "text-yellow-600" : "text-gray-500";
  const warning =
    pct >= 90
      ? "Running critically low — compilation may fail."
      : pct >= 75
        ? "Getting low."
        : null;

  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-xs ${textColor}`}>
          {formatBytes(used)} / {formatBytes(total)} ({Math.round(pct)}%)
          {warning && <span className="ml-1">{warning}</span>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  estimate: MemoryEstimate;
}

export function MemoryBars({ estimate }: Props) {
  if (estimate.flashUsed === 0 && estimate.ramUsed === 0) return null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Estimated usage
      </p>
      <Bar label="Flash" used={estimate.flashUsed} total={estimate.flashTotal} />
      <Bar label="SRAM" used={estimate.ramUsed} total={estimate.ramTotal} />
    </div>
  );
}
