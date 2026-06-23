import type { ComposedModule } from "../types/module";

interface BoardProfile {
  flash: number; // bytes
  ram: number;   // bytes
}

const BOARD_PROFILES: Record<string, BoardProfile> = {
  "Arduino Uno": { flash: 32256, ram: 2048 },
  "ESP32": { flash: 4 * 1024 * 1024, ram: 327680 },
  "CH340 (common ESP32 clone)": { flash: 4 * 1024 * 1024, ram: 327680 },
};

// arduino runtime baseline before any sketch code.
const BASELINE_FLASH = 444;
const BASELINE_RAM = 9;

export interface MemoryEstimate {
  flashUsed: number;
  flashTotal: number;
  ramUsed: number;
  ramTotal: number;
}

export function estimateMemory(
  composed: ComposedModule[],
  boardName: string,
): MemoryEstimate {
  const profile = BOARD_PROFILES[boardName] ?? BOARD_PROFILES["Arduino Uno"];

  const flashUsed =
    BASELINE_FLASH +
    composed.reduce((sum, i) => sum + (i.module.flashBytes ?? 0), 0);

  const ramUsed =
    BASELINE_RAM +
    composed.reduce((sum, i) => sum + (i.module.ramBytes ?? 0), 0);

  return {
    flashUsed,
    flashTotal: profile.flash,
    ramUsed,
    ramTotal: profile.ram,
  };
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
