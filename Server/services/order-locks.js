const { randomUUID } = require('crypto');
const { pool } = require('../db');

const DEFAULT_EDIT_MINUTES = 20;
const PROTECTED_STATUSES = new Set(['Заприходована', 'Заприходировано', 'Заприходирована', 'Приход внесен', 'Реализована', 'Выполнена реализация']);

function httpError(status, message, extra = {}) {
    return Object.assign(new Error(message), { status, ...extra });
}

function parseEditMinutes(value, now = Date.now()) {
    const text = String(value ?? '').trim();
    const minutes = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(minutes) || minutes < 1 ||
        !Number.isFinite(new Date(now + minutes * 60000).getTime())) {
        throw httpError(400, 'Введите целое положительное число минут, допустимое для расчёта даты окончания.');
    }
    return minutes;
}

function canEditStatus(order, rights) {
    return !!(rights?.adminAccess || rights?.finBlockAccess) ||
        !PROTECTED_STATUSES.has(String(order?.orderStatus || '').trim());
}

async function getEditMinutes(userId, db = pool) {
    const result = await db.query('SELECT edit_minutes FROM user_order_settings WHERE user_id = $1', [String(userId)]);
    return result.rows[0] ? parseEditMinutes(result.rows[0].edit_minutes) : DEFAULT_EDIT_MINUTES;
}

function lockForClient(row, userId, now, editable = true) {
    const active = !!row && new Date(row.release_at).getTime() > now.getTime();
    const owner = active && String(row.user_id) === String(userId);
    return {
        locked: active, canEdit: editable && owner, isOwner: owner,
        lockId: row?.lock_id || null, orderId: row?.order_id || null,
        userId: row?.user_id || '', userName: row?.user_name || '',
        lockedAt: row?.locked_at || null, expiresAt: row?.expires_at || null,
        releaseAt: row?.release_at || null, serverTime: now.toISOString(),
    };
}

// Every lock operation first locks the same orders row, including when no lease exists yet.
async function withOrderTransaction(id, action) {
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) throw httpError(400, 'Некорректный номер заявки');
    const db = await pool.connect();
    try {
        await db.query('BEGIN');
        await db.query("SET LOCAL statement_timeout = '12s'");
        await db.query("SET LOCAL idle_in_transaction_session_timeout = '12s'");
        const orderResult = await db.query('SELECT id, order_number, orderjson FROM orders WHERE id = $1 FOR UPDATE', [id]);
        if (!orderResult.rows[0]) throw httpError(404, 'Заявка не найдена');
        const lockResult = await db.query('SELECT * FROM order_edit_locks WHERE order_id = $1', [id]);
        const timeResult = await db.query('SELECT clock_timestamp() AS server_time');
        const now = new Date(timeResult.rows[0].server_time);
        const result = await action(db, orderResult.rows[0], lockResult.rows[0], now);
        await db.query('COMMIT');
        return result;
    } catch (error) {
        await db.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        db.release();
    }
}

async function openOrder(id, userId, userName, rights) {
    return withOrderTransaction(id, async (db, order, lock, now) => {
        const editable = canEditStatus(order.orderjson, rights);
        if (editable && (!lock || new Date(lock.release_at) <= now)) {
            const minutes = await getEditMinutes(userId, db);
            const expiresAt = new Date(now.getTime() + minutes * 60000);
            const result = await db.query(`
                INSERT INTO order_edit_locks(order_id, user_id, user_name, lock_id, locked_at, expires_at, release_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (order_id) DO UPDATE SET
                    user_id = EXCLUDED.user_id, user_name = EXCLUDED.user_name, lock_id = EXCLUDED.lock_id,
                    locked_at = EXCLUDED.locked_at, expires_at = EXCLUDED.expires_at, release_at = EXCLUDED.release_at
                RETURNING *`,
            [id, String(userId), userName, randomUUID(), now, expiresAt, expiresAt]);
            lock = result.rows[0];
        }
        return { order, lock: lockForClient(lock, userId, now, editable), serverTime: now.toISOString() };
    });
}

function requireOwner(lock, userId, lockId, now, finishing = false) {
    if (!lockId) throw httpError(423, 'Обновите страницу и заново откройте заявку: версия редактора устарела.');
    if (!lock || String(lock.user_id) !== String(userId) || lock.lock_id !== lockId ||
        (!finishing && new Date(lock.release_at) <= now)) {
        throw httpError(423, 'Время редактирования истекло или заявку открыл другой пользователь. Изменения не сохранены.', {
            lock: lockForClient(lock, userId, now, false),
        });
    }
}

async function releaseOrder(id, userId, lockId, force = false) {
    if (!lockId) throw httpError(423, 'Обновите страницу и заново откройте заявку.');
    return withOrderTransaction(id, async (db, order, lock) => {
        if (!lock || lock.lock_id !== lockId || (!force && String(lock.user_id) !== String(userId))) return false;
        await db.query('DELETE FROM order_edit_locks WHERE order_id = $1 AND lock_id = $2', [id, lockId]);
        return true;
    });
}

module.exports = { DEFAULT_EDIT_MINUTES, parseEditMinutes, getEditMinutes, canEditStatus,
    httpError, lockForClient, withOrderTransaction, openOrder, requireOwner, releaseOrder };
