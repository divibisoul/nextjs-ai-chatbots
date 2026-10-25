import { nucleus04Processor, type Nucleus04Capability } from "../../../lib/soul-core/Nucleus04Processor";
import { getN04CapabilityState } from "../../../lib/soul-core/N04CapabilityState";

export interface EngineeringCapability { id: Nucleus04Capability; registered: boolean; executable: boolean; }
export interface EngineeringOperation { id: string; name: string; progressPercent: number | null; }

export class EngineeringPanelModule {
  readonly id = "engineering-panel";

  listCapabilities(): EngineeringCapability[] {
    return getN04CapabilityState().map(item => ({
      id: item.capability, registered: item.registered, executable: item.executable,
    }));
  }

  acceptCapability(capability: Nucleus04Capability, input: unknown, requestId?: string) {
    return nucleus04Processor.accept({ capability, input, requestId });
  }

  async executeCapability(capability: Nucleus04Capability, input: unknown, context?: Parameters<typeof nucleus04Processor.execute>[1]) {
    return nucleus04Processor.execute({ capability, input }, context);
  }

  observeOperation(operation: EngineeringOperation): EngineeringOperation {
    if (!operation.id.trim()) throw new Error("OPERATION_ID_REQUIRED");
    if (operation.progressPercent != null && (!Number.isFinite(operation.progressPercent) || operation.progressPercent < 0 || operation.progressPercent > 100)) {
      throw new Error("OPERATION_PROGRESS_INVALID");
    }
    return { ...operation };
  }
}
export const engineeringPanelModule = new EngineeringPanelModule();
