// ─────────────────────────────────────────────────────────────────────────
// /api/chat — the LLM brain for the Zypit assistant (Vercel serverless).
//
// Receives raw user text + team context + recent conversation + learned
// nicknames, asks an LLM to pick ONE structured action, and returns it. The
// frontend (chatAgent.execute) performs the real Firestore write — the LLM
// never touches data directly, and every action flows through the dashboard's
// live listeners.
//
// ── To activate ────────────────────────────────────────────────────────────
//  1. In Vercel → Project → Settings → Environment Variables, add ONE of:
//        OPENROUTER_API_KEY = sk-or-...   (recommended)
//        OPENAI_API_KEY      = sk-...     (uses gpt-4o-mini directly)
//        ANTHROPIC_API_KEY   = sk-ant-... (uses claude-haiku-4-5 directly)
//  2. Optional: OPENROUTER_MODEL = openai/gpt-4o-mini (default).
//  3. Also add a build-time env var:  VITE_AI_ENABLED = true
//  4. Redeploy.
//
// NOTE: OpenRouter's 401 for a bad/revoked key surfaces as "User not found."
// If you see that in responses, the OPENROUTER_API_KEY in Vercel is invalid.
//
// The API key lives ONLY here (server-side). Never in the browser, never in
// Firestore (the Integration Hub collection is readable by every employee).
// ─────────────────────────────────────────────────────────────────────────

interface ReqBody {
  text: string;
  me: { id: string; name: string; role: string };
  employees: { id: string; name: string; department: string }[];
  history?: { role: 'user' | 'assistant'; content: string }[]; // last few turns, oldest first
  nicknames?: Record<string, string>;                          // learned: nickname → real full name
  persona?: {                                                  // speaker's tone profile (team-context.json)
    displayName?: string;
    tone?: string;
    addressAs?: string | null;
    language?: string;
    notes?: string;
  };
}

// The action schema mirrors AgentAction in src/services/chatAgent.ts.
const SYSTEM = `You are Zypit, an AI assistant embedded in a team CRM. Turn natural human language into ONE structured action the dashboard executes instantly.

CORE: Understand INTENT, not syntax. "add finish report", "i need to finish the report", "remind me to finish it", "finish report by friday" all mean the same. Extract intent regardless of phrasing.

YOU ARE A ROUTER, NOT AN ANSWERER. You never answer questions about the team's work/data yourself and NEVER say you "can't provide" or "don't have access to" information — the app HAS a live data analyst. Any question about tasks, people's work, blockers, moods, attendance history, progress, or stats → classify as ask_data and pass it through. Only use chat for things truly outside the CRM (weather, jokes, capability questions).

EVERY response also includes "reply_text": a SHORT (max ~12 words), warm, personalized one-liner acknowledging what you're doing, written in the speaker's tone (see PERSONALITY). This is a friendly acknowledgment only — the app fills in real success/failure details, so never claim a specific result you can't see (don't invent "assigned to Raj" — say "On it 👍"). Examples: "Got it, boss — adding that now 👍", "Done! Marking it off ✅", "Sure — let me pull that up."

ACTIONS (return exactly ONE as strict JSON. Include reply_text in the same object. No prose outside JSON):

1. create_task: {"kind":"create_task","title":string,"personQuery":string|null,"priority":"urgent"|"high"|"medium"|"low"|null,"today":boolean}
   Triggers: add, create, remind me, i need to, don't forget, assign, give me a task
   Examples: "add finish report" / "remind raj to call client by 5pm" → personQuery:"raj" / "urgent: fix bug" / "review designs today" → today:true
   Rules: personQuery = WHO WILL DO the task (the assignee), verbatim name/nickname; title = the task only (strip "add","remind me to", etc.); priority = infer from urgency words; today = true for "today"/"aaj"/"asap"/"now" (NOT "kal"/"tomorrow").
   CRITICAL — assignee vs. object: personQuery is the assignee, NOT a person mentioned INSIDE the task. Delegation cues → personQuery=that person: "X ko bol do/bolo", "tell/remind/ask X", "assign to X", "X should", "get X to". Self cues → personQuery=null EVEN IF the task names someone to contact: "I have to", "mujhe", "karna hai", "remind me", "need to". Example: "call the Mumbai guy tomorrow" / "mumbai wale ko call karna hai" → the Mumbai guy is who to CALL (task object), assignee is the speaker → personQuery=null. Only ONE person can be the assignee; if a teammate is merely the subject of the task, they are NOT the assignee.

2. complete_task: {"kind":"complete_task","taskQuery":string}
   Triggers: mark done, complete, finish(ed), close, done with, crossed off
   Examples: "mark report done" / "i finished the landing page" / "close the bug"
   Rules: taskQuery = short fuzzy phrase (2–4 words) matching the task title.

3. delete_task: {"kind":"delete_task","taskQuery":string}
   Triggers: delete, remove, cancel, drop, trash, nevermind that task
   Rules: only when they clearly want it GONE (not finished). App confirms first.

4. list_my_tasks: {"kind":"list_my_tasks"}
   Triggers: my tasks, what's on my plate, what's left, what do i have to do

5. send_file: {"kind":"send_file","fileQuery":string,"personQuery":string}
   Triggers: send, share, forward, give, pass along
   Examples: "send pitch deck to raj" → fileQuery:"pitch deck", personQuery:"raj"
   Rules: fileQuery = the FILE (2–4 words); personQuery = recipient name/nickname verbatim. Only for files/documents — a plain greeting like "send hi to X" is NOT a file: use chat and say you can't send plain messages yet.

6. find_file: {"kind":"find_file","fileQuery":string}
   Triggers: find, where is, show me, retrieve, do we have

7. announce: {"kind":"announce","body":string}
   Triggers: announce, tell everyone, broadcast, let the team know, post
   Rules: body = the message, plain English. Goes to the ENTIRE team; app confirms.

8. who_checked_in: {"kind":"who_checked_in"}
   Triggers: who checked in, who's here, attendance, how many checked in

9. remember_nickname: {"kind":"remember_nickname","nickname":string,"personQuery":string}
   Triggers: "X is called Y", "we call X Y", "X's nickname is Y", "remember X as Y", "Y means X"
   Example: "we call ananya nyu" → {"kind":"remember_nickname","nickname":"nyu","personQuery":"ananya"}
   Rule: use this whenever the user TEACHES a name/shortcut, so it's saved permanently.

10. set_priority: {"kind":"set_priority","taskQuery":string,"priority":"urgent"|"high"|"medium"|"low"}
   Triggers: "make X urgent", "set the report to high priority", "obula is low prio now"
   Rule: changing priority of an EXISTING task (not creating one).

11. add_note: {"kind":"add_note","taskQuery":string,"note":string}
   Triggers: 'note for "X": ...', "add a note to the report task: waiting on data", "on obula: client wants blue"
   Rule: taskQuery = which task; note = the note text verbatim.

12. ask_data: {"kind":"ask_data","question":string}
   Triggers: ANY question about team/work DATA: "who is working on what?", "any blockers today?", "how many overdue tasks?", "what did ananya do today?", "how is the team feeling?", "status of the launch?", "summarize this week"
   Rule: pass the user's question verbatim. This is for READING/analyzing data, not changing it.

13. clarify: {"kind":"clarify","question":string,"options":string[]}
   Use ONLY when intent is genuinely ambiguous and guessing could do the wrong thing — e.g. "handle the Mumbai thing" (task? note? announce?) or a name that matches two people. DON'T guess. Ask ONE short question and offer 2–4 tappable options the user can pick.
   Example: "log the mumbai meeting" → {"kind":"clarify","question":"Want me to add that as a task, or just note it down?","options":["Add as task","Just a note"],"reply_text":"Quick check —"}
   Rule: prefer ACTING when intent is clear (>~70% sure). Only clarify for real forks. Never clarify twice in a row for the same thing.

14. chat (fallback): {"kind":"chat","text":string}
   For capability questions ("what can you do") or things outside the CRM (weather, jokes). Redirect warmly to what you CAN do. (For ambiguous CRM intent use clarify, not chat.)

PERSONALITY (shape the reply_text tone; NEVER changes which action you pick):
- The speaker's profile arrives as "SPEAKER STYLE". Match their tone, language, and pet name.
- tone=casual → relaxed, "Got it 👍". tone=crisp → tight, no fluff, "Done, boss." tone=warm → friendly, calm. tone=playful → upbeat, an emoji is fine. tone=formal → polite, complete sentences.
- If addressAs is set (e.g. "boss"), you may use it naturally. If language is "Hinglish-lite", a light Hindi warmth is welcome ("Ho gaya, boss 👍") but keep it mostly English and clear.
- No profile? Be warm, concise, human.

CASUAL & CODE-SWITCHED INPUT (critical — this is how people really talk):
- Input is messy speech/voice, NOT formal memos. No one says "add task". They say "arre call the mumbai guy kal", "remind kapoor pe follow up", "ye report kal tak chahiye".
- Understand Hinglish and Indian-English freely: "kal"=tomorrow, "aaj"=today, "abhi"=now/urgent, "karna hai"/"karo"=to do, "bol do"/"bolo"=tell, "bhej do"=send, "yaar/arre/bhai" are filler — ignore them.
- Transcribed voice may have small errors (wrong homophones, missing punctuation). Infer intent from meaning, don't nitpick words.
- Strip all filler from the task title. "arre yaar kal mumbai wale ko call karna hai" → title:"call the Mumbai client", today:false (kal=tomorrow, not today).

CONTEXT YOU RECEIVE:
- Team: the real employee names. KNOWN NICKNAMES: mappings the user taught before — when the user uses a nickname, pass it (or the resolved real name) as personQuery; do NOT ask who it is if it's in the known list.
- Recent conversation: use it to resolve references like "assign it to him", "that task", "same as yesterday".

FLEXIBILITY:
- Adapt to their shorthand ("reminder: X" = add task X). Handle negation ("nevermind the analytics task" = delete). Infer implied intent ("the wireframes are ready" + they can announce = announce).
- If a name could match multiple teammates, ask once via chat.
- Trust intent: if it's clearly work, act; if clearly not (weather, jokes), chat + pivot to what you can do.

RESPONSE: strict JSON only. No explanations, no markdown fences.`;

// Some models answer with assignee/sendTo/dueToday despite the schema — accept
// both and normalize to what the frontend executes (personQuery/today).
function normalize(a: any): any {
  if (!a || typeof a !== 'object') return { kind: 'chat', text: 'Sorry, I did not catch that — try again?', reply_text: 'Sorry, I did not catch that — try again?' };
  if (a.assignee !== undefined && a.personQuery === undefined) a.personQuery = a.assignee;
  if (a.sendTo !== undefined && a.personQuery === undefined) a.personQuery = a.sendTo;
  if (a.dueToday !== undefined && a.today === undefined) a.today = a.dueToday;
  if (a.personQuery === null) delete a.personQuery;
  delete a.assignee; delete a.sendTo; delete a.dueToday;
  // clarify safety: keep 2–4 short options
  if (a.kind === 'clarify' && Array.isArray(a.options)) a.options = a.options.filter((o: any) => typeof o === 'string').slice(0, 4);
  // reply_text is optional per-action; guarantee a string so the frontend can trust it
  if (typeof a.reply_text !== 'string' || !a.reply_text.trim()) delete a.reply_text;
  return a;
}

function contextBlock(body: ReqBody): string {
  const nick = body.nicknames && Object.keys(body.nicknames).length
    ? `\nKNOWN NICKNAMES: ${Object.entries(body.nicknames).map(([n, real]) => `"${n}" = ${real}`).join(', ')}`
    : '';
  const p = body.persona;
  const persona = p
    ? `\nSPEAKER STYLE — ${p.displayName ?? body.me.name}: tone=${p.tone ?? 'warm'}, addressAs=${p.addressAs ?? 'none'}, language=${p.language ?? 'English'}. ${p.notes ?? ''}`.trimEnd()
    : '';
  return `Team: ${body.employees.map(e => e.name).join(', ')}${nick}${persona}\nUser (${body.me.name}, ${body.me.role}): ${body.text}`;
}

function chatMessages(body: ReqBody): { role: string; content: string }[] {
  const history = (body.history ?? []).slice(-8).map(h => ({ role: h.role, content: h.content }));
  return [
    { role: 'system', content: SYSTEM },
    ...history,
    { role: 'user', content: contextBlock(body) },
  ];
}

async function callOpenRouter(body: ReqBody): Promise<any> {
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://gms-seven-black.vercel.app',
      'X-Title': 'Zypit',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: chatMessages(body),
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
      messages: chatMessages(body),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI error ${res.status}`);
  return JSON.parse(json.choices[0].message.content);
}

async function callAnthropic(body: ReqBody): Promise<any> {
  const history = (body.history ?? []).slice(-8);
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
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: contextBlock(body) },
      ],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Anthropic error ${res.status}`);
  const txt = json.content?.[0]?.text ?? '{}';
  return JSON.parse(txt.replace(/^```json\s*|\s*```$/g, ''));
}

// ── Rate limiting (per user, in-memory) ───────────────────────────────────
// Serverless instances don't share memory, so this is per-instance — a soft
// cap that still stops runaway loops / spam from one tab (the realistic risk
// for an internal tool). 12 requests / 60s per user id.
const RATE_LIMIT = 12;
const RATE_WINDOW = 60_000;
const _hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (_hits.get(userId) ?? []).filter(t => now - t < RATE_WINDOW);
  if (arr.length >= RATE_LIMIT) { _hits.set(userId, arr); return true; }
  arr.push(now);
  _hits.set(userId, arr);
  if (_hits.size > 500) _hits.clear(); // keep the map from growing unbounded
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ kind: 'chat', text: 'Method not allowed' }); return; }
  try {
    const body: ReqBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body?.text || !body?.me) { res.status(400).json({ error: 'bad request' }); return; }
    if (typeof body.text !== 'string' || body.text.length > 1000) { res.status(400).json({ error: 'message too long' }); return; }
    if (rateLimited(String(body.me.id ?? 'anon'))) {
      res.status(200).json({ kind: 'chat', text: 'Easy there 🙂 — give me a few seconds between commands.' });
      return;
    }
    let action;
    if (process.env.OPENROUTER_API_KEY) action = await callOpenRouter(body);
    else if (process.env.OPENAI_API_KEY) action = await callOpenAI(body);
    else if (process.env.ANTHROPIC_API_KEY) action = await callAnthropic(body);
    else { res.status(200).json({ kind: 'chat', text: 'AI backend not configured.' }); return; }
    res.status(200).json(normalize(action));
  } catch (err: any) {
    // Frontend falls back to its local parser on any non-200.
    res.status(500).json({ error: err?.message || 'agent error' });
  }
}
