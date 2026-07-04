// ─────────────────────────────────────────────────────────────────────────
// /api/transcribe — voice note → text (Vercel serverless).
//
// This is ONLY audio→text. The resulting text is then fed into the SAME
// /api/chat brain the typed input uses, so voice and text share one intent
// engine (no parallel logic, no drift). Flow:
//   mic → MediaRecorder → base64 → /api/transcribe → text → interpret() → action
//
// ── Providers (auto-detected by which key is present) ──────────────────────
//  GROQ_API_KEY  → Groq Whisper large-v3-turbo   ← RECOMMENDED (sub-second, cheap,
//                  NO cold start). Same model as HF, wildly better latency.
//  HF_API_KEY    → Hugging Face serverless Whisper. Works, but the free tier has
//                  20–60s COLD STARTS on first call — we retry through the
//                  "model is loading" 503 automatically, but the first voice note
//                  after idle will feel slow. For daily use, prefer Groq.
//
// Set the key in Vercel → Settings → Environment Variables. Never in the client.
// ─────────────────────────────────────────────────────────────────────────

interface ReqBody {
  audioBase64: string;   // base64 (no data: prefix needed, we strip it if present)
  mimeType?: string;     // e.g. "audio/webm", "audio/mp4", "audio/wav"
  me?: { id?: string };  // for rate-limiting only
}

const GROQ_MODEL = 'whisper-large-v3-turbo';
const HF_URL = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo';
const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // ~8MB ≈ a few minutes of compressed audio

// ── Rate limiting (per user, in-memory per instance) ──────────────────────
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;
const _hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (_hits.get(userId) ?? []).filter(t => now - t < RATE_WINDOW);
  if (arr.length >= RATE_LIMIT) { _hits.set(userId, arr); return true; }
  arr.push(now); _hits.set(userId, arr);
  if (_hits.size > 500) _hits.clear();
  return false;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function decodeAudio(b64: string): Buffer {
  const clean = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
  return Buffer.from(clean, 'base64');
}

// ── Groq: fast path (OpenAI-compatible multipart) ─────────────────────────
async function transcribeGroq(audio: Buffer, mime: string): Promise<string> {
  const form = new FormData();
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'webm';
  form.append('file', new Blob([audio], { type: mime || 'audio/webm' }), `voice.${ext}`);
  form.append('model', GROQ_MODEL);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  // A language hint keeps Hinglish/Indian-English from being "corrected" oddly.
  form.append('prompt', 'Casual workplace voice note. May mix English and Hindi (Hinglish). Keep names and nicknames as spoken.');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form as any,
  });
  const json: any = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Groq error ${res.status}`);
  return (json.text ?? '').trim();
}

// ── Hugging Face: their choice, with cold-start retry ─────────────────────
async function transcribeHF(audio: Buffer, mime: string): Promise<string> {
  // HF serverless answers a cold model with 503 + {error:"...loading", estimated_time}.
  // Retry a few times with backoff so the user gets text instead of an error.
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type': mime || 'audio/webm',
        'x-wait-for-model': 'true', // ask HF to hold the request until the model is warm
      },
      body: audio,
    });

    if (res.ok) {
      const json: any = await res.json();
      return (json.text ?? '').trim();
    }

    // Model still loading → wait the suggested time (capped) and retry.
    if (res.status === 503 && attempt < maxAttempts) {
      let waitMs = 4000;
      try { const j: any = await res.json(); if (j?.estimated_time) waitMs = Math.min(j.estimated_time * 1000, 15000); } catch { /* default */ }
      await sleep(waitMs);
      continue;
    }

    const text = await res.text().catch(() => '');
    throw new Error(`HF error ${res.status}: ${text.slice(0, 200)}`);
  }
  throw new Error('HF model did not warm up in time — try again in a moment.');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const body: ReqBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body?.audioBase64) { res.status(400).json({ error: 'no audio' }); return; }
    if (rateLimited(String(body.me?.id ?? 'anon'))) {
      res.status(200).json({ text: '', warning: 'Too many voice notes in a row — give it a few seconds.' });
      return;
    }

    const audio = decodeAudio(body.audioBase64);
    if (audio.length === 0) { res.status(400).json({ error: 'empty audio' }); return; }
    if (audio.length > MAX_AUDIO_BYTES) { res.status(400).json({ error: 'audio too long (keep voice notes under ~3 min)' }); return; }

    const mime = body.mimeType || 'audio/webm';
    let text: string;
    if (process.env.GROQ_API_KEY) text = await transcribeGroq(audio, mime);
    else if (process.env.HF_API_KEY) text = await transcribeHF(audio, mime);
    else { res.status(200).json({ text: '', error: 'No transcription backend configured (set GROQ_API_KEY or HF_API_KEY).' }); return; }

    res.status(200).json({ text });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'transcription failed' });
  }
}
