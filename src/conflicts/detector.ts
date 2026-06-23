import type { ComposedModule } from "../types/module";

export interface PinConflict {
  pin: string;
  moduleNames: string[];
  instanceIds: string[];
}

// power rails are excluded — sharing them is expected.
const SHARED_RAILS = new Set(["GND", "5V", "3.3V", "VCC", "3V3", "GROUND", "POWER"]);

export function detectConflicts(composed: ComposedModule[]): PinConflict[] {
  // pin → list of users
  const pinUsers = new Map<string, { name: string; instanceId: string }[]>();

  for (const item of composed) {
    for (const conn of item.module.wiringDiagram ?? []) {
      const pin = conn.boardPin.trim();
      if (SHARED_RAILS.has(pin.toUpperCase())) continue;

      if (!pinUsers.has(pin)) pinUsers.set(pin, []);
      pinUsers.get(pin)!.push({ name: item.module.name, instanceId: item.instanceId });
    }
  }

  const conflicts: PinConflict[] = [];

  for (const [pin, users] of pinUsers.entries()) {
    // skip if only one instance uses this pin
    const uniqueInstances = new Set(users.map((u) => u.instanceId));
    if (uniqueInstances.size <= 1) continue;

    conflicts.push({
      pin,
      moduleNames: [...new Set(users.map((u) => u.name))],
      instanceIds: [...uniqueInstances],
    });
  }

  return conflicts;
}

// returns instance IDs that have at least one conflicting pin.
export function conflictedInstanceIds(conflicts: PinConflict[]): Set<string> {
  const ids = new Set<string>();
  for (const c of conflicts) {
    for (const id of c.instanceIds) ids.add(id);
  }
  return ids;
}
