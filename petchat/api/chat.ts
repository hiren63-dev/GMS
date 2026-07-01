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
//        OPENAI_API_KEY   = sk-...        (uses gpt-4o-mini)
//        ANTHROPIC_API_KEY = sk-ant-...   (uses claude-haiku-4-5)
//  2. Also add a build-time env var:  VITE_AI_ENABLED = true
//  3. Redeploy. No other code changes needed.
//
// The API key lives ONLY here (server-side). It is never sent to the browser.
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
    if (process.env.OPENAI_API_KEY) action = await callOpenAI(body);
    else if (process.env.ANTHROPIC_API_KEY) action = await callAnthropic(body);
    else { res.status(200).json({ kind: 'chat', text: 'AI backend not configured.' }); return; }
    res.status(200).json(action);
  } catch (err: any) {
    // Frontend will fall back to its local parser on any non-200.
    res.status(500).json({ error: err?.message || 'agent error' });
  }
}
