// ─────────────────────────────────────────────────────────────────────────
// /api/chat — the LLM brain for the BuddyDesk assistant (Vercel serverless).
//
// This upgrades the chat dock from keyword-matching to true natural-language
// understanding. It receives raw user text + team context, asks an LLM to pick
// ONE structured action, and returns it. The frontend (chatAgent.executeAction)
// then performs the real Firestore write — so the LLM never touches your data
// directly, and every action still flows through the dashboard's live listeners.
//
// ── To activate ────────────────────────────────────────────────────────────
//  1. In Vercel → Project → Settings → Environment Variables, add ONE of:
//        OPENROUTER_API_KEY = sk-or-...   (recommended — model set by OPENROUTER_MODEL below)
//        OPENAI_API_KEY      = sk-...     (uses gpt-4o-mini directly)
//        ANTHROPIC_API_KEY   = sk-ant-... (uses claude-haiku-4-5 directly)
//  2. Optional: OPENROUTER_MODEL = openai/gpt-4o-mini (default) — swap to any
//     OpenRouter model slug (e.g. google/gemini-2.0-flash-001) with no code change.
//  3. Also add a build-time env var:  VITE_AI_ENABLED = true
//  4. Redeploy. No other code changes needed.
//
// The API key lives ONLY here (server-side, Vercel env var). It is never sent
// to the browser. Do NOT store this key in the Integration Hub / Firestore —
// that collection is readable by every signed-in employee per firestore.rules.
// ─────────────────────────────────────────────────────────────────────────

interface ReqBody {
  text: string;
  me: { id: string; name: string; role: string };
  employees: { id: string; name: string; department: string }[];
}

// The action schema mirrors AgentAction in src/services/chatAgent.ts.
const SYSTEM = `You are BuddyDesk AI, an assistant embedded in a team dashboard.
Convert the user's message into exactly ONE action as strict JSON. Never explain.
Allowed actions (return JSON matching one shape):
{"kind":"create_task","title":string,"personQuery":string|null,"priority":"urgent"|"high"|"medium"|"low"|null,"today":boolean}
{"kind":"complete_task","taskQuery":string}
{"kind":"list_my_tasks"}
{"kind":"send_file","fileQuery":string,"personQuery":string}
{"kind":"find_file","fileQuery":string}
{"kind":"announce","body":string}
{"kind":"who_checked_in"}
{"kind":"chat","text":string}
Rules: personQuery/fileQuery are fuzzy human phrases, not IDs. If the user names a
person vaguely (first name, partial), pass it as personQuery verbatim. If it's not
a clear command, use "chat". Respond with JSON only.`;

async function callOpenRouter(body: ReqBody): Promise<any> {
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://gms-seven-black.vercel.app',
      'X-Title': 'BuddyDesk',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Team: ${body.employees.map(e => e.name).join(', ')}\nUser (${body.me.name}, ${body.me.role}): ${body.text}` },
      ],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenRouter error ${res.status}`);
  const raw = json.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
}

async function callOpenAI(body: ReqBody): Promise<any> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Team: ${body.employees.map(e => e.name).join(', ')}\nUser (${body.me.name}, ${body.me.role}): ${body.text}` },
      ],
    }),
  });
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
}

async function callAnthropic(body: ReqBody): Promise<any> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM,
      messages: [
        { role: 'user', content: `Team: ${body.employees.map(e => e.name).join(', ')}\nUser (${body.me.name}, ${body.me.role}): ${body.text}` },
      ],
    }),
  });
  const json = await res.json();
  const txt = json.content?.[0]?.text ?? '{}';
  return JSON.parse(txt.replace(/^```json\s*|\s*```$/g, ''));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ kind: 'chat', text: 'Method not allowed' }); return; }
  try {
    const body: ReqBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    let action;
    if (process.env.OPENROUTER_API_KEY) action = await callOpenRouter(body);
    else if (process.env.OPENAI_API_KEY) action = await callOpenAI(body);
    else if (process.env.ANTHROPIC_API_KEY) action = await callAnthropic(body);
    else { res.status(200).json({ kind: 'chat', text: 'AI backend not configured.' }); return; }
    res.status(200).json(action);
  } catch (err: any) {
    // Frontend will fall back to its local parser on any non-200.
    res.status(500).json({ error: err?.message || 'agent error' });
  }
}
