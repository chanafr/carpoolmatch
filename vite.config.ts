/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import type { Connect, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { AGENTS, errorMessage, isAgentId, streamAgentReply } from './server/geminiChat.ts';
import type { ChatMessage } from './server/geminiChat.ts';
import { abbreviateCity, fallbackAbbreviation, sendToMake } from './server/cityWebhook.ts';
import { getRecommendations } from './server/makeRecommend.ts';

/** POST /api/chat {agent, messages} — proxies the conversation to the chosen Gemini agent, streaming plain text back. The API key never reaches the browser. */
function geminiChatApi(env: Record<string, string>): Plugin {
  const handler: Connect.NextHandleFunction = async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      return res.end();
    }
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { agent, messages } = JSON.parse(body) as { agent: unknown; messages: ChatMessage[] };
      if (!isAgentId(agent) || !Array.isArray(messages) || messages.length === 0) {
        res.statusCode = 400;
        return res.end('בקשה לא תקינה');
      }
      const apiKey = env[AGENTS[agent].keyEnv];
      if (!apiKey) {
        res.statusCode = 500;
        return res.end(`${AGENTS[agent].keyEnv} חסר בקובץ .env.local`);
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      for await (const text of streamAgentReply(apiKey, agent, messages.slice(-30))) res.write(text);
      res.end();
    } catch (e) {
      console.error('[api/chat]', e);
      const status = (e as { status?: number }).status;
      if (res.headersSent) {
        // Reply was cut mid-stream; tell the user inline.
        res.end(`\n\n⚠️ ${errorMessage(status)}`);
      } else {
        res.statusCode = status === 429 ? 429 : status === 503 ? 503 : 502;
        res.end(errorMessage(status));
      }
    }
  };
  return {
    name: 'gemini-chat-api',
    configureServer: (server) => {
      server.middlewares.use('/api/chat', handler);
      server.middlewares.use('/api/city', cityHandler(env));
      server.middlewares.use('/api/recommend', recommendHandler(env));
    },
    configurePreviewServer: (server) => {
      server.middlewares.use('/api/chat', handler);
      server.middlewares.use('/api/city', cityHandler(env));
      server.middlewares.use('/api/recommend', recommendHandler(env));
    },
  };
}

/** POST /api/city {code, city} — abbreviates the city name and sends {code, city, cityAbbreviation} to the Make webhook. */
function cityHandler(env: Record<string, string>): Connect.NextHandleFunction {
  return async (req, res) => {
    const reply = (status: number, body: object) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { code, city } = JSON.parse(body) as { code?: unknown; city?: unknown };
      if (typeof code !== 'string' || typeof city !== 'string' || !code.trim() || !city.trim() || code.length > 100 || city.length > 100) {
        return reply(400, { error: 'יש למלא קוד ועיר' });
      }
      if (!env.MAKE_WEBHOOK_URL) return reply(500, { error: 'MAKE_WEBHOOK_URL חסר בקובץ .env.local' });

      const record = {
        code: code.trim(),
        city: city.trim(),
        cityAbbreviation: env.GEMINI_API_KEY ? await abbreviateCity(env.GEMINI_API_KEY, city.trim()) : fallbackAbbreviation(city),
      };
      await sendToMake(env.MAKE_WEBHOOK_URL, record);
      reply(200, record);
    } catch (e) {
      console.error('[api/city]', e);
      reply(502, { error: 'השליחה ל-Make נכשלה — נסו שוב' });
    }
  };
}

/** POST /api/recommend {text} — forwards the text to the Make recommendations scenario and returns {answer}. */
function recommendHandler(env: Record<string, string>): Connect.NextHandleFunction {
  return async (req, res) => {
    const reply = (status: number, body: object) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { text } = JSON.parse(body) as { text?: unknown };
      if (typeof text !== 'string' || !text.trim() || text.length > 4000) return reply(400, { error: 'יש לכתוב תיאור של האירוע' });
      if (!env.MAKE_RECOMMEND_WEBHOOK_URL) return reply(500, { error: 'MAKE_RECOMMEND_WEBHOOK_URL חסר בקובץ .env.local' });

      const answer = await getRecommendations(env.MAKE_RECOMMEND_WEBHOOK_URL, text.trim());
      // "Accepted" is Make's default reply when the scenario has no "Webhook response" module (or isn't running).
      if (!answer || answer === 'Accepted') {
        return reply(502, { error: 'Make קיבל את הבקשה אבל לא החזיר המלצות. ודאו שהתרחיש פעיל ושבסופו יש מודול Webhook response.' });
      }
      reply(200, { answer });
    } catch (e) {
      console.error('[api/recommend]', e);
      const timedOut = e instanceof Error && e.name === 'TimeoutError';
      reply(502, { error: timedOut ? 'Make לא ענה בזמן — נסו שוב' : 'הבקשה ל-Make נכשלה — נסו שוב' });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), geminiChatApi(env)],
    // Production (Railway) runs `npm start` = vite preview; accept requests for the public domain.
    preview: { host: '0.0.0.0', port: Number(process.env.PORT) || 8080, allowedHosts: true },
    test: {
      include: ['src/**/*.test.ts'],
    },
  };
});
