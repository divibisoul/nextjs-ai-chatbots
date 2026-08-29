import { n04WorkerPool } from './N04WorkerPool';

export type N04Subtask = { kind: 'document'|'artifact'|'tool'; input: unknown };
export type N04Workflow = { tasks: N04Subtask[] };

export class N04TaskOrchestrator {
  async execute(workflow: N04Workflow) {
    const results = await Promise.all(workflow.tasks.map((task) => n04WorkerPool.run(task)));
    return { ok: true, results };
  }
}

export const n04TaskOrchestrator = new N04TaskOrchestrator();
