import { analyzeSynergy, composeCapabilityName } from "./N04SynergyEngine";

describe("N04SynergyEngine", () => {
  it("discovers capability, agent and tool compositions", () => {
    const report = analyzeSynergy({
      source: "N01",
      target: "N04",
      sourceCapabilities: ["reasoning", "tool.run"],
      targetCapabilities: ["tool.run", "document.create"],
      sourceAgents: ["planner"],
      targetAgents: ["executor"],
      sourceTools: ["search"],
      targetTools: ["document"],
    });

    expect(report.score).toBeGreaterThan(0);
    expect(report.compositions.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["capability", "agent", "tool", "execution", "context"]),
    );
  });

  it("does not invent a capability name without an explicit composition operation", () => {
    expect(composeCapabilityName("N1", "N4", "execute")).toBe("cooperative.n1.n4.execute");
  });
});
