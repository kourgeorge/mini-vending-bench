/**
 * Known model pricing per 1M tokens (input / output).
 * Prices in USD. Models are matched by substring so partial names work.
 * More-specific entries must appear before broader ones (first match wins).
 */
const PRICING = [
  // ── AWS Bedrock (via LiteLLM proxy) ──────────────────────────
  { match: 'aws/gpt-oss-120b',          input:  0.15, output:  0.60 },
  { match: 'aws/claude-sonnet-5',       input:  1.52, output:  7.60 },
  { match: 'aws/claude-opus-5',         input:  3.80, output: 19.00 },
  { match: 'aws/claude-opus-4',         input:  3.80, output: 19.00 },
  { match: 'us.claude-opus-4',          input:  3.80, output: 19.00 }, // aws/us.claude-opus-4-x alias
  { match: 'aws/claude-haiku-4-5',      input:  0.76, output:  3.80 },
  { match: 'aws/claude-sonnet-4',       input:  2.28, output: 11.40 },

  // ── Azure OpenAI (via LiteLLM proxy) ─────────────────────────
  { match: 'azure/gpt-5.6-sol',         input:  5.00, output: 30.00 },
  { match: 'azure/gpt-5.6-luna',        input:  1.00, output:  6.00 },
  { match: 'azure/gpt-5.6-terra',       input:  2.50, output: 15.00 },
  { match: 'azure/gpt-5.5',             input:  2.50, output: 15.00 },
  { match: 'azure/gpt-5.4',             input:  2.50, output: 15.00 },
  { match: 'azure/gpt-5.3-codex',       input:  1.75, output: 14.00 },
  { match: 'azure/gpt-5.3-chat',        input:  1.75, output: 14.00 },
  { match: 'azure/gpt-5.1-codex',       input:  1.25, output: 10.00 },
  { match: 'azure/gpt-5-nano',          input:  0.05, output:  0.40 },
  { match: 'azure/gpt-5-mini',          input:  0.25, output:  2.00 },
  { match: 'azure/gpt-5',               input:  1.25, output: 10.00 },
  { match: 'azure/gpt-4.1',             input:  2.00, output:  8.00 },
  { match: 'azure/gpt-4o',              input:  2.50, output: 10.00 },

  // ── GCP Vertex AI (via LiteLLM proxy) ────────────────────────
  { match: 'gcp/gemini-3.6-flash',      input:  1.50, output:  7.50 },
  { match: 'gcp/gemini-3.5-flash-lite', input:  0.30, output:  2.50 },
  { match: 'gcp/gemini-3.1-pro',        input:  2.00, output: 12.00 },
  { match: 'gcp/gemini-3-pro',          input:  2.00, output: 12.00 },
  { match: 'gcp/gemini-3-flash',        input:  0.50, output:  3.00 },
  { match: 'gcp/gemini-2.5-pro',        input:  1.25, output: 10.00 },
  { match: 'gcp/gemini-2.5-flash',      input:  0.30, output:  2.50 },
  { match: 'gcp/gemini-2.0-flash',      input:  0.10, output:  0.40 },

  // ── Direct Anthropic API ──────────────────────────────────────
  { match: 'claude-opus-4',             input: 15.00, output: 75.00 },
  { match: 'claude-sonnet-4',           input:  3.00, output: 15.00 },
  { match: 'claude-haiku-4',            input:  0.80, output:  4.00 },

  // ── Direct OpenAI API ─────────────────────────────────────────
  { match: 'gpt-5-nano',                input:  0.05, output:  0.40 },
  { match: 'gpt-4o-mini',               input:  0.15, output:  0.60 },
  { match: 'gpt-4o',                    input:  2.50, output: 10.00 },
  { match: 'gpt-4.1-nano',              input:  0.10, output:  0.40 },
  { match: 'gpt-4.1-mini',              input:  0.40, output:  1.60 },
  { match: 'gpt-4.1',                   input:  2.00, output:  8.00 },

  // ── Direct Google Gemini API ──────────────────────────────────
  { match: 'gemini-2.0-flash',          input:  0.10, output:  0.40 },
  { match: 'gemini-2.5-flash',          input:  0.30, output:  2.50 },
  { match: 'gemini-2.5-pro',            input:  1.25, output: 10.00 },
];

export function getPricing(model) {
  const lower = (model ?? '').toLowerCase();
  return PRICING.find(p => lower.includes(p.match)) ?? null;
}

export function calculateCost(model, inputTokens, outputTokens) {
  const pricing = getPricing(model);
  if (!pricing) return null;
  return (inputTokens / 1_000_000) * pricing.input
       + (outputTokens / 1_000_000) * pricing.output;
}

/**
 * Extract cumulative usage from a RunResult's rawResponses array.
 * Uses LiteLLM-provided cost from providerData._hidden_params.response_cost when available,
 * otherwise returns null for costUsd so the caller can fall back to calculateCost().
 */
export function extractUsage(result) {
  const responses = result?.rawResponses ?? [];
  let inputTokens = 0;
  let outputTokens = 0;
  let requests = 0;
  let costUsd = null;
  for (const r of responses) {
    inputTokens  += r.usage?.inputTokens  ?? 0;
    outputTokens += r.usage?.outputTokens ?? 0;
    requests     += r.usage?.requests     ?? 1;
    const litellmCost = r.providerData?._hidden_params?.response_cost;
    if (typeof litellmCost === 'number') {
      costUsd = (costUsd ?? 0) + litellmCost;
    }
  }
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, requests, costUsd };
}
