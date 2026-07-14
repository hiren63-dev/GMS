// ─────────────────────────────────────────────────────────────────────────
// /api/send-push — Web Push relay (Vercel serverless).
//
// Delivers a real OS/browser notification to specific push subscriptions,
// reaching the recipient even with no tab or the desktop app open anywhere.
// The client resolves which employees to notify and reads their stored
// subscriptions straight from Firestore (already fully readable client-side
// in this app); this endpoint only holds the VAPID private key and relays
// the send — it never touches Firestore itself.
//
// ── To activate ────────────────────────────────────────────────────────────
//  1. In Vercel → Project → Settings → Environment Variables, add:
//        VAPID_PRIVATE_KEY = <value provided alongside this change>
//  2. Redeploy.
// ─────────────────────────────────────────────────────────────────────────

const webpush = require('web-push');

// Public key — matches petchat/src/services/push.ts (safe to duplicate; it's public).
const VAPID_PUBLIC_KEY = 'BAwb0QhOSOAwza2Vhr0R-lnvVGFYz7lLnU21YTLrEYAnusU-VOlHBxlq_WVqZMMIpOH65xHm_u69aCzBAxjdjQg';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    res.status(200).json({ sent: 0, error: 'VAPID_PRIVATE_KEY not configured — see api/send-push.ts header' });
    return;
  }

  const { subscriptions, payload } = req.body || {};
  if (!Array.isArray(subscriptions) || !payload?.title) {
    res.status(400).json({ error: 'subscriptions[] and payload.title are required' });
    return;
  }

  webpush.setVapidDetails('mailto:chhaniyarahiren63@gmail.com', VAPID_PUBLIC_KEY, privateKey);

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((sub: any) => webpush.sendNotification(sub, body))
  );
  const sent = results.filter(r => r.status === 'fulfilled').length;
  res.status(200).json({ sent, total: subscriptions.length });
}
