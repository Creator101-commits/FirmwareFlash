// SVG wiring diagram: board pins on the left, component + pin on the right,
// dashed lines connecting them. each unique component gets its own color.

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export interface DiagramConnection {
  component: string;
  boardPin: string;
  componentPin: string;
  moduleName?: string;
}

interface Props {
  connections: DiagramConnection[];
  boardName: string;
}

const ROW_H = 34;
const PAD_TOP = 36;
const BOARD_W = 96;
const COMP_X = 280;
const COMP_W = 210;
const SVG_W = 500;

export function WiringDiagram({ connections, boardName }: Props) {
  if (connections.length === 0) return null;

  const uniqueComponents = [...new Set(connections.map((c) => c.component))];
  const colorOf = (comp: string) =>
    COLORS[uniqueComponents.indexOf(comp) % COLORS.length];

  const boardLabel = boardName.toLowerCase().includes("esp32") ? "ESP32" : "Arduino Uno";
  const height = connections.length * ROW_H + PAD_TOP + 16;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${height}`}
      width="100%"
      style={{ height, display: "block" }}
      aria-label="Wiring diagram"
    >
      {/* board silhouette */}
      <rect x="2" y="4" width={BOARD_W + 8} height={height - 8} rx="6" fill="#0f172a" />
      <text
        x={BOARD_W / 2 + 6}
        y="22"
        fontSize="9"
        textAnchor="middle"
        fill="#64748b"
        fontFamily="monospace"
      >
        {boardLabel}
      </text>

      {connections.map((conn, i) => {
        const color = colorOf(conn.component);
        const y = PAD_TOP + i * ROW_H + ROW_H / 2;
        const pinRight = BOARD_W + 4; // right edge of board
        const lineEnd = COMP_X - 4;

        return (
          <g key={i}>
            {/* board pin pill */}
            <rect
              x="6"
              y={y - 11}
              width={BOARD_W - 2}
              height="22"
              rx="4"
              fill={color}
              fillOpacity="0.15"
            />
            <rect
              x="6"
              y={y - 11}
              width={BOARD_W - 2}
              height="22"
              rx="4"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
            />
            <text
              x={BOARD_W / 2 + 3}
              y={y + 5}
              fontSize="10"
              textAnchor="middle"
              fill={color}
              fontFamily="monospace"
              fontWeight="600"
            >
              {conn.boardPin}
            </text>

            {/* connecting line */}
            <line
              x1={pinRight}
              y1={y}
              x2={lineEnd}
              y2={y}
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="5,3"
            />
            {/* arrow head */}
            <polygon
              points={`${lineEnd},${y - 4} ${lineEnd + 8},${y} ${lineEnd},${y + 4}`}
              fill={color}
            />

            {/* component + pin label */}
            <rect
              x={COMP_X + 4}
              y={y - 11}
              width={COMP_W - 8}
              height="22"
              rx="4"
              fill={color}
              fillOpacity="0.1"
            />
            <rect
              x={COMP_X + 4}
              y={y - 11}
              width={COMP_W - 8}
              height="22"
              rx="4"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
            <text
              x={COMP_X + 12}
              y={y + 5}
              fontSize="10"
              fill="#1e293b"
              fontFamily="sans-serif"
            >
              {conn.component}
              <tspan fill="#64748b"> · {conn.componentPin}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
