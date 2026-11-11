const keyFor = (userId) => `vi-minh:v1:user:${userId}:snapshot`;
const preferencesKeyFor = (userId) => `vi-minh:v1:user:${userId}:preferences`;

export function readSnapshot(userId) {
  try {
    const value = localStorage.getItem(keyFor(userId));
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (parsed.version !== 1 || parsed.userId !== userId || !parsed.snapshot || typeof parsed.snapshot !== 'object') throw new Error('Cache sai phiên bản.');
    return parsed.snapshot;
  } catch {
    try { localStorage.removeItem(keyFor(userId)); } catch {}
    return null;
  }
}

export function writeSnapshot(userId, snapshot) {
  try {
    const safeSnapshot = {
      accounts: snapshot.accounts || [], categories: snapshot.categories || [], transactions: snapshot.transactions || [],
      transfers: snapshot.transfers || [], budgets: snapshot.budgets || [], recurringRules: snapshot.recurringRules || [],
      goals: snapshot.goals || [], syncedAt: snapshot.syncedAt || new Date().toISOString()
    };
    localStorage.setItem(keyFor(userId), JSON.stringify({ version: 1, userId, snapshot: safeSnapshot }));
    return true;
  } catch { return false; }
}

export function removeSnapshot(userId) {
  try { localStorage.removeItem(keyFor(userId)); } catch {}
}

export function readPreferences(userId) {
  try { return JSON.parse(localStorage.getItem(preferencesKeyFor(userId)) || '{}'); } catch { return {}; }
}

export function writePreferences(userId, preferences) {
  try { localStorage.setItem(preferencesKeyFor(userId), JSON.stringify(preferences)); return true; } catch { return false; }
}
