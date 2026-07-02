// ─────────────────────────────────────────────────────────────────────────
// /api/ask — the BuddyDesk data analyst (Vercel serverless).
//
// Answers plain-language questions about the team's live CRM data:
//   "who is working on what?" · "any blockers today?" · "how many overdue?"
//
// The frontend (chatAgent → ask_data) gathers a compact snapshot of Firestore
// (tasks, today's check-ins, team roster — ALREADY scoped by role: employees
// only get their own data, founders/admins get the team) and sends it here.
// The LLM answers FROM THE SNAPSHOT ONLY — grounded, no fabrication.
//
// Architecture note: at this team size a full snapshot fits in one prompt, so
// retrieval-by-snapshot beats a vector DB on speed, cost, and freshness.
// If the dataset outgrows prompts, graduate to real retrieval then.
// Uses the same env keys as /api/chat: OPENROUTER_API_KEY (default), or
// OPENAI_API_KEY / ANTHROPIC_API_KEY.
// ─────────────────────────────────────────────────────────────────────────

interface AskBody {
  question: string;
  me: { id: string; name: string; role: string };
  snapshot: unknown; // role-scoped data snapshot built by the frontend
}

const SYSTEM = `You are BuddyDesk's team analyst, embedded in a CRM dashboard.
You receive a JSON snapshot of the team's live data (tasks, today's check-ins, roster) and ONE question from a user.

RULES:
- Answer ONLY from the snapshot. If the data doesn't contain the answer, say exactly what's missing — never invent names, numbers, or statuses.
- Be concise and skimmable: lead with the direct answer, then short bullets (• Name — detail) only when listing.
- Use plain human language, no JSON, no markdown headers. Numbers > adjectives.
- "Blockers" = check-ins with a problem + tasks with status "blocked".
- "Overdue" = the overdue:true flag.
- If the question is about a specific person, answer only about them.
- Mood signals come from check-ins (great/good/okay/rough/bad) — mention them when asked how someone/the team is doing.
- Keep the whole answer under 120 words. Friendly, direct, zero corporate filler.`;

const RATE_LIMIT = 8;
const RATE_WINDOW = 60_000;
const _hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (_hits.get(userId) ?? []).filter(t => now - t < RATE_WINDOW);
  if (arr.length >= RATE_LIMIT) { _hits.set(userId, arr); return true; }
  arr.push(now);
  _hits.set(userId, arr);
  if (_hits.size > 500) _hits.clear();
  return false;
}

function userContent(body: AskBody): string {
  return `DATA SNAPSHOT:\n${JSON.stringify(body.snapshot)}\n\nQUESTION from ${body.me.name} (${body.me.role}): ${body.question}`;
}

async function callOpenRouter(body: AskBody): Promise<string> {
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
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userContent(body) },
      ],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenRouter error ${res.status}`);
  return json.choices?.[0]?.message?.content ?? '';
}

async function callOpenAI(body: AskBody): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userContent(body) },
      ],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI error ${res.status}`);
  return json.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(body: AskBody): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent(body) }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Anthropic error ${res.status}`);
  return json.content?.[0]?.text ?? '';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const body: AskBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body?.question || !body?.me || body.snapshot === undefined) { res.status(400).json({ error: 'bad request' }); return; }
    if (typeof body.question !== 'string' || body.question.length > 600) { res.status(400).json({ error: 'question too long' }); return; }
    // keep snapshot bounded so a buggy client can't send megabytes to the LLM
    if (JSON.stringify(body.snapshot).length > 60_000) { res.status(400).json({ error: 'snapshot too large' }); return; }
    if (rateLimited(String(body.me.id ?? 'anon'))) {
      res.status(200).json({ answer: 'Easy there 🙂 — give me a few seconds between questions.' });
      return;
    }
    let answer: string;
    if (process.env.OPENROUTER_API_KEY) answer = await callOpenRouter(body);
    else if (process.env.OPENAI_API_KEY) answer = await callOpenAI(body);
    else if (process.env.ANTHROPIC_API_KEY) answer = await callAnthropic(body);
    else { res.status(200).json({ answer: 'AI backend not configured.' }); return; }
    res.status(200).json({ answer: answer.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'analyst error' });
  }
}
