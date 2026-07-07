// Deterministic, muted per-person avatar color — replaces the flat
// ink-black/purple circle everywhere so teammates are visually distinct at a
// glance (Slack/WhatsApp-style), without touching any brand accent slot.
// Same input always produces the same color across the whole app.
const PALETTE = [
  { bg: 'rgba(0,117,222,0.12)',   fg: '#0059b3' },   // blue
  { bg: 'rgba(26,174,57,0.14)',   fg: '#1f7a34' },   // green
  { bg: 'rgba(221,91,0,0.14)',    fg: '#a84600' },   // orange
  { bg: 'rgba(214,182,246,0.35)', fg: '#5b2d82' },   // purple
  { bg: 'rgba(255,100,200,0.16)', fg: '#a1266e' },   // pink
  { bg: 'rgba(42,157,153,0.16)',  fg: '#1d6b68' },   // teal
  { bg: 'rgba(98,174,240,0.20)',  fg: '#2f6aa8' },   // sky
  { bg: 'rgba(82,52,16,0.12)',    fg: '#6b4413' },   // brown
];

export function avatarColor(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
