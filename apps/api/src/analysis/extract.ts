import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { env } from '../lib/env.js';
import { ExtractionSchema } from './schema.js';
import type { Extraction } from './schema.js';
import { EXTRACTION_SYSTEM, buildExtractionPrompt } from './prompt.js';

export const MODEL = env.analysisModel;
export const RUBRIC_VERSION = 'cr-extract-v1';

const clients = new Map<string, Anthropic>();

const getClient = (apiKey?: string): Anthropic => {
  const resolvedKey = apiKey ?? env.anthropicApiKey;
  if (!resolvedKey) {
    throw new Error(
      'Не задан ANTHROPIC_API_KEY — добавьте ключ в apps/api/.env, чтобы запустить AI-анализ',
    );
  }
  const existing = clients.get(resolvedKey);
  if (existing) return existing;
  const client = new Anthropic({ apiKey: resolvedKey });
  clients.set(resolvedKey, client);
  return client;
};

export interface ExtractionUsage {
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from the prompt cache, billed at a tenth of the input rate. */
  cachedTokens: number;
  /** Tokens written into the cache, billed at 1.25x the input rate. */
  cacheWriteTokens: number;
}

export interface ExtractionResult {
  extraction: Extraction;
  usage: ExtractionUsage;
}

export interface ExtractionInput {
  title: string;
  sourceAttrs: Record<string, unknown>;
}

/**
 * Pulls the attributes a seller stated in their title into a typed object.
 * The system prompt is cached, so only the listing text is billed at full rate
 * across a batch.
 */
export const extractAttributes = async (
  input: ExtractionInput,
  apiKey?: string,
): Promise<ExtractionResult> => {
  const response = await getClient(apiKey).messages.parse({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: EXTRACTION_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: zodOutputFormat(ExtractionSchema),
    },
    messages: [{ role: 'user', content: buildExtractionPrompt(input) }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Модель отклонила запрос на разбор заголовка');
  }
  if (!response.parsed_output) {
    throw new Error('Модель вернула ответ, не соответствующий схеме извлечения');
  }

  return {
    extraction: response.parsed_output,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cachedTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
    },
  };
};

/** Anthropic list prices, US dollars per million tokens. */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export const estimateCostUsd = (usage: ExtractionUsage): number => {
  const price = PRICING[MODEL] ?? PRICING['claude-opus-5'];
  // Cache reads bill at a tenth of the input rate, cache writes at 1.25x.
  return (
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cachedTokens * price.input * 0.1 +
      usage.cacheWriteTokens * price.input * 1.25) /
    1_000_000
  );
};
