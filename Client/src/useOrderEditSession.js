import { useEffect, useRef, useState } from 'react';
import { comparableOrder, draftPrefix, leasePhase, readOrderDrafts } from './orderEditSession';

export default function useOrderEditSession({ userId, order, lock, enabled, onExpire, setToast }) {
  const current = useRef();
  current.current = { order, lock, enabled, onExpire, setToast };
  const session = useRef(null);
  const storageWarned = useRef(false);
  const tabId = useRef(null);
  if (!tabId.current) tabId.current = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const [phase, setPhase] = useState({ phase: 'none', seconds: 0 });
  const [recovery, setRecovery] = useState([]);
  const warnStorage = () => {
    if (storageWarned.current) return;
    storageWarned.current = true;
    current.current.setToast('Не удалось сохранить локальный черновик. Хранилище браузера недоступно.', 'danger');
  };

  const captureDraft = (force = false) => {
    const state = session.current;
    if (!state || state.finished) return false;
    const snapshot = current.current.order;
    if (String(snapshot?.id) !== String(state.orderId)) return false;
    const serialized = comparableOrder(snapshot);
    if (serialized === comparableOrder(state.base) && !state.dirty && force !== true) return true;
    try {
      window.localStorage.setItem(state.key, JSON.stringify({
        order: snapshot, base: state.base, savedAt: Date.now(), lockId: state.lockId,
      }));
      state.dirty = true;
      return true;
    } catch (_) { warnStorage(); return false; }
  };

  const acknowledgeSaved = (saved, finished = false) => {
    const state = session.current;
    if (!state) return;
    state.base = JSON.parse(JSON.stringify(saved));
    state.dirty = false;
    state.finished = finished;
    try {
      window.localStorage.removeItem(state.key);
      if (state.restoredKey) window.localStorage.removeItem(state.restoredKey);
      state.restoredKey = null;
    } catch (_) { warnStorage(); }
  };

  const discardDraft = draft => {
    try {
      window.localStorage.removeItem(draft.key);
      setRecovery(items => items.filter(item => item.key !== draft.key));
    } catch (_) { warnStorage(); }
  };
  const markRestored = draft => {
    if (session.current) session.current.restoredKey = draft.key;
    setRecovery([]);
  };

  useEffect(() => {
    if (!userId || !order?.id || !lock?.isOwner || !lock?.lockId || !enabled) return undefined;
    const orderId = order.id;
    const state = {
      key: `${draftPrefix(userId, orderId)}${lock.lockId}:${tabId.current}`,
      orderId, lockId: lock.lockId, base: JSON.parse(JSON.stringify(current.current.order)),
      dirty: false, finished: false, expired: false,
    };
    session.current = state;
    try {
      const drafts = readOrderDrafts(window.localStorage, userId, orderId);
      setRecovery(drafts.filter(draft => {
        if (comparableOrder(draft.order) === comparableOrder(state.base)) {
          window.localStorage.removeItem(draft.key);
          return false;
        }
        return true;
      }));
    } catch (_) { warnStorage(); }
    const tick = () => {
      if (state.finished) return;
      captureDraft();
      const next = leasePhase(current.current.lock);
      setPhase(next);
      if (next.phase === 'expired' && !state.expired) {
        state.expired = true;
        current.current.onExpire();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    window.addEventListener('online', tick);
    window.addEventListener('pageshow', tick);
    window.addEventListener('pagehide', captureDraft);
    window.addEventListener('serj:beforelogout', captureDraft);
    document.addEventListener('visibilitychange', tick);
    return () => {
      captureDraft();
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      window.removeEventListener('online', tick);
      window.removeEventListener('pageshow', tick);
      window.removeEventListener('pagehide', captureDraft);
      window.removeEventListener('serj:beforelogout', captureDraft);
      document.removeEventListener('visibilitychange', tick);
    };
    // Session lifetime is determined by the lease identity, not rerenders or saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, order?.id, lock?.lockId, lock?.isOwner, enabled]);

  return { phase, recovery, captureDraft, acknowledgeSaved, discardDraft, markRestored };
}
