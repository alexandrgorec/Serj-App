import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import OrderEditor from './OrderEditor';
import Header from './Header';
import { userContext } from './App';
import { readOrderDrafts, receiveOrderLock } from './orderEditSession';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('./App', () => ({ userContext: require('react').createContext() }));
jest.mock('./selectListsSync', () => ({ syncOrderSelectLists: async () => {} }));
jest.mock('./OrderTable', () => {
  const Sum = require('./TDSumma').default;
  return function Table({ order, readOnly }) {
    return <table><tbody><tr><Sum object={order.suppliers[0]} field="summa" disabled={readOnly} /></tr></tbody></table>;
  };
});

let root, host, post, toast, initialOrder, initialLock, setOrderState, setLockState;
function Harness() {
  const [order, setOrder] = useState(initialOrder);
  const [lock, setLock] = useState(initialLock);
  const [timerTarget, setTimerTarget] = useState(null);
  setOrderState = setOrder; setLockState = setLock;
  return <userContext.Provider value={{ user: { id: 7, name: 'Test', rights: {}, selectListsData: {} },
    setUser: jest.fn(), setToast: toast, aAxios: { post, defaults: { baseURL: '' } },
    editingOrder: order, setEditingOrder: setOrder, orderEditLock: lock, setOrderEditLock: setLock,
    orderTimerTarget: timerTarget }}>
    <Header timerRef={setTimerTarget} />
    <OrderEditor mode="edit" />
  </userContext.Provider>;
}
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers(); localStorage.clear(); mockNavigate.mockClear();
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: jest.fn(() => true) });
  window.innerWidth = 1200;
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const now = Date.now();
  initialOrder = { id: 1, orderNumber: 1, orderStatus: 'Создана', suppliers: [{ summa: '10' }], buyers: [{}] };
  initialLock = receiveOrderLock({ locked: true, canEdit: true, isOwner: true, lockId: 'session-1',
    serverTime: new Date(now).toISOString(), expiresAt: new Date(now + 1000).toISOString(), releaseAt: new Date(now + 1000).toISOString() });
  toast = jest.fn();
  post = jest.fn(async () => ({ status: 202, data: { items: [] } }));
});
afterEach(() => { act(() => root.unmount()); host.remove(); jest.useRealTimers(); });
const render = async () => { await act(async () => root.render(<Harness />)); };
const advance = async ms => { await act(async () => jest.advanceTimersByTime(ms)); };
const button = text => [...host.querySelectorAll('button')].find(element => element.textContent === text);

test.each([1200, 400])('timer is rendered inside the header only while editing (%s px)', async width => {
  window.innerWidth = width;
  await render();
  const header = host.querySelector('header');
  const timer = header.querySelector('[role="timer"]');
  expect(timer.textContent).toBe('Автосохранение0:01');
  expect(host.querySelectorAll('[role="timer"]')).toHaveLength(1);
  expect(host.textContent).not.toContain('До автоматического сохранения:');
  await act(async () => setLockState({ isOwner: false, canEdit: false }));
  expect(header.querySelector('[role="timer"]')).toBeNull();
});

test('auto finish includes focused amount, sends generation, closes only on acknowledgement', async () => {
  await render();
  const input = host.querySelector('.summa-input'); input.focus();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '765');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await advance(999);
  expect(post.mock.calls.filter(([url]) => url === '/user/finishorderedit')).toHaveLength(0);
  expect(host.textContent).not.toContain('+ 10 сек.');
  await advance(1);
  const finish = post.mock.calls.find(([url]) => url === '/user/finishorderedit');
  expect(finish[1]).toMatchObject({ lockId: 'session-1', editingOrder: { suppliers: [{ summa: '765' }] } });
  expect(mockNavigate).toHaveBeenCalledWith('/allorders', { replace: true });
  expect(post.mock.calls.filter(([url]) => url === '/user/finishorderedit')).toHaveLength(1);
  expect(toast).toHaveBeenCalledWith('Время редактирования истекло. Заявка сохранена и закрыта.');
  expect(toast.mock.calls.some(([, variant]) => variant === 'danger')).toBe(false);
  expect(readOrderDrafts(localStorage, 7, 1)).toHaveLength(0);
  expect(post.mock.calls.filter(([url]) => url === '/user/releaseorderlock')).toHaveLength(0);
});

test.each([1200, 400])('successful auto finish does not repeat after clearing the lock (%s px)', async width => {
  window.innerWidth = width;
  let finished = false;
  post.mockImplementation(async (url, payload) => {
    if (url === '/user/finishorderedit') {
      if (finished || payload.lockId !== 'session-1') {
        throw { response: { status: 423, data: { message: 'Блокировка уже снята' } } };
      }
      finished = true;
    }
    return { status: 202, data: { items: [] } };
  });
  await render();
  await advance(1000);
  // Keep the editor mounted briefly, as can happen while navigating to the registry.
  await act(async () => window.dispatchEvent(new Event('focus')));
  await advance(20000);
  expect(post.mock.calls.filter(([url]) => url === '/user/finishorderedit')).toHaveLength(1);
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(toast).toHaveBeenCalledWith('Время редактирования истекло. Заявка сохранена и закрыта.');
  expect(toast.mock.calls.some(([, variant]) => variant === 'danger')).toBe(false);
  expect(readOrderDrafts(localStorage, 7, 1)).toHaveLength(0);
});

test.each([401, 400, 423, 500])('automatic save error %s keeps draft and exits', async status => {
  post.mockImplementation(async url => {
    if (url === '/user/finishorderedit') throw { response: { status, data: { message: 'Error' } } };
    return { status: 202, data: { items: [] } };
  });
  await render();
  await act(async () => setOrderState(order => ({ ...order, comments: 'unsaved' })));
  await advance(1000);
  expect(mockNavigate).toHaveBeenCalledWith('/allorders', { replace: true });
  expect(readOrderDrafts(localStorage, 7, 1)[0].order.comments).toBe('unsaved');
  expect(toast).toHaveBeenCalledWith(expect.stringContaining('Черновик сохранён'), 'danger');
});

test('manual save running at expiry is completed before the single final save', async () => {
  let resolveSave;
  post.mockImplementation(url => url === '/user/editorder'
    ? new Promise(resolve => { resolveSave = resolve; }) : Promise.resolve({ status: 202, data: { items: [] } }));
  await render(); await act(async () => button('Записать').click());
  await advance(1000);
  expect(post.mock.calls.filter(([url]) => url === '/user/finishorderedit')).toHaveLength(0);
  await act(async () => resolveSave({ status: 202 }));
  expect(post.mock.calls.filter(([url]) => url === '/user/finishorderedit')).toHaveLength(1);
  expect(mockNavigate).toHaveBeenCalledWith('/allorders', { replace: true });
});

test('hanging automatic request exits after fifteen seconds and keeps changes', async () => {
  post.mockImplementation(url => url === '/user/finishorderedit' ? new Promise(() => {}) : Promise.resolve({ status: 202, data: { items: [] } }));
  await render(); await advance(1000);
  expect(mockNavigate).not.toHaveBeenCalled();
  await advance(15000);
  expect(mockNavigate).toHaveBeenCalledWith('/allorders', { replace: true });
  expect(readOrderDrafts(localStorage, 7, 1)).toHaveLength(1);
});

test('manual save and close is atomic, read-only close never saves', async () => {
  await render(); await act(async () => button('Записать и закрыть').click());
  expect(post.mock.calls.filter(([url]) => url === '/user/finishorderedit')).toHaveLength(1);
  expect(mockNavigate).toHaveBeenCalledWith(-1);
  await act(async () => setLockState({ isOwner: false, canEdit: false }));
  expect(host.textContent).not.toContain('Заявка открыта только для просмотра.');
  expect(button('Записать').disabled).toBe(true);
  post.mockClear(); await act(async () => button('Закрыть').click());
  expect(post).not.toHaveBeenCalled();
});
