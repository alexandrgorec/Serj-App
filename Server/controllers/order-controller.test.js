jest.mock('../db', () => ({ pool: { query: jest.fn(), connect: jest.fn() } }));
jest.mock('../utils/audit-log', () => ({ writeAuditLog: jest.fn(async () => {}), listAuditLogsForEntity: jest.fn() }));
const { pool } = require('../db');
const controller = require('./order-controller');
const locks = require('../services/order-locks');
const { writeAuditLog } = require('../utils/audit-log');
const NOW = new Date('2026-10-23T12:00:00Z');
let row, lock, db, minutes;
const response = () => {
    const res = {};
    ['status', 'json', 'sendStatus', 'send'].forEach(key => { res[key] = jest.fn(() => res); });
    return res;
};
const request = (extra = {}) => ({ body: { id: 10, userId: 7, user: 'Антон', rights: {}, lockId: 'lease-1',
    editingOrder: { id: 10, orderNumber: 20, orderStatus: 'Заполнена', suppliers: [{}], buyers: [{}] }, ...extra } });

beforeEach(() => {
    jest.clearAllMocks();
    row = { id: 10, order_number: 20, orderjson: { orderStatus: 'Создана', suppliers: [{}], buyers: [{}] } };
    lock = { order_id: 10, user_id: '7', user_name: 'Антон', lock_id: 'lease-1',
        locked_at: NOW, expires_at: new Date(+NOW + 1200000), release_at: new Date(+NOW + 1200000) };
    minutes = null;
    db = { release: jest.fn(), query: jest.fn(async (sql, params) => {
        if (sql.includes('FROM orders WHERE')) return { rows: row ? [row] : [] };
        if (sql.includes('SELECT * FROM order_edit_locks')) return { rows: lock ? [lock] : [] };
        if (sql.includes('clock_timestamp()')) return { rows: [{ server_time: NOW }] };
        if (sql.includes('SELECT edit_minutes')) return { rows: minutes ? [{ edit_minutes: minutes }] : [] };
        if (sql.includes('INSERT INTO order_edit_locks')) {
            lock = { order_id: params[0], user_id: params[1], user_name: params[2], lock_id: params[3],
                locked_at: params[4], expires_at: params[5], release_at: params[6] };
            return { rows: [lock] };
        }
        if (sql.startsWith('UPDATE orders')) { row.orderjson = params[0]; row.order_number = params[1]; }
        if (sql.startsWith('DELETE FROM order_edit_locks')) lock = null;
        return { rows: [] };
    }) };
    pool.connect.mockResolvedValue(db);
    pool.query.mockResolvedValue({ rows: [] });
});

test('free order gets exactly a 20-minute lease and fresh data', async () => {
    lock = null;
    const res = response();
    await controller.openorderforedit(request(), res);
    expect(res.status).toHaveBeenCalledWith(202);
    const result = res.json.mock.calls[0][0];
    expect(result.order.orderNumber).toBe(20);
    expect(result.lock).toMatchObject({ isOwner: true, canEdit: true, serverTime: NOW.toISOString() });
    expect(+new Date(result.lock.expiresAt) - +NOW).toBe(1200000);
    expect(+new Date(result.lock.releaseAt) - +NOW).toBe(1200000);
    expect(db.query.mock.calls.findIndex(([sql]) => sql.includes('FOR UPDATE'))).toBeLessThan(db.query.mock.calls.findIndex(([sql]) => sql.includes('INSERT INTO')));
    expect(db.query).toHaveBeenLastCalledWith('COMMIT');
    expect(db.release).toHaveBeenCalled();
});

test('custom duration applies only to new acquisitions, including root', async () => {
    minutes = 9000;
    let result = await locks.openOrder(10, 7, 'Антон', {});
    expect(result.lock.lockId).toBe('lease-1');
    expect(+new Date(result.lock.expiresAt) - +NOW).toBe(1200000);
    lock.release_at = new Date(+NOW - 1);
    result = await locks.openOrder(10, 'root', 'root', { adminAccess: true });
    expect(result.lock.lockId).not.toBe('lease-1');
    expect(+new Date(result.lock.expiresAt) - +NOW).toBe(9000 * 60000);
});

test('another user cannot take a lease before its deadline', async () => {
    lock.expires_at = new Date(+NOW + 1); lock.release_at = lock.expires_at;
    const result = await locks.openOrder(10, 8, 'Другой', {});
    expect(result.lock).toMatchObject({ canEdit: false, isOwner: false, lockId: 'lease-1' });
});

test('another user can take a lease exactly at its deadline without waiting', async () => {
    lock.expires_at = NOW; lock.release_at = NOW;
    const result = await locks.openOrder(10, 8, 'Другой', {});
    expect(result.lock).toMatchObject({ canEdit: true, isOwner: true, userId: '8' });
    expect(result.lock.lockId).not.toBe('lease-1');
    expect(result.lock.releaseAt).toEqual(result.lock.expiresAt);
});

test('protected order opens read-only without taking a lease', async () => {
    row.orderjson.orderStatus = 'Реализована'; lock = null;
    const result = await locks.openOrder(10, 7, 'Антон', {});
    expect(result.lock.canEdit).toBe(false); expect(lock).toBeNull();
});

test('owner saves without renewing the lease and writes history', async () => {
    const res = response(); await controller.editorder(request(), res);
    expect(res.sendStatus).toHaveBeenCalledWith(202);
    expect(lock.lock_id).toBe('lease-1'); expect(row.orderjson.orderStatus).toBe('Заполнена');
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE_ORDER' }));
});

test.each([undefined, 'wrong-generation'])('missing or stale lease %s cannot write', async lockId => {
    const res = response(); await controller.editorder(request({ lockId }), res);
    expect(res.status).toHaveBeenCalledWith(423); expect(row.orderjson.orderStatus).toBe('Создана');
    expect(db.query).toHaveBeenLastCalledWith('ROLLBACK');
});

test('nonowner cannot write or release', async () => {
    const res = response(); await controller.editorder(request({ userId: 8 }), res);
    expect(res.status).toHaveBeenCalledWith(423);
    expect(await locks.releaseOrder(10, 8, 'lease-1')).toBe(false); expect(lock).not.toBeNull();
});

test('expired lease rejects ordinary save but accepts atomic finish if not replaced', async () => {
    lock.expires_at = NOW; lock.release_at = NOW;
    const res = response(); await controller.editorder(request(), res);
    expect(res.status).toHaveBeenCalledWith(423);
    const finish = response(); await controller.finishorderedit(request(), finish);
    expect(finish.sendStatus).toHaveBeenCalledWith(202); expect(lock).toBeNull();
    const queries = db.query.mock.calls.map(([sql]) => sql);
    expect(queries.lastIndexOf('COMMIT')).toBeGreaterThan(queries.findIndex(sql => sql.startsWith('DELETE')));
});

test('expired generation cannot finish or release a replacement of the same user', async () => {
    lock.lock_id = 'new-generation';
    const res = response(); await controller.finishorderedit(request(), res);
    expect(res.status).toHaveBeenCalledWith(423);
    expect(await locks.releaseOrder(10, 7, 'lease-1')).toBe(false); expect(lock.lock_id).toBe('new-generation');
});

test.each(['Заприходована', 'Реализована'])('status protection remains for %s', async status => {
    row.orderjson.orderStatus = status;
    const res = response(); await controller.finishorderedit(request(), res);
    expect(res.status).toHaveBeenCalledWith(403); expect(lock).not.toBeNull();
});

test('invalid data and missing orders do not release or report success', async () => {
    let res = response(); await controller.finishorderedit(request({ editingOrder: { id: 10, suppliers: [], buyers: [] } }), res);
    expect(res.status).toHaveBeenCalledWith(400); expect(lock).not.toBeNull();
    row = null; res = response(); await controller.openorderforedit(request(), res);
    expect(res.status).toHaveBeenCalledWith(404);
});

test('force unlock requires admin and targets displayed generation', async () => {
    let res = response(); await controller.forceorderunlock(request(), res);
    expect(res.status).toHaveBeenCalledWith(403);
    res = response(); await controller.forceorderunlock(request({ rights: { adminAccess: true }, lockId: 'old' }), res);
    expect(res.json).toHaveBeenCalledWith({ released: false });
    res = response(); await controller.forceorderunlock(request({ rights: { adminAccess: true } }), res);
    expect(res.json).toHaveBeenCalledWith({ released: true });
});

test.each([0, -1, 1.5, '', 'abc', 'Infinity', '999999999999999999999999'])('reject invalid timeout %s', value => {
    expect(() => locks.parseEditMinutes(value)).toThrow();
});
test.each([1, 20, 240, 1440, 1000000])('accept positive timeout %s without business cap', value => {
    expect(locks.parseEditMinutes(String(value))).toBe(value);
});
