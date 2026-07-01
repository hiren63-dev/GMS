// ─────────────────────────────────────────────────────────────────────────
// BuddyDesk Chat Agent
//
// Turns natural-language chat input into REAL Firestore actions. Every action
// routes through the same service functions the dashboard already listens to
// (createTask, updateTask, sendMessage, createAnnouncement…), so the moment the
// agent confirms "done", the dashboard's real-time listeners have already
// rendered it. There is no separate agent-state that can drift from the UI.
//
// Two brains, one execution layer:
//   • parseLocally()  — deterministic keyword + fuzzy matcher. Works with NO
//                       API key. Ships today.
//   • parseWithLLM()  — calls /api/chat (see api/chat.ts). Understands ANY
//                       phrasing. Activated by setting VITE_AI_ENABLED=true and
//                       an API key in Vercel. Falls back to local on any error.
// Swap the brain without touching executeAction — that's the seam.
// ─────────────────────────────────────────────────────────────────────────
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, createTask, updateTask, createAnnouncement, sendMessage, getAllTasks } from './firebase';
import type { Employee, Task, ResourceFile, Priority } from '../types';

export interface AgentContext {
  me: Employee;
  employees: Employee[];
}

export type AgentAction =
  | { kind: 'create_task'; title: string; personQuery?: string; priority?: Priority; today?: boolean }
  | { kind: 'complete_task'; taskQuery: string }
  | { kind: 'list_my_tasks' }
  | { kind: 'send_file'; fileQuery: string; personQuery: string }
  | { kind: 'find_file'; fileQuery: string }
  | { kind: 'announce'; body: string }
  | { kind: 'who_checked_in' }
  | { kind: 'chat'; text: string };

export interface AgentResult {
  reply: string;
  ok: boolean;
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

async function loadResourceFiles(): Promise<ResourceFile[]> {
  const s = await getDocs(collection(db, 'resourceFiles'));
  return s.docs.map(d => ({ id: d.id, ...d.data() } as ResourceFile));
}

// ── Local (no-key) intent parser ──────────────────────────────────────────
export function parseLocally(text: string): AgentAction {
  const t = text.trim();
  const low = t.toLowerCase();

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
    // recover original casing for the body
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
    // strip command words to get the title
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

  return { kind: 'chat', text: t };
}

// ── LLM brain (activated when configured) ─────────────────────────────────
async function parseWithLLM(text: string, ctx: AgentContext): Promise<AgentAction> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      me: { id: ctx.me.id, name: ctx.me.name, role: ctx.me.role },
      employees: ctx.employees.map(e => ({ id: e.id, name: e.name, department: e.department })),
    }),
  });
  if (!res.ok) throw new Error('llm-unavailable');
  return (await res.json()) as AgentAction;
}

// ── Execution: the single source of truth ─────────────────────────────────
export async function executeAction(action: AgentAction, ctx: AgentContext): Promise<AgentResult> {
  const { me, employees } = ctx;

  switch (action.kind) {
    case 'create_task': {
      const assignee = action.personQuery ? bestEmployee(action.personQuery, employees) : me;
      if (action.personQuery && !assignee) {
        return { ok: false, reply: `I couldn't find anyone named "${action.personQuery}". Who should I assign it to?` };
      }
      const target = assignee ?? me;
      const due = action.today ? endOfToday() : undefined;
      await createTask({
        title: action.title,
        assigneeId: target.id,
        assigneeName: target.name,
        assignedById: me.id,
        priority: action.priority ?? 'medium',
        status: 'todo',
        dueDate: due,
      });
      const who = target.id === me.id ? 'your list' : target.name;
      const when = action.today ? ' (due today)' : '';
      return { ok: true, reply: `✅ Added "${action.title}" to ${who}${when}. It's on the board now.` };
    }

    case 'complete_task': {
      const tasks = await getAllTasks();
      const mine = tasks.filter(t => t.assigneeId === me.id || t.assignedById === me.id);
      const match = bestTask(action.taskQuery, mine.length ? mine : tasks);
      if (!match) return { ok: false, reply: `I couldn't find a task matching "${action.taskQuery}". Try the exact title?` };
      await updateTask(match.id, { status: 'done', completedAt: Date.now() });
      return { ok: true, reply: `✅ Marked "${match.title}" as done.` };
    }

    case 'list_my_tasks': {
      const tasks = await getAllTasks();
      const mine = tasks.filter(t => t.assigneeId === me.id && t.status !== 'done');
      if (!mine.length) return { ok: true, reply: `You have no open tasks. 🎉` };
      const lines = mine.slice(0, 10).map(t => `• ${t.title}${t.status === 'in_progress' ? ' (in progress)' : ''}`);
      return { ok: true, reply: `You have ${mine.length} open task${mine.length > 1 ? 's' : ''}:\n${lines.join('\n')}` };
    }

    case 'send_file': {
      const person = bestEmployee(action.personQuery, employees, me.id);
      if (!person) return { ok: false, reply: `I couldn't find "${action.personQuery}" in the team.` };
      const files = await loadResourceFiles();
      const file = bestFile(action.fileQuery, files);
      if (!file) return { ok: false, reply: `I couldn't find a file matching "${action.fileQuery}". It needs to be in Resources first.` };
      await sendMessage({
        senderId: me.id,
        senderName: me.name,
        recipientId: person.id,
        content: `📎 Sent you "${file.name}"`,
        isGroupChat: false,
        attachment: { name: file.name, size: file.size, ext: file.ext, url: file.url },
      });
      return { ok: true, reply: `✅ Sent "${file.name}" to ${person.name}. It's in your Messages with them.` };
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
      await createAnnouncement({
        title: action.body.length > 48 ? action.body.slice(0, 48) + '…' : action.body,
        body: action.body,
        authorId: me.id,
        authorName: me.name,
        audience: ['all'],
        pinned: false,
        createdAt: Date.now(),
      });
      return { ok: true, reply: `📣 Announced to the whole team: "${action.body}". It's live on Announcements.` };
    }

    case 'who_checked_in': {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const s = await getDocs(query(collection(db, 'checkIns'), where('dateKey', '==', dateKey)));
      const names = s.docs.map(d => (d.data() as any).employeeName).filter(Boolean);
      if (!names.length) return { ok: true, reply: `No one has checked in yet today.` };
      return { ok: true, reply: `${names.length} checked in today: ${names.join(', ')}.` };
    }

    case 'chat':
    default:
      return {
        ok: true,
        reply: `I can add tasks, mark them done, send files, post announcements, and tell you who checked in. Try: "add "finish the report" as my task today" or "send the pitch deck to Raj".`,
      };
  }
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// ── Public entry point ────────────────────────────────────────────────────
const LLM_ENABLED = import.meta.env.VITE_AI_ENABLED === 'true';

export async function runAgent(text: string, ctx: AgentContext): Promise<AgentResult> {
  let action: AgentAction;
  if (LLM_ENABLED) {
    try { action = await parseWithLLM(text, ctx); }
    catch { action = parseLocally(text); } // graceful fallback keeps the dock working
  } else {
    action = parseLocally(text);
  }
  try {
    return await executeAction(action, ctx);
  } catch (err: any) {
    return { ok: false, reply: `Something went wrong doing that: ${err?.message || 'unknown error'}. Nothing was changed.` };
  }
}
