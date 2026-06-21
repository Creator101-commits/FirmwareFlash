const FQBN_MAP: Record<string, string> = {
  "Arduino Uno": "arduino:avr:uno",
  "ESP32": "esp32:esp32:esp32",
  "CH340 (common ESP32 clone)": "esp32:esp32:esp32",
};

export function boardFqbn(boardName: string): string | null {
  return FQBN_MAP[boardName] ?? null;
}
