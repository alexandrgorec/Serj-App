export function receiveOrderLock(lock) {
  if (!lock) return null;
  return { ...lock, receivedAt: Date.now(), receivedMonotonic: performance.now() };
}

export function leaseServerNow(lock) {
  const serverTime = Date.parse(lock?.serverTime);
  if (!Number.isFinite(serverTime) || !Number.isFinite(lock?.receivedAt)) return Date.now();
  return serverTime + Math.max(0, Date.now() - lock.receivedAt,
    performance.now() - (lock.receivedMonotonic ?? performance.now()));
}

export function leasePhase(lock, now = leaseServerNow(lock)) {
  if (!lock?.isOwner || !lock?.lockId) return { phase: 'none', seconds: 0 };
  const expiresAt = Date.parse(lock.expiresAt);
  if (!Number.isFinite(expiresAt)) return { phase: 'none', seconds: 0 };
  if (now >= expiresAt) return { phase: 'expired', seconds: 0 };
  return { phase: 'active', seconds: Math.ceil((expiresAt - now) / 1000) };
}

export function draftPrefix(userId, orderId) {
  return `serjApp:orderDraft:${encodeURIComponent(userId)}:${encodeURIComponent(orderId)}:`;
}

export function comparableOrder(order) {
  const canonical = value => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().filter(key =>
        !['id', 'order_number', 'haveEmptyBuyerH'].includes(key) && value[key] !== undefined && value[key] !== ''
      ).map(key => [key, canonical(value[key])]));
    }
    return value;
  };
  return JSON.stringify(canonical(order));
}

export function readOrderDrafts(storage, userId, orderId) {
  const prefix = draftPrefix(userId, orderId);
  const results = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const data = JSON.parse(storage.getItem(key));
      if (data?.order && Array.isArray(data.order.suppliers) && Array.isArray(data.order.buyers)) results.push({ ...data, key });
    } catch (_) { /* A corrupt draft must not prevent opening other drafts. */ }
  }
  return results.sort((a, b) => b.savedAt - a.savedAt);
}

// Includes refresh/retry time, not just the individual HTTP request timeout.
export async function withSaveDeadline(action, milliseconds = 15000) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => action(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Сервер не подтвердил сохранение за 15 секунд'));
        }, milliseconds);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
