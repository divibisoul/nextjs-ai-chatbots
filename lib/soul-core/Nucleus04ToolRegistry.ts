import type { Session } from 'next-auth';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { describeGeminiSkill, listGeminiSkills } from '@/lib/soul-mesh/GeminiSkillsCatalog';
import { runBrowserUse, type BrowserUseRequest } from './BrowserUseAdapter';

export interface Nucleus04ToolContext {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

/**
 * Adapter registry: the original tools remain intact, but Nucleus 04 now owns
 * their discovery boundary so the Soul can expose them as capabilities.
 */
export function createNucleus04Tools(context: Nucleus04ToolContext) {
  return {
    createDocument: createDocument(context),
    updateDocument: updateDocument(context),
    getWeather,
    requestSuggestions: requestSuggestions(context),
    listGeminiSkills: { execute: async () => listGeminiSkills() },
    describeGeminiSkill: { execute: async ({ name }: { name: string }) => describeGeminiSkill(name) },
    browserUse: { execute: async (input: unknown) => runBrowserUse(input as BrowserUseRequest) },
  };
}

export const NUCLEUS_04_TOOL_IDS = [
  'createDocument',
  'updateDocument',
  'getWeather',
  'requestSuggestions',
  'listGeminiSkills',
  'describeGeminiSkill',
  'browserUse',
] as const;

export type Nucleus04ToolId = (typeof NUCLEUS_04_TOOL_IDS)[number];
