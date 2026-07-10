// ConversationService — builds the companion prompt (persona + safety + profile +
// retrieved memory) and returns Claude's warm reply.

import type Anthropic from '@anthropic-ai/sdk';
import { complete } from '@/lib/ai/anthropic';
import { companionSystemPrompt } from '@/lib/prompts';
import type { Profile } from '@/lib/types';
import type { TranscriptTurn } from './assessment';

interface ReplyArgs {
  profile: Profile;
  memoryBlock: string;
  distressed: boolean;
  recent: TranscriptTurn[]; // prior turns, oldest→newest, excluding latest
  latest: string;
}

export const ConversationService = {
  async reply({ profile, memoryBlock, distressed, recent, latest }: ReplyArgs): Promise<string> {
    const system = companionSystemPrompt({ profile, memoryBlock, distressed });

    const history: Anthropic.MessageParam[] = recent.slice(-10).map((t) => ({
      role: t.role === 'user' ? 'user' : 'assistant',
      content: t.content,
    }));
    history.push({ role: 'user', content: latest });

    return complete({
      system,
      messages: history,
      maxTokens: 400,
      label: 'conversation.reply',
    });
  },
};
