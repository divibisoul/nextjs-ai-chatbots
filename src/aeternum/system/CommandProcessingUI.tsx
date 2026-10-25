/**
 * L6 — COMMAND PROCESSING UI
 * Host: N04
 *
 * Presentation-only. It does not manufacture queue events or create a second
 * global event bus. A host adapter supplies the real command snapshot/callbacks.
 */
import React from "react";

export interface CommandView {
  id: string;
  name: string;
  priority: "low" | "normal" | "high" | "critical";
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  startedAt?: number;
  completedAt?: number;
}

export interface CommandProcessingUIProps {
  active: boolean;
  queue: readonly CommandView[];
  completed: readonly CommandView[];
  onDeactivate?: () => void;
  onEnqueue?: () => void;
  onClear?: () => void;
}

const priorityClass: Record<CommandView["priority"], string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  normal: "text-cyan-400",
  low: "text-gray-400",
};

export const CommandProcessingUI: React.FC<CommandProcessingUIProps> = ({
  active,
  queue,
  completed,
  onDeactivate,
  onEnqueue,
  onClear,
}) => {
  if (!active) return null;

  return (
    <aside className="fixed right-0 top-0 h-full w-80 bg-black/95 border-l border-indigo-500/30 z-40 flex flex-col">
      <header className="p-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full" aria-hidden="true" />
          <h3 className="text-sm font-bold text-indigo-400">⚙️ COMANDOS</h3>
        </div>
        <button
          type="button"
          onClick={onDeactivate}
          className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded"
          disabled={!onDeactivate}
        >
          Desativar
        </button>
      </header>

      <section className="p-4 border-b border-white/10">
        <div className="text-xs text-gray-400 mb-2">Fila Ativa ({queue.length})</div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {queue.map(command => (
            <div key={command.id} className="p-2 bg-white/5 rounded text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-white truncate">{command.name}</span>
                <span className={priorityClass[command.priority]}>{command.priority}</span>
              </div>
              <div className="text-gray-500 mt-1">{command.status}</div>
            </div>
          ))}
          {queue.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-4">Nenhum comando na fila</div>
          )}
        </div>
      </section>

      <section className="flex-1 overflow-y-auto p-4">
        <div className="text-xs text-gray-400 mb-2">Últimos Completados ({completed.length})</div>
        <div className="space-y-1">
          {completed.map(command => {
            const elapsed = command.startedAt !== undefined && command.completedAt !== undefined
              ? Math.max(0, command.completedAt - command.startedAt)
              : null;
            return (
              <div key={command.id} className="p-2 bg-white/5 rounded text-xs border-l-2 border-green-500">
                <div className="text-green-400">{command.name}</div>
                <div className="text-gray-500">
                  {elapsed === null ? "Duração não observada" : `${elapsed}ms`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="p-4 border-t border-white/10 flex gap-2">
        <button
          type="button"
          onClick={onEnqueue}
          disabled={!onEnqueue}
          className="flex-1 p-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded text-xs disabled:opacity-50"
        >
          + Comando
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!onClear}
          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded text-xs disabled:opacity-50"
        >
          Limpar
        </button>
      </footer>
    </aside>
  );
};
