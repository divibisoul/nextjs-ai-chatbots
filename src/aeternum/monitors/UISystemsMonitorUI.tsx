import React from "react";

export type UISystemMonitorViewModel = {
  status: "OBSERVED" | "UNASSESSED";
  fps?: number;
  renderTimeMs?: number;
  memoryUsageMb?: number;
  activeComponents?: number;
  source?: string;
};

export type UISystemsMonitorUIProps = {
  snapshot: UISystemMonitorViewModel | null;
  onDeactivate?: () => void;
};

function formatMetric(value: number | undefined, suffix = ""): string {
  return value === undefined || !Number.isFinite(value)
    ? "Não observado"
    : `${value}${suffix}`;
}

/**
 * Presentation only. It does not invent FPS, memory, render time or
 * component counts. Those values must arrive from an observed telemetry
 * source such as the N01 monitor.
 */
export const UISystemsMonitorUI: React.FC<UISystemsMonitorUIProps> = ({
  snapshot,
  onDeactivate,
}) => {
  const observed = snapshot?.status === "OBSERVED";

  return (
    <section
      aria-label="Monitor de sistemas de interface"
      style={{
        width: "100%",
        maxWidth: 520,
        padding: 16,
        border: "1px solid rgba(148,163,184,.25)",
        borderRadius: 12,
        background: "rgba(2,6,23,.92)",
        color: "#e2e8f0",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <strong>Monitor de UI</strong>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {observed ? "Telemetria observada" : "Sem telemetria observada"}
          </div>
        </div>
        {onDeactivate ? (
          <button type="button" onClick={onDeactivate}>
            Desativar
          </button>
        ) : null}
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 8,
          marginTop: 16,
        }}
      >
        <Metric label="FPS" value={formatMetric(snapshot?.fps)} />
        <Metric label="Render" value={formatMetric(snapshot?.renderTimeMs, " ms")} />
        <Metric label="Memória" value={formatMetric(snapshot?.memoryUsageMb, " MB")} />
        <Metric label="Componentes" value={formatMetric(snapshot?.activeComponents)} />
      </div>

      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12 }}>
        Fonte: {snapshot?.source ?? "não informada"}
      </div>
    </section>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 8,
        background: "rgba(148,163,184,.08)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.65 }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
