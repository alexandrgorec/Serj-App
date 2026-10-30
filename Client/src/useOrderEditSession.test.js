import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useOrderEditSession from './useOrderEditSession';
import { draftPrefix, readOrderDrafts, receiveOrderLock } from './orderEditSession';

let root, container, session, props;
function Harness() { session = useOrderEditSession(props); return null; }
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers(); localStorage.clear();
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  const now = Date.now();
  props = { userId: '7', order: { id: 1, suppliers: [{ summa: '10' }], buyers: [{}] },
    lock: receiveOrderLock({ lockId: 'lease', isOwner: true, serverTime: new Date(now).toISOString(),
      expiresAt: new Date(now + 1200000).toISOString(), releaseAt: new Date(now + 1200000).toISOString() }),
    enabled: true, onExpire: jest.fn(), setToast: jest.fn() };
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.useRealTimers(); });
const render = () => act(() => root.render(<Harness />));

test('mutated row fields are captured without React rerender; save does not renew time', () => {
  render(); props.order.suppliers[0].summa = '900';
  act(() => jest.advanceTimersByTime(1000));
  expect(readOrderDrafts(localStorage, '7', 1)[0].order.suppliers[0].summa).toBe('900');
  act(() => session.acknowledgeSaved(props.order));
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(0);
  act(() => jest.advanceTimersByTime(1199000));
  expect(session.phase).toEqual({ phase: 'expired', seconds: 0 });
  expect(props.onExpire).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(5000));
  expect(props.onExpire).toHaveBeenCalledTimes(1);
});

test('sleeping tab expires immediately on focus; read-only never expires', () => {
  render(); jest.setSystemTime(Date.now() + 1300000);
  act(() => window.dispatchEvent(new Event('focus')));
  expect(props.onExpire).toHaveBeenCalledTimes(1);
  props = { ...props, lock: { ...props.lock, lockId: 'other', isOwner: false }, enabled: false, onExpire: jest.fn() };
  render(); act(() => jest.advanceTimersByTime(1300000));
  expect(props.onExpire).not.toHaveBeenCalled();
});

test('recovery is explicit; unrelated account cannot see draft', () => {
  const draft = { order: { ...props.order, comments: 'unsaved' }, base: props.order, savedAt: Date.now() };
  localStorage.setItem(draftPrefix('7', 1) + 'old', JSON.stringify(draft));
  render(); expect(session.recovery).toHaveLength(1); expect(props.order.comments).toBeUndefined();
  props = { ...props, userId: '8' }; render(); expect(session.recovery).toHaveLength(0);
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(1);
});

test('storage failure is reported and cannot be mistaken for a saved draft', () => {
  render();
  const mock = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  props.order.comments = 'changed';
  expect(session.captureDraft(true)).toBe(false);
  expect(props.setToast).toHaveBeenCalledWith(expect.stringContaining('Хранилище'), 'danger');
  mock.mockRestore();
});

test('confirmed finish removes current draft and cleanup cannot recreate it', () => {
  render(); props.order.comments = 'changed'; session.captureDraft(true);
  act(() => session.acknowledgeSaved(props.order, true));
  act(() => jest.advanceTimersByTime(2000000));
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(0);
  expect(props.onExpire).not.toHaveBeenCalled();
});

test.each([false, true])('confirmed save clears accumulated drafts, not just the restored one (finish=%s)', finished => {
  const old = { order: { ...props.order, comments: 'old changes' }, base: props.order, savedAt: 1 };
  const latest = { ...old, order: { ...props.order, comments: 'latest changes' }, savedAt: 2 };
  localStorage.setItem(draftPrefix('7', 1) + 'old', JSON.stringify(old));
  localStorage.setItem(draftPrefix('7', 1) + 'latest', JSON.stringify(latest));
  localStorage.setItem(draftPrefix('8', 1) + 'other-user', JSON.stringify(old));
  localStorage.setItem(draftPrefix('7', 2) + 'other-order', JSON.stringify(old));
  render();
  expect(session.recovery).toHaveLength(2);
  act(() => session.markRestored(session.recovery[0]));
  props = { ...props, order: JSON.parse(JSON.stringify(latest.order)) };
  render(); session.captureDraft();
  act(() => session.acknowledgeSaved(props.order, finished));
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(0);
  act(() => jest.advanceTimersByTime(1000));
  props = { ...props, lock: { ...props.lock, lockId: 'reopened' } };
  render();
  expect(session.recovery).toHaveLength(0);
  expect(readOrderDrafts(localStorage, '8', 1)).toHaveLength(1);
  expect(readOrderDrafts(localStorage, '7', 2)).toHaveLength(1);
});

test('returning fields to their saved values removes a redundant draft', () => {
  render();
  props.order.suppliers[0].summa = '900'; session.captureDraft();
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(1);
  props.order.suppliers[0].summa = '10'; session.captureDraft();
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(0);
});

test('draft cleanup waits for acknowledgement and preserves newer writes from another tab', () => {
  const key = draftPrefix('7', 1) + 'other-tab';
  const old = { order: { ...props.order, comments: 'old' }, base: props.order, savedAt: 1 };
  localStorage.setItem(key, JSON.stringify(old));
  render();
  props.order.comments = 'saving'; session.captureDraft();
  const attempt = session.beginSave();
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(2);
  const newer = { ...old, order: { ...old.order, comments: 'newer unsaved changes' }, savedAt: 2 };
  localStorage.setItem(key, JSON.stringify(newer));
  act(() => session.acknowledgeSaved(props.order, true, attempt));
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(1);
  expect(localStorage.getItem(key)).toBe(JSON.stringify(newer));
});

test('late acknowledgement of a previous session cannot clean a newly opened draft', () => {
  render(); props.order.comments = 'first session'; session.captureDraft();
  const attempt = session.beginSave();
  const saved = JSON.parse(JSON.stringify(props.order));
  props = { ...props, lock: { ...props.lock, lockId: 'new-session' } };
  render(); props.order.comments = 'new session'; session.captureDraft();
  act(() => session.acknowledgeSaved(saved, true, attempt));
  expect(readOrderDrafts(localStorage, '7', 1).some(d => d.order.comments === 'new session')).toBe(true);
});
