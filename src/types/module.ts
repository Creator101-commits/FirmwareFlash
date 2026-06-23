export interface ModuleParam {
  key: string;
  label: string;
  type: "number" | "text" | "select";
  default: string;
  options?: string[];
}

export interface WiringConnection {
  component: string;
  boardPin: string;
  componentPin: string;
}

export interface FirmwareModule {
  id: string;
  name: string;
  description: string;
  category?: string;
  compatibleBoards: string[];
  requiredLibraries: string[];
  params?: ModuleParam[];
  wiringDiagram?: WiringConnection[];
  /** estimated incremental flash usage in bytes for Arduino Uno */
  flashBytes?: number;
  /** estimated incremental SRAM usage in bytes for Arduino Uno */
  ramBytes?: number;
  setupCode: string;
  loopCode: string;
}

// represents a module dropped into the composer.
// instanceId is unique per drop so the same module can appear multiple times.
export interface ComposedModule {
  instanceId: string;
  module: FirmwareModule;
  paramValues: Record<string, string>;
}
