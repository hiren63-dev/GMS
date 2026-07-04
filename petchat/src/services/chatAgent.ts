// ─────────────────────────────────────────────────────────────────────────
// Zypit Chat Agent  (v2 — permissions · personalization · undo · audit)
//
// Turns natural-language chat input into REAL Firestore actions. Every action
// routes through the same service functions the dashboard already listens to
// (createTask, updateTask, sendMessage, createAnnouncement…), so the moment the
// agent confirms "done", the dashboard's real-time listeners have already
// rendered it. There is no separate agent-state that can drift from the UI.
//
// Pipeline the UI drives:
//   interpret(text) → AgentAction      (LLM brain, or local keyword fallback)
//   assess(action)  → { permitted, risky, confirmText }   (role gate + safety)
//   execute(action) → { ok, reply, undo? }                (writes + audit log)
//
//   • Non-risky + permitted → execute instantly (Duolingo-fast) + offer Undo.
//   • Risky (announce-all, delete) → UI shows a 3-2-1 confirm before execute.
//   • Not permitted → friendly deny, nothing touches Firestore.
//
// Two brains, one execution layer:
//   • parseLocally()  — deterministic keyword + fuzzy matcher. Works with NO key.
//   • parseWithLLM()  — calls /api/chat. Understands ANY phrasing. Activated by
//                       VITE_AI_ENABLED=true + a key in Vercel. Falls back local.
// ─────────────────────────────────────────────────────────────────────────
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import {
  db, createTask, updateTask, deleteTask, createAnnouncement, deleteAnnouncement,
  sendMessage, getAllTasks, getTodaysCheckIn, logAudit, logTaskDone,
} from './firebase';
import type { Employee, Task, ResourceFile, Priority, Permission } from '../types';
import teamContext from '../config/team-context.json';

export interface AgentContext {
  me: Employee;
  employees: Employee[];
}

// ── Personality layer (team-context.json) ─────────────────────────────────
// Optional tone profile for the SPEAKER, sent to the LLM so replies match how
// each person likes to be spoken to. Live nicknames (aiPrefs) still win for
// resolving people — this only shapes the reply's warmth/language.
interface Persona { displayName?: string; tone?: string; addressAs?: string | null; language?: string; notes?: string; }
function resolvePersona(me: Employee): Persona | undefined {
  const tc: any = teamContext;
  const meNorm = norm(me.name);
  const first = norm(me.name.split(' ')[0]);
  for (const p of (tc.people ?? [])) {
    const keys: string[] = (p.match ?? []).map((m: string) => norm(m));
    if (keys.includes(meNorm) || keys.includes(first)) {
      return { displayName: p.displayName, tone: p.tone, addressAs: p.addressAs, language: p.language, notes: p.notes };
    }
  }
  return tc.default ? { ...tc.default, displayName: me.name.split(' ')[0] } : undefined;
}

export type AgentAction =
  | { kind: 'create_task'; title: string; personQuery?: string; priority?: Priority; today?: boolean }
  | { kind: 'complete_task'; taskQuery: string }
  | { kind: 'delete_task'; taskQuery: string }
  | { kind: 'list_my_tasks' }
  | { kind: 'send_file'; fileQuery: string; personQuery: string }
  | { kind: 'find_file'; fileQuery: string }
  | { kind: 'announce'; body: string }
  | { kind: 'who_checked_in' }
  | { kind: 'remember_nickname'; nickname: string; personQuery: string }
  | { kind: 'set_priority'; taskQuery: string; priority: Priority }
  | { kind: 'add_note'; taskQuery: string; note: string }
  | { kind: 'ask_data'; question: string }
  | { kind: 'clarify'; question: string; options?: string[] }
  | { kind: 'chat'; text: string };

// The LLM may attach a personalized one-liner (persona-shaped) to any action.
type LLMAction = AgentAction & { reply_text?: string };

// Tappable quick-reply (WhatsApp-business style): runs an action directly,
// prefills the composer, or sends a fresh message (used by clarify branches).
export interface QuickOption { label: string; act?: AgentAction; prefill?: string; send?: string }

// ── Per-user AI memory (persists across sessions in Firestore) ────────────
// aiPrefs/{employeeId} = { nicknames: { "ak": "Raj Kumar", ... } }
// Nicknames the user teaches in chat ("we call ananya nyu") are saved here and
// loaded on every session — so the assistant remembers people the way YOU do.
interface AiPrefs { nicknames: Record<string, string> } // normalized nickname → employee full name

let _prefs: AiPrefs | null = null;
let _prefsFor: string | null = null;
// short conversation memory (this session) so the LLM can resolve "him"/"that task"
const _turns: { role: 'user' | 'assistant'; content: string }[] = [];

async function loadPrefs(meId: string): Promise<AiPrefs> {
  if (_prefs && _prefsFor === meId) return _prefs;
  try {
    const snap = await getDoc(doc(db, 'aiPrefs', meId));
    _prefs = (snap.exists() ? (snap.data() as AiPrefs) : { nicknames: {} });
    if (!_prefs.nicknames) _prefs.nicknames = {};
  } catch { _prefs = { nicknames: {} }; }
  _prefsFor = meId;
  return _prefs;
}

async function saveNickname(meId: string, nickname: string, realName: string): Promise<void> {
  const p = await loadPrefs(meId);
  p.nicknames[norm(nickname)] = realName;
  try { await setDoc(doc(db, 'aiPrefs', meId), { nicknames: p.nicknames, updatedAt: Date.now() }, { merge: true }); }
  catch { /* memory still works for this session */ }
}

function pushTurn(role: 'user' | 'assistant', content: string) {
  _turns.push({ role, content });
  if (_turns.length > 8) _turns.splice(0, _turns.length - 8);
}

export interface AgentResult {
  reply: string;
  ok: boolean;
  undo?: () => Promise<void>;   // present when the action is safely reversible
  historyLabel?: string;        // short label for the action-history list
  options?: QuickOption[];      // tappable next steps (slot-filling, disambiguation)
}

export interface Assessment {
  permitted: boolean;
  denyReason?: string;
  risky: boolean;               // risky ⇒ UI must confirm before execute
  confirmText?: string;         // what the confirm dialog asks
}

// ── Permissions ───────────────────────────────────────────────────────────
// founders + admins can do everything; other employees need the granular grant.
function can(me: Employee, perm: Permission): boolean {
  if (me.role === 'founder' || me.role === 'admin') return true;
  return !!me.permissions?.includes(perm);
}

// ── Fuzzy matching helpers ────────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function scoreMatch(needle: string, haystack: string): number {
  const n = norm(needle);
  const h = norm(haystack);
  if (!n || !h) return 0;
  if (h === n) return 100;
  if (h.includes(n) || n.includes(h)) return 80;
  const nTok = new Set(n.split(' '));
  const hTok = h.split(' ');
  const overlap = hTok.filter(t => nTok.has(t)).length;
  if (overlap === 0) return 0;
  return 40 + overlap * 10;
}

function bestEmployee(queryStr: string, employees: Employee[], excludeId?: string): Employee | null {
  let best: Employee | null = null;
  let bestScore = 0;
  for (const e of employees) {
    if (excludeId && e.id === excludeId) continue;
    const s = Math.max(scoreMatch(queryStr, e.name), scoreMatch(queryStr, e.name.split(' ')[0]));
    if (s > bestScore) { bestScore = s; best = e; }
  }
  return bestScore >= 40 ? best : null;
}

// Nickname-aware person resolution: learned nicknames win, then fuzzy match.
// Used by BOTH brains, so even the offline keyword parser understands "ak".
function resolvePerson(queryStr: string, employees: Employee[], excludeId?: string): Employee | null {
  const nickTarget = _prefs?.nicknames?.[norm(queryStr)];
  if (nickTarget) {
    const hit = employees.find(e => norm(e.name) === norm(nickTarget) && (!excludeId || e.id !== excludeId))
      ?? (() => { const f = bestEmployee(nickTarget, employees, excludeId); return f; })();
    if (hit) return hit;
  }
  return bestEmployee(queryStr, employees, excludeId);
}

// suggestions when a person match is ambiguous — powers "did you mean…"
function employeeSuggestions(queryStr: string, employees: Employee[], excludeId?: string): string[] {
  return employees
    .filter(e => !excludeId || e.id !== excludeId)
    .map(e => ({ e, s: Math.max(scoreMatch(queryStr, e.name), scoreMatch(queryStr, e.name.split(' ')[0])) }))
    .filter(x => x.s >= 30)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map(x => x.e.name);
}

function bestFile(queryStr: string, files: ResourceFile[]): ResourceFile | null {
  let best: ResourceFile | null = null;
  let bestScore = 0;
  for (const f of files) {
    const s = scoreMatch(queryStr, f.name.replace(/\.[a-z0-9]+$/i, ''));
    if (s > bestScore) { bestScore = s; best = f; }
  }
  return bestScore >= 40 ? best : null;
}

function bestTask(queryStr: string, tasks: Task[]): Task | null {
  let best: Task | null = null;
  let bestScore = 0;
  for (const t of tasks) {
    const s = scoreMatch(queryStr, t.title);
    if (s > bestScore) { bestScore = s; best = t; }
  }
  return bestScore >= 40 ? best : null;
}

// ── Read-cache with write-invalidation ────────────────────────────────────
// The dock is used all day; without this every message re-downloads the whole
// tasks/files collections. 20s TTL keeps replies instant AND fresh; any write
// through the agent invalidates immediately so the user never sees stale data.
const TTL = 20_000;
let _taskCache: { at: number; data: Task[] } | null = null;
let _fileCache: { at: number; data: ResourceFile[] } | null = null;

async function cachedTasks(): Promise<Task[]> {
  if (_taskCache && Date.now() - _taskCache.at < TTL) return _taskCache.data;
  const data = await getAllTasks();
  _taskCache = { at: Date.now(), data };
  return data;
}
function invalidateTasks() { _taskCache = null; }

async function loadResourceFiles(): Promise<ResourceFile[]> {
  if (_fileCache && Date.now() - _fileCache.at < TTL) return _fileCache.data;
  const s = await getDocs(collection(db, 'resourceFiles'));
  const data = s.docs.map(d => ({ id: d.id, ...d.data() } as ResourceFile));
  _fileCache = { at: Date.now(), data };
  return data;
}

function audit(me: Employee, action: string, target: string, details?: string) {
  // fire-and-forget; never block a user action on the audit write
  try { logAudit({ actorId: me.id, actorName: me.name, action: `ai:${action}`, target, details, timestamp: Date.now() }); }
  catch { /* ignore */ }
}

// ── Local (no-key) intent parser ──────────────────────────────────────────
export function parseLocally(text: string): AgentAction {
  const t = text.trim();
  const low = t.toLowerCase();

  // note for "task": ... (produced by the ✍️ Add details quick-reply prefill)
  const noteMatch = t.match(/^note for ["“](.+?)["”]:\s*(.+)$/i);
  if (noteMatch) return { kind: 'add_note', taskQuery: noteMatch[1], note: noteMatch[2].trim() };

  // set priority: "make the obula task urgent" / "set report to high priority"
  const prioMatch = low.match(/(?:make|set|mark)\s+(?:the\s+)?(.+?)\s+(?:task\s+)?(?:to\s+|as\s+)?(urgent|high|medium|low)(?:\s+priority)?$/);
  if (prioMatch && /priority|urgent|high|medium|low/.test(low) && !/\b(add|create|new)\b/.test(low)) {
    return { kind: 'set_priority', taskQuery: prioMatch[1].replace(/\btask\b/g, '').trim(), priority: prioMatch[2] as Priority };
  }

  // teach a nickname: "we call ananya nyu" / "raj is called ak" / "remember sri as lucky"
  const teach =
    low.match(/^\s*we\s+call\s+(.+?)\s+["']?([\w.-]+)["']?\s*$/i) ||
    low.match(/^\s*(.+?)\s+is\s+(?:also\s+)?(?:called|known\s+as)\s+["']?([\w.-]+)["']?\s*$/i) ||
    low.match(/^\s*remember\s+(.+?)\s+as\s+["']?([\w.-]+)["']?\s*$/i) ||
    low.match(/^\s*(.+?)(?:'s|s)\s+nickname\s+is\s+["']?([\w.-]+)["']?\s*$/i);
  if (teach) {
    return { kind: 'remember_nickname', personQuery: teach[1].trim(), nickname: teach[2].trim() };
  }

  // delete <task>  (checked before "complete" so "delete" wins)
  const delMatch = low.match(/(?:delete|remove|cancel|drop)\s+(?:the\s+)?(?:task\s+)?(.+?)\s*(?:task)?$/);
  if (/\b(delete|remove)\b/.test(low) && /\btask|to-?do\b/.test(low) && delMatch) {
    return { kind: 'delete_task', taskQuery: delMatch[1].replace(/\btask\b/g, '').trim() };
  }

  // send <file> to <person>
  const sendMatch = low.match(/send\s+(?:the\s+|this\s+)?(.+?)\s+(?:to|for)\s+(.+)/);
  if (sendMatch && (low.includes('file') || low.includes('doc') || low.includes('deck') || low.includes('send'))) {
    return { kind: 'send_file', fileQuery: sendMatch[1].replace(/\b(file|document|doc|deck)\b/g, '').trim() || sendMatch[1], personQuery: sendMatch[2].trim() };
  }

  // find / retrieve / where is <file>
  const findMatch = low.match(/(?:find|get|retrieve|where(?:'s| is)|show me)\s+(?:the\s+|my\s+)?(.+?)(?:\s+file|\s+document|\s+doc|\?|$)/);
  if (findMatch && (low.includes('file') || low.includes('document') || low.includes('doc') || low.includes('retrieve') || low.includes('find'))) {
    return { kind: 'find_file', fileQuery: findMatch[1].trim() };
  }

  // who checked in / attendance
  if (/(who|how many).*(check(ed)?\s?in|checkin)/.test(low) || low.includes('checked in today')) {
    return { kind: 'who_checked_in' };
  }

  // list my tasks
  if (/(my|list|show|what).*(task|to-?do)/.test(low) && !/add|create|new|assign/.test(low)) {
    return { kind: 'list_my_tasks' };
  }

  // complete / mark done
  const doneMatch = low.match(/(?:mark|set|complete|finish|close)\s+(?:the\s+)?(.+?)\s*(?:as\s+)?(?:done|complete|completed|finished)?$/);
  if (/\b(done|complete|completed|finish|finished)\b/.test(low) && doneMatch) {
    return { kind: 'complete_task', taskQuery: doneMatch[1].replace(/\btask\b/g, '').trim() };
  }

  // announce
  const annMatch = low.match(/(?:announce|announcement|tell everyone|broadcast|let (?:the )?team know)(?:\s+that)?\s+(.+)/);
  if (annMatch) {
    const idx = low.indexOf(annMatch[1]);
    return { kind: 'announce', body: t.slice(idx).trim() || annMatch[1] };
  }

  // create task (incl. "my task for today")
  const isTaskCreate = /\b(add|create|new|assign|remind me to|i (?:need|have) to)\b/.test(low) && /\b(task|to-?do)\b/.test(low)
    || /\b(my task for today|task for today|today'?s task)\b/.test(low);
  if (isTaskCreate) {
    const today = /\btoday\b/.test(low);
    let personQuery: string | undefined;
    const assignMatch = low.match(/(?:for|to)\s+([a-z]+(?:\s+[a-z]+)?)\s*$/);
    if (assignMatch && /assign|for\s|to\s/.test(low) && !today) personQuery = assignMatch[1].trim();
    let title = t
      .replace(/^\s*(add|create|new|assign|please)\s+/i, '')
      .replace(/\b(a\s+)?(task|to-?do)\b/gi, '')
      .replace(/\bfor\s+today\b/gi, '')
      .replace(/\bmy\b/gi, '')
      .replace(/\btoday\b/gi, '')
      .replace(/\s+for\s+[a-z]+(\s+[a-z]+)?\s*$/i, '')
      .replace(/[:\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const prio: Priority | undefined = /urgent|asap/.test(low) ? 'urgent' : /high priority|important/.test(low) ? 'high' : undefined;
    if (!title) title = t;
    return { kind: 'create_task', title, personQuery, priority: prio, today };
  }

  // data questions → the analyst ("who is working on what", "any blockers today")
  if (
    /^(who|what|which|how many|how is|why|is|are|any)\b/.test(low) ||
    /\b(blocker|blocked|working on|overdue|progress|summar|workload|status of)\b/.test(low)
  ) {
    return { kind: 'ask_data', question: t };
  }

  return { kind: 'chat', text: t };
}

// ── LLM brain (activated when configured) ─────────────────────────────────
async function parseWithLLM(text: string, ctx: AgentContext): Promise<LLMAction> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      me: { id: ctx.me.id, name: ctx.me.name, role: ctx.me.role },
      employees: ctx.employees.map(e => ({ id: e.id, name: e.name, department: e.department })),
      history: _turns.slice(-8),                 // lets the LLM resolve "him" / "that task"
      nicknames: _prefs?.nicknames ?? {},        // learned nicknames, so it never re-asks
      persona: resolvePersona(ctx.me),           // tone profile → personalized reply_text
    }),
  });
  if (!res.ok) throw new Error('llm-unavailable');
  return (await res.json()) as LLMAction;
}

const LLM_ENABLED = import.meta.env.VITE_AI_ENABLED === 'true';

/** Step 1 — turn text into a structured action (LLM if available, else local). */
export async function interpret(text: string, ctx: AgentContext): Promise<AgentAction> {
  await loadPrefs(ctx.me.id);                    // nickname memory ready for BOTH brains
  pushTurn('user', text);
  if (LLM_ENABLED) {
    try {
      const action = await parseWithLLM(text, ctx);
      // Deterministic guard: if the router LLM dodges an obvious data question
      // ("I can't provide…"), reroute it to the analyst instead of the user
      // ever seeing a refusal. Strong data words only, so real chat stays chat.
      if (action.kind === 'chat' && /\b(blocker|blocked|working on|overdue|workload|progress|status of|summar|checked in)\b/i.test(text)) {
        return { kind: 'ask_data', question: text };
      }
      return action;
    }
    catch { return parseLocally(text); }   // graceful fallback keeps the dock working
  }
  return parseLocally(text);
}

/** Step 2 — role gate + safety classification. The UI reads this to decide
 *  whether to deny, confirm (risky), or run immediately. */
export function assess(action: AgentAction, ctx: AgentContext): Assessment {
  const { me, employees } = ctx;
  switch (action.kind) {
    case 'create_task': {
      const who = action.personQuery ? resolvePerson(action.personQuery, employees) : me;
      const assigningToOther = !!who && who.id !== me.id;
      if (assigningToOther && !can(me, 'assign_tasks')) {
        return { permitted: false, risky: false, denyReason: `You can only add tasks to your own list. Ask an admin for the "assign tasks" permission to hand work to others. Want me to add "${action.title}" to your list instead?` };
      }
      return { permitted: true, risky: false };
    }
    case 'announce': {
      if (!can(me, 'post_announcements')) {
        return { permitted: false, risky: false, denyReason: `Only admins (or people with the "post announcements" permission) can broadcast to the whole team.` };
      }
      return { permitted: true, risky: true, confirmText: `📣 Announce to the whole team:\n"${action.body}"` };
    }
    case 'delete_task':
      return { permitted: true, risky: true, confirmText: `🗑️ Delete the task matching "${action.taskQuery}"? This can't be undone.` };
    case 'remember_nickname':
      return { permitted: true, risky: false };
    default:
      return { permitted: true, risky: false };
  }
}

// ── Execution: the single source of truth ─────────────────────────────────
export async function execute(action: AgentAction, ctx: AgentContext): Promise<AgentResult> {
  const result = await executeInner(action, ctx);
  // Personality lead: on a successful EXECUTED action, prepend the LLM's warm,
  // persona-shaped one-liner. Skipped for conversational kinds (they craft their
  // own text) and on failure (facts must stay accurate, never the warm guess).
  const rt = (action as LLMAction).reply_text?.trim();
  if (rt && result.ok && !['chat', 'clarify', 'ask_data'].includes(action.kind) && !result.reply.startsWith(rt)) {
    result.reply = `${rt}\n${result.reply}`;
  }
  pushTurn('assistant', result.reply);   // keep conversation memory for "him"/"that task"
  return result;
}

async function executeInner(action: AgentAction, ctx: AgentContext): Promise<AgentResult> {
  const { me, employees } = ctx;

  switch (action.kind) {
    case 'remember_nickname': {
      const person = resolvePerson(action.personQuery, employees);
      if (!person) {
        const hint = employeeSuggestions(action.personQuery, employees);
        return { ok: false, reply: `I couldn't find "${action.personQuery}" in the team.${hint.length ? ` Did you mean: ${hint.join(', ')}?` : ''}` };
      }
      await saveNickname(me.id, action.nickname, person.name);
      audit(me, 'remember_nickname', person.name, `"${action.nickname}"`);
      return {
        ok: true,
        reply: `Got it — "${action.nickname}" means ${person.name}. I'll remember that from now on. 🧠`,
        historyLabel: `Learned nickname “${action.nickname}” = ${person.name}`,
      };
    }

    case 'create_task': {
      const assignee = action.personQuery ? resolvePerson(action.personQuery, employees) : me;
      if (action.personQuery && !assignee) {
        const hint = employeeSuggestions(action.personQuery, employees);
        return {
          ok: false,
          reply: `I couldn't find "${action.personQuery}".${hint.length ? ' Did you mean:' : ' Who should I assign it to?'}`,
          options: hint.length ? [
            ...hint.map(n => ({ label: n, act: { ...action, personQuery: n } as AgentAction })),
            { label: 'Assign to me', act: { ...action, personQuery: undefined } as AgentAction },
          ] : undefined,
        };
      }
      const target = assignee ?? me;
      if (target.id !== me.id && !can(me, 'assign_tasks')) {
        return { ok: false, reply: `You don't have permission to assign tasks to ${target.name}.` };
      }
      const due = action.today ? endOfToday() : undefined;
      const ref = await createTask({
        title: action.title,
        assigneeId: target.id,
        assigneeName: target.name,
        assignedById: me.id,
        priority: action.priority ?? 'medium',
        status: 'todo',
        dueDate: due,
      });
      invalidateTasks();
      audit(me, 'create_task', action.title, `→ ${target.name}${action.today ? ' (today)' : ''}`);
      const who = target.id === me.id ? 'your list' : target.name;
      const when = action.today ? ' (due today)' : '';
      // Slot-filling: if they didn't say a priority, offer one-tap refinement
      // (WhatsApp-business style) instead of making them type again.
      const options: QuickOption[] | undefined = action.priority ? undefined : [
        { label: '🔴 Urgent', act: { kind: 'set_priority', taskQuery: action.title, priority: 'urgent' } },
        { label: '🟠 High', act: { kind: 'set_priority', taskQuery: action.title, priority: 'high' } },
        { label: '✍️ Add details', prefill: `note for "${action.title}": ` },
      ];
      return {
        ok: true,
        reply: `✅ Added "${action.title}" to ${who}${when}.${options ? ' Priority is medium — want to change it?' : ''}`,
        historyLabel: `Task “${action.title}” → ${target.id === me.id ? 'you' : target.name}`,
        undo: async () => { await deleteTask((ref as any).id); invalidateTasks(); },
        options,
      };
    }

    case 'set_priority': {
      const tasks = await cachedTasks();
      const mine = tasks.filter(t => t.assigneeId === me.id || t.assignedById === me.id);
      const match = bestTask(action.taskQuery, mine.length ? mine : tasks);
      if (!match) return { ok: false, reply: `I couldn't find a task matching "${action.taskQuery}".` };
      await updateTask(match.id, { priority: action.priority });
      invalidateTasks();
      audit(me, 'set_priority', match.title, action.priority);
      const icon = action.priority === 'urgent' ? '🔴' : action.priority === 'high' ? '🟠' : '🔵';
      return { ok: true, reply: `${icon} "${match.title}" is now ${action.priority} priority.`, historyLabel: `Priority ${action.priority} → “${match.title}”` };
    }

    case 'add_note': {
      const tasks = await cachedTasks();
      const mine = tasks.filter(t => t.assigneeId === me.id || t.assignedById === me.id);
      const match = bestTask(action.taskQuery, mine.length ? mine : tasks);
      if (!match) return { ok: false, reply: `I couldn't find a task matching "${action.taskQuery}".` };
      const description = match.description ? `${match.description}\n${action.note}` : action.note;
      await updateTask(match.id, { description });
      invalidateTasks();
      audit(me, 'add_note', match.title);
      return { ok: true, reply: `📝 Noted on "${match.title}": ${action.note}`, historyLabel: `Note → “${match.title}”` };
    }

    case 'ask_data': {
      if (!LLM_ENABLED) return { ok: false, reply: `Data questions need the AI brain (VITE_AI_ENABLED). Ask me to list your tasks instead.` };
      const isMgr = me.role === 'founder' || me.role === 'admin' || can(me, 'view_reports');
      const tasks = await cachedTasks();
      const scoped = isMgr ? tasks : tasks.filter(t => t.assigneeId === me.id || t.assignedById === me.id);
      // today's check-ins (mood + blockers are the qualitative signal)
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      let checkins: any[] = [];
      try {
        const s = await getDocs(query(collection(db, 'checkIns'), where('dateKey', '==', dateKey)));
        checkins = s.docs.map(d => d.data() as any)
          .filter(c => isMgr || c.employeeId === me.id)
          .map(c => ({ name: c.employeeName, mood: c.mood, workDone: c.workDone, problem: c.hasProblems ? (c.problemDetails || 'yes') : null }));
      } catch { /* snapshot still useful without checkins */ }
      const snapshot = {
        today: dateKey,
        employees: isMgr ? employees.map(e => ({ name: e.name, department: e.department, role: e.role })) : undefined,
        tasks: scoped.slice(0, 120).map(t => ({
          title: t.title, assignee: t.assigneeName, status: t.status, priority: t.priority,
          due: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null,
          overdue: !!(t.dueDate && t.status !== 'done' && t.dueDate < Date.now()),
        })),
        checkinsToday: checkins,
      };
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: action.question, me: { id: me.id, name: me.name, role: me.role }, snapshot }),
      });
      if (!res.ok) return { ok: false, reply: `I couldn't analyze that right now — try again in a moment.` };
      const { answer } = await res.json();
      audit(me, 'ask_data', action.question.slice(0, 60));
      return { ok: true, reply: answer || 'No answer.', historyLabel: `Asked: “${action.question.slice(0, 40)}${action.question.length > 40 ? '…' : ''}”` };
    }

    case 'complete_task': {
      const tasks = await cachedTasks();
      const mine = tasks.filter(t => t.assigneeId === me.id || t.assignedById === me.id);
      const match = bestTask(action.taskQuery, mine.length ? mine : tasks);
      if (!match) return { ok: false, reply: `I couldn't find a task matching "${action.taskQuery}". Try the exact title?` };
      const prevStatus = match.status;
      await updateTask(match.id, { status: 'done', completedAt: Date.now() });
      invalidateTasks();
      logTaskDone(me.id, me.name, match.title);
      audit(me, 'complete_task', match.title);
      return {
        ok: true,
        reply: `✅ Marked "${match.title}" as done. Nice work.`,
        historyLabel: `Completed “${match.title}”`,
        undo: async () => { await updateTask(match.id, { status: prevStatus, completedAt: 0 }); invalidateTasks(); },
      };
    }

    case 'delete_task': {
      const tasks = await cachedTasks();
      // employees may only delete tasks they own or created; admins/founders any
      const scope = can(me, 'assign_tasks') ? tasks : tasks.filter(t => t.assigneeId === me.id || t.assignedById === me.id);
      const match = bestTask(action.taskQuery, scope);
      if (!match) return { ok: false, reply: `I couldn't find a task you can delete matching "${action.taskQuery}".` };
      await deleteTask(match.id);
      invalidateTasks();
      audit(me, 'delete_task', match.title);
      return { ok: true, reply: `🗑️ Deleted "${match.title}".`, historyLabel: `Deleted “${match.title}”` };
    }

    case 'list_my_tasks': {
      const tasks = await cachedTasks();
      const mine = tasks.filter(t => t.assigneeId === me.id && t.status !== 'done');
      if (!mine.length) return { ok: true, reply: `You have no open tasks. 🎉` };
      const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const lines = mine
        .sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2))
        .slice(0, 10)
        .map(t => `• ${t.title}${t.priority === 'urgent' ? ' 🔴' : t.status === 'in_progress' ? ' (in progress)' : ''}`);
      return { ok: true, reply: `You have ${mine.length} open task${mine.length > 1 ? 's' : ''}:\n${lines.join('\n')}` };
    }

    case 'send_file': {
      const person = resolvePerson(action.personQuery, employees, me.id);
      if (!person) {
        const hint = employeeSuggestions(action.personQuery, employees, me.id);
        return {
          ok: false,
          reply: `I couldn't find "${action.personQuery}" in the team.${hint.length ? ' Did you mean:' : ''}`,
          options: hint.length ? hint.map(n => ({ label: n, act: { ...action, personQuery: n } as AgentAction })) : undefined,
        };
      }
      const files = await loadResourceFiles();
      const file = bestFile(action.fileQuery, files);
      if (!file) return { ok: false, reply: `I couldn't find a file matching "${action.fileQuery}". It needs to be in Resources first.` };
      await sendMessage({
        senderId: me.id,
        senderName: me.name,
        recipientId: person.id,
        participants: [me.id, person.id],
        content: `📎 Sent you "${file.name}"`,
        isGroupChat: false,
        timestamp: Date.now(),
        attachment: { name: file.name, size: file.size, ext: file.ext, url: file.url },
      });
      audit(me, 'send_file', file.name, `→ ${person.name}`);
      return { ok: true, reply: `✅ Sent "${file.name}" to ${person.name}. It's in your Messages with them.`, historyLabel: `Sent “${file.name}” → ${person.name}` };
    }

    case 'find_file': {
      const files = await loadResourceFiles();
      const file = bestFile(action.fileQuery, files);
      if (!file) {
        const names = files.slice(0, 5).map(f => `• ${f.name}`).join('\n');
        return { ok: false, reply: files.length ? `No exact match for "${action.fileQuery}". Recent files:\n${names}` : `No files uploaded yet.` };
      }
      return { ok: true, reply: `📄 Found "${file.name}" (${file.size}) — uploaded by ${file.uploadedByName}. Open it in Resources.` };
    }

    case 'announce': {
      if (!can(me, 'post_announcements')) return { ok: false, reply: `You don't have permission to post announcements.` };
      const ref = await createAnnouncement({
        title: action.body.length > 48 ? action.body.slice(0, 48) + '…' : action.body,
        body: action.body,
        authorId: me.id,
        authorName: me.name,
        audience: ['all'],
        pinned: false,
        createdAt: Date.now(),
      });
      audit(me, 'announce', action.body.slice(0, 60));
      return {
        ok: true,
        reply: `📣 Announced to the whole team: "${action.body}". It's live on Announcements.`,
        historyLabel: `Announced “${action.body.slice(0, 32)}${action.body.length > 32 ? '…' : ''}”`,
        undo: async () => { await deleteAnnouncement((ref as any).id); },
      };
    }

    case 'who_checked_in': {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const s = await getDocs(query(collection(db, 'checkIns'), where('dateKey', '==', dateKey)));
      const names = s.docs.map(d => (d.data() as any).employeeName).filter(Boolean);
      if (!names.length) return { ok: true, reply: `No one has checked in yet today.` };
      return { ok: true, reply: `${names.length} checked in today: ${names.join(', ')}.` };
    }

    case 'clarify': {
      // Genuine ambiguity — ask ONE question, offer tappable branches. Tapping
      // sends that choice as a fresh message; conversation history gives the LLM
      // the original request so a terse pick ("Add as task") still resolves.
      const opts = (action.options ?? []).slice(0, 4).map(o => ({ label: o, send: o }));
      return { ok: true, reply: action.question, options: opts.length ? opts : undefined };
    }

    case 'chat':
    default:
      return {
        ok: true,
        // Prefer the LLM's own words (reply_text, or the chat action's text) so a
        // tailored conversational answer isn't thrown away for the generic help
        // line. The canned capabilities line is only the last-resort fallback.
        reply: (action as LLMAction).reply_text?.trim()
          || (action as { text?: string }).text?.trim()
          || `I can add tasks, mark them done, delete tasks, send files, post announcements, and tell you who checked in. Try: "call the Mumbai client tomorrow" or "send the pitch deck to Raj".`,
      };
  }
}

// ── Proactive personalization ──────────────────────────────────────────────
// Builds the alive, role-aware greeting + quick-action chips shown on open.
export async function buildGreeting(ctx: AgentContext): Promise<{ text: string; chips: string[] }> {
  const { me } = ctx;
  const first = me.name.split(' ')[0];
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  let openCount = 0;
  let urgentCount = 0;
  let doneToday = 0;
  let checkedIn = false;
  try {
    const [tasks, checkIn] = await Promise.all([cachedTasks(), getTodaysCheckIn(me.id)]);
    const mine = tasks.filter(t => t.assigneeId === me.id);
    openCount = mine.filter(t => t.status !== 'done').length;
    urgentCount = mine.filter(t => t.status !== 'done' && t.priority === 'urgent').length;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    doneToday = mine.filter(t => t.status === 'done' && (t.completedAt ?? 0) >= startOfDay.getTime()).length;
    checkedIn = !!checkIn;
  } catch { /* offline / permissions — fall back to a plain greeting */ }

  // Role-aware line
  const canManage = me.role === 'founder' || me.role === 'admin';
  let line: string;
  if (openCount === 0) {
    line = doneToday > 0
      ? `${partOfDay}, ${first} 👋 You've closed ${doneToday} task${doneToday > 1 ? 's' : ''} today and your board is clear. 🔥`
      : `${partOfDay}, ${first} 👋 Your board is clear. What do you want to line up?`;
  } else {
    const urgent = urgentCount ? ` (${urgentCount} urgent)` : '';
    line = `${partOfDay}, ${first} 👋 You've got ${openCount} open task${openCount > 1 ? 's' : ''}${urgent}${doneToday ? `, and already closed ${doneToday} today` : ''}. Want to knock one out?`;
  }
  if (!checkedIn) line += `\n\n📝 You haven't checked in yet today.`;

  // Role-aware chips
  const chips = openCount
    ? ['What are my tasks today?', 'Mark my top task done']
    : ['Add a task for today', 'What are my tasks today?'];
  if (!checkedIn) chips.push('I want to check in');
  if (canManage) { chips.unshift('Who is working on what?'); chips.push('Any blockers today?'); }
  else chips.push('Send a file to a teammate');

  return { text: line, chips: chips.slice(0, 4) };
}

// ── Backward-compatible one-shot (used if any caller wants the old behavior) ─
export async function runAgent(text: string, ctx: AgentContext): Promise<AgentResult> {
  const action = await interpret(text, ctx);
  const gate = assess(action, ctx);
  if (!gate.permitted) return { ok: false, reply: gate.denyReason ?? 'Not permitted.' };
  try {
    return await execute(action, ctx);
  } catch (err: any) {
    return { ok: false, reply: `Something went wrong doing that: ${err?.message || 'unknown error'}. Nothing was changed.` };
  }
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
