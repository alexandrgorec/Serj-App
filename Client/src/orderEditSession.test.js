import { comparableOrder, draftPrefix, leasePhase, readOrderDrafts, receiveOrderLock, leaseServerNow, withSaveDeadline } from './orderEditSession';

const start = Date.parse('2026-10-23T12:00:00Z');
const lock = { lockId: 'lease', isOwner: true, serverTime: new Date(start).toISOString(),
  expiresAt: new Date(start + 1200000).toISOString(), releaseAt: new Date(start + 1200000).toISOString() };

test('auto finish starts at the configured deadline without extra seconds', () => {
  expect(leasePhase(lock, start)).toEqual({ phase: 'active', seconds: 1200 });
  expect(leasePhase(lock, start + 1199999)).toEqual({ phase: 'active', seconds: 1 });
  expect(leasePhase(lock, start + 1200000)).toEqual({ phase: 'expired', seconds: 0 });
  expect(leasePhase({ ...lock, releaseAt: new Date(start + 1210000).toISOString() }, start + 1200000).phase).toBe('expired');
  expect(leasePhase(lock, start + 86400000).phase).toBe('expired');
  expect(leasePhase({ ...lock, isOwner: false }, start).phase).toBe('none');
});

test('server timestamp compensates for different client clock', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(start + 3600000));
  const received = receiveOrderLock(lock);
  expect(leaseServerNow(received)).toBe(start);
  jest.advanceTimersByTime(1200000);
  expect(leasePhase(received).phase).toBe('expired');
  jest.useRealTimers();
});

test('drafts are isolated by account and order and sorted newest first', () => {
  localStorage.clear();
  const order = { suppliers: [{}], buyers: [{}] };
  for (const [user, id, session, savedAt] of [['7', 1, 'a', 1], ['7', 1, 'b', 2], ['8', 1, 'c', 3], ['7', 2, 'd', 4]]) {
    localStorage.setItem(draftPrefix(user, id) + session, JSON.stringify({ order, savedAt }));
  }
  expect(readOrderDrafts(localStorage, '7', 1).map(d => d.savedAt)).toEqual([2, 1]);
});

test('comparison detects real data changes but ignores server-only identity fields', () => {
  expect(comparableOrder({ id: 1, order_number: 2, carrier: '', price: '100' })).toBe(comparableOrder({ price: '100' }));
  expect(comparableOrder({ price: '100' })).not.toBe(comparableOrder({ price: '200' }));
});

test('deadline aborts hanging request, including refresh waits', async () => {
  jest.useFakeTimers();
  let signal;
  const task = withSaveDeadline(value => { signal = value; return new Promise(() => {}); });
  const assertion = expect(task).rejects.toThrow('15 секунд');
  await Promise.resolve();
  jest.advanceTimersByTime(15000);
  await assertion;
  expect(signal.aborted).toBe(true);
  jest.useRealTimers();
});
