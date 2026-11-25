import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const ABBREVIATION_INSTRUCTION = `אתה מקבל שם של עיר או יישוב (לרוב בישראל) ומחזיר את הקיצור המקובל של השם בעברית.
- אם יש קיצור מקובל (למשל: תל אביב ← ת"א, באר שבע ← ב"ש, פתח תקווה ← פ"ת, ראשון לציון ← ראשל"צ, בני ברק ← ב"ב, ירושלים ← י-ם), החזר אותו.
- אם אין קיצור מקובל, צור קיצור קצר והגיוני (ראשי תיבות עם גרשיים לשם מרובה מילים, או 2–3 אותיות ראשונות עם גרש לשם של מילה אחת).
- החזר את הקיצור בלבד, בלי הסברים, בלי מרכאות מסביב ובלי טקסט נוסף.`;

export interface CityRecord {
  code: string;
  city: string;
  cityAbbreviation: string;
}

/** Deterministic fallback: initials with gershayim (״) for multi-word names, otherwise the first letters with a geresh. */
export function fallbackAbbreviation(city: string): string {
  const words = city.trim().split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].length <= 3 ? words[0] : `${words[0].slice(0, 2)}'`;
  const initials = words.map((w) => w[0]).join('');
  return `${initials.slice(0, -1)}"${initials.slice(-1)}`;
}

/** Rejects answers that aren't actually abbreviations (e.g. the full name echoed back, or a sentence). */
function isRealAbbreviation(text: string, city: string): boolean {
  const len = (s: string) => s.replace(/\s/g, '').length;
  return text.length > 0 && text.length <= 8 && !/\s/.test(text) && len(text) < len(city);
}

/** Asks Gemini for the city's common Hebrew abbreviation; falls back to initials if Gemini is unavailable or answers oddly. */
export async function abbreviateCity(apiKey: string, city: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: city,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, systemInstruction: ABBREVIATION_INSTRUCTION },
      });
      let text = (res.text ?? '').trim().split('\n')[0].trim().replace(/\.$/, '');
      // Drop wrapping quotes like "ת"א" → ת"א (but keep the gershayim inside).
      if (text.length > 2 && /^["'`]/.test(text) && text.at(-1) === text[0]) text = text.slice(1, -1).trim();
      if (isRealAbbreviation(text, city)) return text;
      break;
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (!status || ![429, 500, 503, 504].includes(status)) break;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  return fallbackAbbreviation(city);
}

/** Sends the record to the Make webhook as JSON. Throws if Make doesn't accept it. */
export async function sendToMake(webhookUrl: string, record: CityRecord): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
    signal: AbortSignal.timeout(15_000),
  });
  const answer = (await res.text()).slice(0, 200);
  console.log(`[api/city] sent to Make: ${JSON.stringify(record)} → ${res.status} ${answer}`);
  if (!res.ok) throw new Error(`Make webhook responded ${res.status}: ${answer}`);
}
