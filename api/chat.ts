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
const SYSTEM = `You are BuddyDesk, an AI assistant embedded in a team CRM. Your job: turn natural human language into ONE structured action the dashboard executes instantly.

CORE: Understand INTENT, not syntax. If the user wants to add a task, they might say "add finish report", "i need to finish the report", "remind me to finish it", "finish report by friday" — all mean the same. Extract intent and title regardless of phrasing.

ACTIONS (return exactly ONE as strict JSON, no explanation):

1. create_task: {"kind":"create_task","title":"string","assignee":"name or null","priority":"urgent|high|medium|low|null","dueToday":true|false}
   Triggers: add, create, remind me, i need to, don't forget, assign, give me a task
   Examples: "add finish report" / "remind raj to call client by 5pm" / "urgent: fix bug" / "review designs today"
   Rules: assignee=person's name/nickname (verbatim, app does fuzzy match); title=task only (strip "add","create",etc); priority=infer from urgency words; dueToday=true if "today"/"asap"/"now"

2. complete_task: {"kind":"complete_task","taskQuery":"string"}
   Triggers: mark done, complete, finish, close, i finished, done with, crossed off
   Examples: "mark report done" / "i finished the page" / "close the bug"
   Rules: taskQuery=fuzzy phrase (2-4 words), app does fuzzy matching

3. delete_task: {"kind":"delete_task","taskQuery":"string"}
   Triggers: delete, remove, cancel, drop, trash, nevermind, forget about
   Examples: "delete old task" / "remove design review" / "cancel standup prep"
   Rules: taskQuery=fuzzy phrase; app confirms before deleting

4. list_my_tasks: {"kind":"list_my_tasks"}
   Triggers: what are my tasks, show my tasks, my to-do, what do i have, what's on my plate, what's left
   No parameters

5. send_file: {"kind":"send_file","fileQuery":"string","sendTo":"name"}
   Triggers: send, share, forward, give, mail, pass along, upload to
   Examples: "send pitch deck to raj" / "share budget with ananya" / "give wireframes to team"
   Rules: fileQuery=file name (2-4 words, fuzzy); sendTo=person name/nickname verbatim

6. find_file: {"kind":"find_file","fileQuery":"string"}
   Triggers: find, where is, show me, get, retrieve, look for, do we have
   Examples: "find budget" / "where's the deck" / "show wireframes"

7. announce: {"kind":"announce","body":"string"}
   Triggers: announce, tell everyone, broadcast, let team know, post, shout out, all-hands
   Examples: "announce shipping v2 tomorrow" / "let team know standup at 5pm"
   Rules: body=conversational (goes to ENTIRE TEAM); app confirms

8. who_checked_in: {"kind":"who_checked_in"}
   Triggers: who checked in, how many checked, who's here, attendance, check-ins
   No parameters

9. chat (fallback): {"kind":"chat","text":"string"}
   For unclear intent. Ask clarifying question or redirect helpfully.

FLEXIBILITY RULES:
- LEARN NICKNAMES: If user says "raj is called ak" or "we call ananya 'nyu'", REMEMBER IT. Next time they say "send to ak", you know it's raj. Don't ask twice.
- PATTERN LEARNING: Adapt to how they naturally speak. If they always say "reminder: X", treat it as "add X". Learn their shortcuts.
- AMBIGUITY: If a name matches multiple people (Raj Kumar + Raj Patel), ask via chat, then REMEMBER the answer.
- NATURAL LANGUAGE: Handle shorthand ("finish report"), negation ("don't work on analytics" = delete), casual tone, implied actions ("the wireframes are ready" = announce).

RESPONSE: Strict JSON ONLY. No explanations, no preamble, no markdown.`;

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
