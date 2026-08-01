import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Wrap a tool to log every call to tool_calls.jsonl.
 * Patches `invoke` on the tool object (the actual dispatch method used by the SDK).
 */
export function withLogging(t, runOutputDir, getCurrentDay) {
  const originalInvoke = t.invoke.bind(t);

  t.invoke = async (runContext, input, details) => {
    const start = Date.now();
    let result;
    let error = null;
    let args = {};
    try { args = JSON.parse(input); } catch { args = { _raw: input }; }

    try {
      result = await originalInvoke(runContext, input, details);
    } catch (err) {
      error = err.message;
      throw err;
    } finally {
      const entry = {
        timestamp: new Date().toISOString(),
        day: getCurrentDay(),
        tool: t.name,
        args,
        result: error ? { error } : truncate(result),
        duration_ms: Date.now() - start,
      };

      const logPath = join(runOutputDir, 'tool_calls.jsonl');
      const dir = dirname(logPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8');
    }

    return result;
  };

  return t;
}

function truncate(value) {
  if (typeof value !== 'object' || value === null) return value;
  const str = JSON.stringify(value);
  return str.length > 2000 ? str.slice(0, 2000) + '…' : value;
}
