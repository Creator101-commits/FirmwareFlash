export interface FirmwareModule {
  id: string;
  name: string;
  description: string;
  compatibleBoards: string[];
  requiredLibraries: string[];
  setupCode: string;
  loopCode: string;
}

// represents a module that has been dropped into the composer.
// instanceId is unique per drop so the same module can appear multiple times.
export interface ComposedModule {
  instanceId: string;
  module: FirmwareModule;
}
