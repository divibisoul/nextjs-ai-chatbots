import type { Session } from 'next-auth';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';

export interface Nucleus02ToolContext {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export function createNucleus02Tools(context: Nucleus02ToolContext) {
  return {
    createDocument: createDocument(context),
    updateDocument: updateDocument(context),
    getWeather,
    requestSuggestions: requestSuggestions(context),
  };
}

export const NUCLEUS_02_TOOL_IDS = [
  'createDocument',
  'updateDocument',
  'getWeather',
  'requestSuggestions',
] as const;

export type Nucleus02ToolId = (typeof NUCLEUS_02_TOOL_IDS)[number];
