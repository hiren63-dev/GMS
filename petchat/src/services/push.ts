// ─────────────────────────────────────────────────────────────────────────────
// Web Push — real OS notifications that reach an employee even with zero tabs
// or the desktop app open anywhere (unlike services/notifications.ts, which
// only fires while a tab is open somewhere, even if backgrounded).
//
// Client subscribes via the Push API and stores the subscription in Firestore
// (`pushSubscriptions`, already covered by the app's existing signed-in-only
// rules). Sending relays through /api/send-push, which holds the VAPID
// private key server-side; this file resolves the target subscriptions
// itself since Firestore is already fully readable client-side in this app.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

// Public key — safe to ship in the client bundle (that's how VAPID works).
const VAPID_PUBLIC_KEY = 'BAwb0QhOSOAwza2Vhr0R-lnvVGFYz7lLnU21YTLrEYAnusU-VOlHBxlq_WVqZMMIpOH65xHm_u69aCzBAxjdjQg';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

/**
 * Subscribe this browser to Web Push and store it so anyone can notify this
 * employee later, even with no tab/app open. Safe to call repeatedly — it
 * reuses the existing subscription rather than creating duplicates.
 */
export async function subscribeToPush(employeeId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
    if (!json.endpoint || !json.keys) return;
    // Stable id per device+browser so re-subscribing updates rather than duplicates.
    const id = btoa(json.endpoint).replace(/[^a-zA-Z0-9]/g, '').slice(0, 180);
    await setDoc(doc(db, 'pushSubscriptions', id), {
      employeeId, endpoint: json.endpoint, keys: json.keys, updatedAt: Date.now(),
    });
  } catch {
    // Best-effort progressive enhancement — never block login on this.
  }
}

/**
 * Push a real notification to these employees even if they have no tab or
 * the desktop app open anywhere. Best-effort: failures never throw.
 */
export async function sendPush(
  employeeIds: string[],
  payload: { title: string; body?: string; tag?: string; url?: string }
): Promise<void> {
  const ids = [...new Set(employeeIds)].filter(Boolean);
  if (ids.length === 0) return;
  try {
    const subs: any[] = [];
    // Firestore 'in' queries cap at 30 values — chunk for large audiences.
    for (let i = 0; i < ids.length; i += 30) {
      const chunk = ids.slice(i, i + 30);
      const snap = await getDocs(query(collection(db, 'pushSubscriptions'), where('employeeId', 'in', chunk)));
      snap.forEach(d => subs.push(d.data()));
    }
    if (subs.length === 0) return;
    await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptions: subs.map(s => ({ endpoint: s.endpoint, keys: s.keys })),
        payload,
      }),
    });
  } catch {
    // Best-effort — push is on top of the existing open-tab notifications.
  }
}
