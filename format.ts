export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function truncateHash(hash: string, lead = 10, trail = 8): string {
  if (hash.length <= lead + trail + 3) return hash;
  return `${hash.slice(0, lead)}...${hash.slice(-trail)}`;
}

// Deterministic-looking pseudo SHA-256 for demo purposes only. Not
// cryptographically meaningful — the real backend performs actual hashing.
export function generateMockHash(seed: string): string {
  let h1 = 0xdeadbeef ^ seed.length;
  let h2 = 0x41c6ce57 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const raw = hex(h1) + hex(h2) + hex(h1 ^ h2) + hex(h1 + h2) + hex(h2 - h1) + hex(h1 * 2 + 1) + hex(h2 * 3 + 7) + hex(h1 ^ 0x9e3779b9);
  return raw.slice(0, 64);
}

export function generateMockTxId(): string {
  const chars = '0123456789abcdef';
  let out = '0x';
  for (let i = 0; i < 64; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function generateId(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(4, '0')}`;
}
