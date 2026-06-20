export interface UsbDevice {
  vid: number;
  pid: number;
  manufacturer: string | null;
  board_name: string | null;
}

export function formatUsbId(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function displayBoardName(device: UsbDevice): string {
  return device.board_name ?? device.manufacturer ?? "Unknown device";
}
