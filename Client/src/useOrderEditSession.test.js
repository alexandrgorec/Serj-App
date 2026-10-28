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
  session.acknowledgeSaved(props.order, true);
  act(() => jest.advanceTimersByTime(2000000));
  expect(readOrderDrafts(localStorage, '7', 1)).toHaveLength(0);
  expect(props.onExpire).not.toHaveBeenCalled();
});
