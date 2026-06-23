import { useState } from "react";
import { WiringDiagram, type DiagramConnection } from "./WiringDiagram";
import type { ComposedModule } from "../types/module";
import { displayBoardName } from "../types/usb";
import type { UsbDevice } from "../types/usb";

interface Props {
  composed: ComposedModule[];
  board: UsbDevice;
}

async function printWiringGuide(composed: ComposedModule[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 20;

  const addPage = () => {
    doc.addPage();
    y = 20;
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Firmware Flash — Wiring Guide", 14, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
  y += 14;

  for (const item of composed) {
    const conns = item.module.wiringDiagram ?? [];
    if (conns.length === 0) continue;

    if (y > 250) addPage();
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(item.module.name, 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    for (const conn of conns) {
      if (y > 270) addPage();
      doc.text(`    Board ${conn.boardPin}  ->  ${conn.component} [${conn.componentPin}]`, 14, y);
      y += 7;
    }
    y += 4;
  }

  if (y > 240) addPage();
  y += 6;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Parts List", 14, y);
  y += 8;

  const parts = [
    ...new Set(
      composed.flatMap((i) => (i.module.wiringDiagram ?? []).map((w) => w.component)),
    ),
  ];

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  for (const part of parts) {
    if (y > 270) addPage();
    doc.text(`  - ${part}`, 14, y);
    y += 7;
  }

  doc.save("wiring-guide.pdf");
}

export function WiringPanel({ composed, board }: Props) {
  const [open, setOpen] = useState(false);

  const allConnections: DiagramConnection[] = composed.flatMap((item) =>
    (item.module.wiringDiagram ?? []).map((conn) => ({
      ...conn,
      moduleName: item.module.name,
    })),
  );

  if (allConnections.length === 0) return null;

  const boardName = displayBoardName(board);

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
        >
          <span>{open ? "v" : ">"}</span>
          Wiring Diagram
          <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-normal text-gray-500">
            {allConnections.length} connections
          </span>
        </button>
        {open && (
          <button
            type="button"
            onClick={() => { void printWiringGuide(composed); }}
            className="text-xs text-blue-600 hover:underline"
          >
            Print Wiring Guide (PDF)
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white p-3">
          <WiringDiagram connections={allConnections} boardName={boardName} />
          <div className="mt-3 border-t border-gray-100 pt-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Parts required
            </p>
            <ul className="flex flex-wrap gap-2">
              {[...new Set(allConnections.map((c) => c.component))].map((part) => (
                <li
                  key={part}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                >
                  {part}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
