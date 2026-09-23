import { nucleus04Processor } from "../../../lib/soul-core/Nucleus04Processor";
import { getN04CapabilityState } from "../../../lib/soul-core/N04CapabilityState";

export type CoreModuleCardProjection = {
  id: string;
  name: string;
  description: string;
  registered: boolean;
  executable: boolean;
  status: "EXECUTABLE" | "UNBOUND";
  authority: "N04";
};

export class CoreModuleCardModule {
  readonly id = "L5.CoreModuleCardModule";
  private active = false;

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  listCards(): CoreModuleCardProjection[] {
    if (!this.active) return [];

    return getN04CapabilityState().map((state) => ({
      id: state.capability,
      name: state.capability,
      description: `Capability declarada pelo runtime N04: ${state.capability}`,
      registered: state.registered,
      executable: state.executable,
      status: state.executable ? "EXECUTABLE" : "UNBOUND",
      authority: "N04" as const,
    }));
  }

  getRuntimeIdentity(): string {
    return nucleus04Processor.id;
  }
}

export const coreModuleCardModule = new CoreModuleCardModule();
