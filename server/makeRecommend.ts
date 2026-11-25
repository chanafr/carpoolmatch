/** Field names Make scenarios commonly use for the answer, checked in order when the reply is JSON. */
const ANSWER_FIELDS = ['recommendations', 'recommendation', 'answer', 'result', 'response', 'output', 'text', 'message', 'content'];

/** Turns whatever the Make "Webhook response" module returned into display text. */
export function extractAnswer(body: string, contentType: string | null): string {
  const raw = body.trim();
  if (!raw) return '';
  const looksJson = contentType?.includes('json') || /^[[{"]/.test(raw);
  if (!looksJson) return raw;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === 'string') return data.trim();
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      for (const key of ANSWER_FIELDS) if (typeof obj[key] === 'string' && obj[key]) return (obj[key] as string).trim();
      const strings = Object.values(obj).filter((v): v is string => typeof v === 'string' && v.trim() !== '');
      if (strings.length === 1) return strings[0].trim();
    }
    return JSON.stringify(data, null, 2);
  } catch {
    return raw;
  }
}

/** Sends {text} to the Make recommendations scenario and returns its reply as text. */
export async function getRecommendations(webhookUrl: string, text: string): Promise<string> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    // AI steps in a Make scenario can take a while.
    signal: AbortSignal.timeout(150_000),
  });
  const body = await res.text();
  console.log(`[api/recommend] sent to Make: ${JSON.stringify({ text })} → ${res.status} ${body.slice(0, 300)}`);
  if (!res.ok) throw new Error(`Make webhook responded ${res.status}: ${body.slice(0, 200)}`);
  return extractAnswer(body, res.headers.get('content-type'));
}
