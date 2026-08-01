/**
 * Known model pricing per 1M tokens (input / output).
 * Prices in USD. Models are matched by substring so partial names work.
 */
const PRICING = [
  { match: 'claude-opus-4',        input: 15.00, output: 75.00 },
  { match: 'claude-sonnet-4',      input:  3.00, output: 15.00 },
  { match: 'claude-haiku-4',       input:  0.80, output:  4.00 },
  { match: 'gpt-4o-mini',          input:  0.15, output:  0.60 },
  { match: 'gpt-4o',               input:  2.50, output: 10.00 },
  { match: 'gpt-4.1-mini',         input:  0.40, output:  1.60 },
  { match: 'gpt-4.1',              input:  2.00, output:  8.00 },
  { match: 'gpt-5',                input: 10.00, output: 40.00 },
  { match: 'gemini-2.0-flash',     input:  0.10, output:  0.40 },
  { match: 'gemini-2.5-flash',     input:  0.30, output:  2.50 },
  { match: 'gemini-2.5-pro',       input:  1.25, output: 10.00 },
  { match: 'gemini-3-flash',       input:  0.15, output:  0.60 },
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
 */
export function extractUsage(result) {
  const responses = result?.rawResponses ?? [];
  let inputTokens = 0;
  let outputTokens = 0;
  let requests = 0;
  for (const r of responses) {
    inputTokens  += r.usage?.inputTokens  ?? 0;
    outputTokens += r.usage?.outputTokens ?? 0;
    requests     += r.usage?.requests     ?? 1;
  }
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, requests };
}
