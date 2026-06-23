import { load, type Store } from "@tauri-apps/plugin-store";
import type { UsbDevice } from "../types/usb";

// lazily loaded store — file lives in the app data directory.
let _store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!_store) {
    _store = await load("settings.json", { defaults: {}, autoSave: false });
  }
  return _store;
}

export async function loadRecentBoards(): Promise<UsbDevice[]> {
  try {
    const store = await getStore();
    return (await store.get<UsbDevice[]>("recentBoards")) ?? [];
  } catch {
    return [];
  }
}

export async function saveRecentBoards(boards: UsbDevice[]): Promise<void> {
  try {
    const store = await getStore();
    await store.set("recentBoards", boards);
    await store.save();
  } catch {
    // persistence errors are non-fatal
  }
}
