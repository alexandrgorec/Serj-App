// Opt-in: uses only a uniquely named disposable schema in the local development database.
const suite = process.env.RUN_LOCK_DB_TESTS === '1' ? describe : describe.skip;

suite('PostgreSQL lease transactions and migrations', () => {
    let adminPool, pool, locks, controller, migrate;
    const schema = `lease_test_${process.pid}_${Date.now()}`;
    const res = () => {
        const result = { code: 200, body: null };
        result.status = code => { result.code = code; return result; };
        result.json = body => { result.body = body; return result; };
        result.sendStatus = code => { result.code = code; return result; };
        return result;
    };
    const req = (lockId, comments = 'saved') => ({ body: { userId: '7', user: 'Test', rights: {}, lockId,
        editingOrder: { id: 1, orderNumber: 1, orderStatus: 'Создана', suppliers: [{}], buyers: [{}], comments } } });
    beforeAll(async () => {
        const { Pool } = require('pg');
        adminPool = require('../db').pool;
        await adminPool.query(`CREATE SCHEMA ${schema}`);
        pool = new Pool({ ...adminPool.options, password: process.env.DB_PASSWORD, options: `-c search_path=${schema}` });
        await pool.query('CREATE SEQUENCE orders_order_number_seq');
        await pool.query('CREATE TABLE orders (id BIGINT PRIMARY KEY, order_number BIGINT UNIQUE, orderjson JSON NOT NULL)');
        jest.resetModules();
        jest.doMock('../db', () => ({ pool }));
        jest.doMock('../utils/audit-log', () => ({ writeAuditLog: async () => {}, listAuditLogsForEntity: async () => [] }));
        const migration = require('../utils/db-migrations');
        await migration.ensureOrderEditLocksTable();
        await pool.query("INSERT INTO orders VALUES (1, 1, '{\"orderStatus\":\"Создана\",\"suppliers\":[{}],\"buyers\":[{}]}')");
        await pool.query("INSERT INTO order_edit_locks(order_id,user_id,user_name,locked_at) VALUES(1,'7','Test',now()-interval '30 minutes')");
        await migration.ensureOrderEditLeaseSchema();
        migrate = async () => {
            jest.resetModules();
            await require('../utils/db-migrations').ensureOrderEditLeaseSchema();
        };
        locks = require('./order-locks');
        controller = require('../controllers/order-controller');
    });
    afterAll(async () => {
        if (pool) await pool.end();
        if (adminPool) {
            await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
            await adminPool.end();
        }
    });

    test('legacy locks expire from original time; migration survives restart without changing deadlines', async () => {
        const before = (await pool.query('SELECT * FROM order_edit_locks WHERE order_id=1')).rows[0];
        expect(+before.release_at - +before.locked_at).toBe(1200000);
        expect(+before.release_at).toBeLessThan(Date.now());
        await migrate();
        const after = (await pool.query('SELECT * FROM order_edit_locks WHERE order_id=1')).rows[0];
        expect(after).toEqual(before);
    });

    test('migration removes old grace period without renewing the lease', async () => {
        const before = (await pool.query('SELECT * FROM order_edit_locks WHERE order_id=1')).rows[0];
        await pool.query("UPDATE order_edit_locks SET release_at=expires_at+interval '10 seconds'");
        await migrate();
        const after = (await pool.query('SELECT * FROM order_edit_locks WHERE order_id=1')).rows[0];
        expect(after).toEqual(before);
        expect(after.release_at).toEqual(after.expires_at);
    });

    test('simultaneous acquisitions have one winner, repeated opening does not renew', async () => {
        await pool.query('DELETE FROM order_edit_locks');
        const results = await Promise.all([
            locks.openOrder(1, '7', 'First', {}), locks.openOrder(1, '8', 'Second', {}),
        ]);
        expect(results.filter(result => result.lock.canEdit)).toHaveLength(1);
        const winner = results.find(result => result.lock.canEdit);
        const reopened = await locks.openOrder(1, winner.lock.userId, winner.lock.userName, {});
        expect(reopened.lock.lockId).toBe(winner.lock.lockId);
        expect(reopened.lock.releaseAt).toEqual(winner.lock.releaseAt);
    });

    test('a new editor winning the race prevents stale finish and stale release', async () => {
        await pool.query('DELETE FROM order_edit_locks');
        const old = await locks.openOrder(1, '7', 'Old', {});
        await pool.query("UPDATE order_edit_locks SET release_at=now()-interval '1 second'");
        const blocker = await pool.connect();
        await blocker.query('BEGIN');
        await blocker.query('SELECT id FROM orders WHERE id=1 FOR UPDATE');
        const opening = locks.openOrder(1, '8', 'New', {});
        // Wait for the opening transaction to queue on the row, not for arbitrary network timing.
        for (let i = 0; i < 100; i += 1) {
            const waiting = await pool.query("SELECT count(*) FROM pg_stat_activity WHERE query LIKE 'SELECT id, order_number, orderjson FROM orders WHERE%' AND wait_event_type='Lock'");
            if (Number(waiting.rows[0].count) > 0) break;
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        const finishResponse = res();
        const finishing = controller.finishorderedit(req(old.lock.lockId, 'stale'), finishResponse);
        await blocker.query('COMMIT'); blocker.release();
        const fresh = await opening; await finishing;
        expect(fresh.lock.canEdit).toBe(true);
        expect(finishResponse.code).toBe(423);
        expect(await locks.releaseOrder(1, '7', old.lock.lockId)).toBe(false);
        const stored = (await pool.query('SELECT orderjson FROM orders WHERE id=1')).rows[0].orderjson;
        expect(stored.comments).not.toBe('stale');
    });

    test('finish commits data and release before subsequent open; expired finish is allowed if not replaced', async () => {
        await pool.query('DELETE FROM order_edit_locks');
        const old = await locks.openOrder(1, '7', 'Old', {});
        await pool.query("UPDATE order_edit_locks SET release_at=now()-interval '1 second'");
        const finished = res(); await controller.finishorderedit(req(old.lock.lockId, 'final changes'), finished);
        expect(finished.code).toBe(202);
        const fresh = await locks.openOrder(1, '8', 'New', {});
        expect(fresh.order.orderjson.comments).toBe('final changes');
        expect(fresh.lock.lockId).not.toBe(old.lock.lockId);
        expect(fresh.lock.canEdit).toBe(true);
    });

    test('deleting an order cascades its lock', async () => {
        await pool.query('DELETE FROM orders WHERE id=1');
        expect((await pool.query('SELECT * FROM order_edit_locks')).rows).toHaveLength(0);
    });
});
