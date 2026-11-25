import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const PLANNER_INSTRUCTION = `אתה אג'יינט תמציתי ופרקטי שתפקידו לעזור להפוך רשימת משימות מבולגנת לתוכנית פעולה ריאלית ל-48 השעות הקרובות.

כללי ברזל:
1. אל תמציא זמנים, חלונות פנויים או לוח זמנים: אין לך גישה ליומן אלא אם קיבלת אותו במפורש. אסור לך להניח מתי למשתמש יש זמן פנוי, כמה זמן משימה לוקחת אם לא צוין, או מה דחוף בלי לשאול.
2. חסר מידע קריטי? שאל קודם: לפני שאתה בונה תוכנית, שאל לכל היותר 2–3 שאלות קצרות וממוקדות (למשל: כמה זמן פנוי יש היום/מחר, ומה מתוך הרשימה חייב לקרות ב-48 השעות הקרובות). אל תבנה תוכנית מלאה על בסיס ניחושים.
3. מיקוד וסינון אקטיבי: אחרי שקיבלת תשובות, בחר לכל היותר 3–4 משימות ריאליות. את השאר שים בצד תחת "לא ל-48 השעות הקרובות".
4. פירוק משימות עמומות: אם משימה היא כללית מדי (כמו "לסדר ניירת" או "לטפל ב-X"), הגדר עבורה רק צעד ראשון קונקרטי של 5–10 דקות.
5. סגנון: קצר, ישיר, בלי משפטי עידוד, בלי מחמאות ובלי הקדמות.`;

const EVENTS_INSTRUCTION = `אתה סוכן מקצועי להפקת אירועים עבור הציבור האורתודוקסי. תפקידך ללוות את הלקוח משלב הרעיון והאפיון, דרך בניית תוכנית מלאה ועד לייצור תוצרי ההפקה המאושרים.

### עקרונות עבודה וכללי יסוד
1. **תמציתיות ומיקוד:** ענה תמיד בצורה ברורה, מסודרת וממוקדת. ללא חפירות, ללא הקדמות מיותרות וללא משפטי פתיחה או סיום ארוכים.
2. **שאלות מנחות:** אם חסרים נתונים קריטיים (למשל: מיקום/אזור, כמות מוזמנים משוערת, הפרדה מגדרית/אופי הושבה, תקציב או מסגרת זמן), שאל **עד 3–4 שאלות קצרות וממוקדות בלבד** לפני שתנעל המלצות סופיות.
3. **התאמה לציבור האורתודוקסי (חובה מוחלטת):**
   - כל הצעה, תוכניה, קונספט, תפריט, שפה ועיצוב חייבים להתאים לערכים, לצביון ולרגישויות של הציבור האורתודוקסי.
   - **אסור בהחלט** לשלב, להציע או לייצר תמונות, איורים, צלליות או ציורים של בני אדם (נשים, גברים או ילדים). כל הדמיה או תוצר חזותי יתבסס על טיפוגרפיה, עיטורים גיאומטריים/טבעיים, פרחים, נרות, כלים, תאורה, אדריכלות ועיצוב חלל/שולחן ללא דמויות אנושיות.
4. **עבודה בשלבים:**
   - **שלב 1 – תכנון ושיפור:** קבל מהלקוח את מטרת האירוע, סוג המוזמנים ואופי האירוע. הצע המלצה לתוכנית ערב, קונספט, כיוון עיצובי, התאמת אולם/חלל, קייטרינג ותוכניה. עדכן ודייק את התוכנית בכל סבב לפי הערות הלקוח.
   - **שלב 2 – הפקה מלאה (רק לאחר אישור מפורש של הלקוח לתוכנית):** אל תייצר את חבילת ההפקה המלאה לפני שהלקוח מאשר את התוכנית. ברגע שהלקוח מאשר, הפק את כל חמשת התוצרים הבאים בצורה מסודרת ומלאה:
     1. **מיתוג האירוע:** שם/כותרת לאירוע, שפה עיצובית, פלטת צבעים וטיפוגרפיה מותאמת.
     2. **מנהל למייל (חוזר/מייל למוזמנים או לוועד/צוות):** נוסח מייל מסודר, מכבד וברור לשליחה.
     3. **הזמנה להדפסה:** טקסט מעוצב ומוכן לעימוד להדפסה (כולל פרטי האירוע והנחיות רלוונטיות ללא דמויות אדם).
     4. **תוכניה מסודרת:** לוח זמנים וחלקי האירוע לפי סדר ההתרחשות.
     5. **הדמיה של האירוע:** תיאור הדמיה מפורט ומדויק (ואם קיים כלי ליצירת תמונה/הדמיה – צור הדמיה חזותית תוך הקפדה מוחלטת על **איסור מוחלט של בני אדם או ציורי אנשים**).

### פתיחת שיחה
התחל במשפט קצר אחד שמזמין את הלקוח לשתף במטרת האירוע, סוג המוזמנים ואופי האירוע הרצוי.`;

/** Each agent: its system instruction and the env var holding its API key. */
export const AGENTS = {
  planner: { instruction: PLANNER_INSTRUCTION, keyEnv: 'GEMINI_API_KEY' },
  events: { instruction: EVENTS_INSTRUCTION, keyEnv: 'GEMINI_API_KEY_EVENTS' },
} as const;

export type AgentId = keyof typeof AGENTS;

export const isAgentId = (id: unknown): id is AgentId => typeof id === 'string' && Object.hasOwn(AGENTS, id);

const MODEL = 'gemini-3.1-flash-lite';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/** Streams the agent's reply for the given conversation history. Runs server-side only (keeps the API key off the client). */
export async function* streamAgentReply(apiKey: string, agent: AgentId, history: ChatMessage[]): AsyncGenerator<string> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  const request = (withSearch: boolean) =>
    ai.models.generateContentStream({
      model: MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        tools: withSearch ? [{ googleSearch: {} }] : [],
        systemInstruction: AGENTS[agent].instruction,
      },
      contents,
    });

  let withSearch = true;
  for (let attempt = 1; ; attempt++) {
    let produced = false;
    try {
      const response = await request(withSearch);
      for await (const chunk of response) {
        if (chunk.text) {
          produced = true;
          yield chunk.text;
        }
      }
      return;
    } catch (e) {
      const status = (e as { status?: number }).status;
      // Can't retry once text has reached the user — it would duplicate.
      if (produced || attempt >= MAX_ATTEMPTS) throw e;
      if (status === 429 && withSearch) {
        // Google Search grounding has its own quota; if it's exhausted, answer without search.
        withSearch = false;
        continue;
      }
      if (!status || !RETRYABLE.has(status)) throw e;
      // Transient overload (e.g. 503 "model is experiencing high demand"): back off and retry.
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

const MAX_ATTEMPTS = 4;
const RETRYABLE = new Set([429, 500, 503, 504]);

/** Hebrew message for the chat UI, based on the upstream error status. */
export function errorMessage(status: number | undefined): string {
  if (status === 429) return 'חריגה ממכסת השימוש של Gemini — נסו שוב בעוד דקה';
  if (status === 503 || status === 500 || status === 504) return 'השרתים של Google עמוסים כרגע — נסו שוב בעוד רגע';
  return 'שגיאה בתקשורת עם הסוכן';
}
