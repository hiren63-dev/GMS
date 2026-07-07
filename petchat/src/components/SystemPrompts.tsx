import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────
// Two lightweight, self-contained system prompts rendered at the app root:
//   • InstallPrompt  — offers "Install Zypit" when the browser fires
//     beforeinstallprompt (Android/desktop Chrome/Edge). iOS gets a one-time
//     hint since Safari has no install event.
//   • UpdateBanner   — polls the deployed index.html for a new JS bundle hash
//     and, when a fresh version is live, shows "Refresh to check it". This is
//     hash-based (not SW-timing based) so it works even though the SW
//     skipWaiting()s immediately.
// ─────────────────────────────────────────────────────────────────────────

// ── Install prompt ─────────────────────────────────────────────────────────
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Already installed (standalone) → never prompt.
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (standalone) return;
    if (localStorage.getItem('installPromptDismissed') === '1') return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS Safari has no beforeinstallprompt — show a manual hint once.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari) { setIosHint(true); setShow(true); }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => { setShow(false); localStorage.setItem('installPromptDismissed', '1'); };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setShow(false);
    setDeferred(null);
    localStorage.setItem('installPromptDismissed', '1');
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 1200,
      width: 'min(420px, calc(100vw - 32px))', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-elevated)', display: 'flex', gap: 12, alignItems: 'flex-start',
      animation: 'toastIn 200ms ease',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>Z</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Install Zypit</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.45 }}>
          {iosHint
            ? <>Tap the Share icon, then <strong>“Add to Home Screen”</strong> to install Zypit like an app.</>
            : <>Add Zypit to your device for a full-screen, app-like experience — works offline-first.</>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {!iosHint && (
            <button onClick={install} style={{ height: 34, padding: '0 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Install</button>
          )}
          <button onClick={dismiss} style={{ height: 34, padding: '0 14px', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            {iosHint ? 'Got it' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Update banner ──────────────────────────────────────────────────────────
const currentBundle = (): string | null => {
  const el = document.querySelector('script[src*="/assets/index-"]') as HTMLScriptElement | null;
  const m = el?.src.match(/index-[^.]+\.js/);
  return m ? m[0] : null;
};

export function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const loaded = currentBundle();
    if (!loaded) return; // dev server / no hashed bundle — nothing to compare

    let stopped = false;
    const check = async () => {
      try {
        const html = await fetch('/index.html', { cache: 'no-store' }).then(r => r.text());
        const m = html.match(/index-[^.]+\.js/);
        if (!stopped && m && m[0] !== loaded) setUpdateReady(true);
      } catch { /* offline — try again next tick */ }
    };
    const id = window.setInterval(check, 60_000); // check once a minute
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    check(); // and once on mount
    return () => { stopped = true; window.clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, []);

  const refresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch { /* best effort */ }
    window.location.reload();
  };

  if (!updateReady) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1300,
      background: 'var(--accent)', color: '#fff', padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      fontSize: 13, fontWeight: 500, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      animation: 'fadeIn 200ms ease',
    }}>
      <span>A new version of Zypit is available.</span>
      <button onClick={refresh} style={{ height: 30, padding: '0 16px', background: '#fff', color: 'var(--accent)', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
        Refresh to check it
      </button>
    </div>
  );
}
