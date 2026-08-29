export type SynergyKind = "agent" | "capability" | "tool" | "context" | "execution";

export interface SynergyInput {
  source: string;
  target: string;
  sourceCapabilities: string[];
  targetCapabilities: string[];
  sourceAgents?: string[];
  targetAgents?: string[];
  sourceTools?: string[];
  targetTools?: string[];
}

export interface SynergyComposition {
  kind: SynergyKind;
  source: string;
  target: string;
  composition: string;
  score: number;
  rationale: string;
}

export interface SynergyReport {
  source: string;
  target: string;
  score: number;
  compositions: SynergyComposition[];
  generatedAt: string;
}

const normalize = (values: string[] = []) =>
  [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];

const overlap = (left: string[], right: string[]) => {
  const r = new Set(right);
  return left.filter((item) => r.has(item));
};

/**
 * Deterministic, dependency-free capability synergy analysis.
 * It discovers composable intersections without claiming that a new
 * capability exists until an implementation is actually registered.
 */
export function analyzeSynergy(input: SynergyInput): SynergyReport {
  const sourceCapabilities = normalize(input.sourceCapabilities);
  const targetCapabilities = normalize(input.targetCapabilities);
  const sourceAgents = normalize(input.sourceAgents);
  const targetAgents = normalize(input.targetAgents);
  const sourceTools = normalize(input.sourceTools);
  const targetTools = normalize(input.targetTools);

  const compositions: SynergyComposition[] = [];

  const capabilityOverlap = overlap(sourceCapabilities, targetCapabilities);
  if (capabilityOverlap.length > 0) {
    compositions.push({
      kind: "capability",
      source: input.source,
      target: input.target,
      composition: "shared-capability-validation",
      score: Math.min(1, capabilityOverlap.length / Math.max(sourceCapabilities.length, targetCapabilities.length, 1)),
      rationale: `Shared capabilities: ${capabilityOverlap.join(", ")}`,
    });
  }

  if (sourceCapabilities.length && targetCapabilities.length) {
    compositions.push({
      kind: "execution",
      source: input.source,
      target: input.target,
      composition: "capability-chain",
      score: 1,
      rationale: "Each nucleus exposes capabilities that can form a request/delegate/response chain through Soul Mesh.",
    });
  }

  if (sourceAgents.length && targetCapabilities.length) {
    compositions.push({
      kind: "agent",
      source: input.source,
      target: input.target,
      composition: "agent-to-capability-delegation",
      score: 1,
      rationale: "Source agents can select and delegate to a target capability when the target is discovered as suitable.",
    });
  }

  if (sourceTools.length && targetTools.length) {
    compositions.push({
      kind: "tool",
      source: input.source,
      target: input.target,
      composition: "tool-chain",
      score: 1,
      rationale: "Tools can be composed sequentially when the output contract of one operation is accepted by the next.",
    });
  }

  if (sourceAgents.length && targetAgents.length) {
    compositions.push({
      kind: "context",
      source: input.source,
      target: input.target,
      composition: "agent-context-handoff",
      score: 1,
      rationale: "Independent agents can exchange correlated task context through the Mesh contract.",
    });
  }

  const score = compositions.length === 0
    ? 0
    : Number((compositions.reduce((sum, item) => sum + item.score, 0) / compositions.length).toFixed(4));

  return {
    source: input.source,
    target: input.target,
    score,
    compositions,
    generatedAt: new Date().toISOString(),
  };
}

export function composeCapabilityName(source: string, target: string, operation: string): string {
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-|-$/g, "");
  return `cooperative.${safe(source)}.${safe(target)}.${safe(operation)}`;
}
