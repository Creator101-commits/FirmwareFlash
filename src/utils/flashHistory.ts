import { load } from "@tauri-apps/plugin-store";

export interface CompositionEntry {
  moduleId: string;
  instanceId: string;
  moduleName: string;
  paramValues: Record<string, string>;
}

export interface FlashHistoryEntry {
  id: string;
  timestamp: number;
  boardName: string;
  moduleNames: string[];
  composed: CompositionEntry[];
  success: boolean;
  errorMessage?: string;
  verification?: { verified: boolean; mismatchPages: number[] };
}

const MAX_ENTRIES = 50;

async function getStore() {
  return load("flash-history.json", { defaults: {}, autoSave: false });
}

export async function loadFlashHistory(): Promise<FlashHistoryEntry[]> {
  try {
    const store = await getStore();
    return (await store.get<FlashHistoryEntry[]>("entries")) ?? [];
  } catch {
    return [];
  }
}

export async function appendFlashHistory(
  entry: Omit<FlashHistoryEntry, "id">,
): Promise<void> {
  try {
    const store = await getStore();
    const existing = (await store.get<FlashHistoryEntry[]>("entries")) ?? [];
    const newEntry: FlashHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    const trimmed = [newEntry, ...existing].slice(0, MAX_ENTRIES);
    await store.set("entries", trimmed);
    await store.save();
  } catch {
    // persistence errors are non-fatal
  }
}

export async function clearFlashHistory(): Promise<void> {
  try {
    const store = await getStore();
    await store.set("entries", []);
    await store.save();
  } catch {
    // ignore
  }
}
