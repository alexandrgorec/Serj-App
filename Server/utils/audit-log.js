const { pool } = require("../db");

let ensureAuditLogTablePromise = null;

async function ensureAuditLogTable() {
    if (!ensureAuditLogTablePromise) {
        ensureAuditLogTablePromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS audit_log (
                    id BIGSERIAL PRIMARY KEY,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    actor_user_id TEXT,
                    actor_name TEXT,
                    action TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT,
                    route TEXT,
                    payload JSONB
                )
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
                ON audit_log (created_at DESC)
            `);
        })().catch((err) => {
            ensureAuditLogTablePromise = null;
            throw err;
        });
    }
    return ensureAuditLogTablePromise;
}

function normalizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    return payload;
}

async function writeAuditLog({
    actorUserId = null,
    actorName = null,
    action,
    entityType,
    entityId = null,
    route = null,
    payload = null,
}) {
    if (!action || !entityType) return;
    await ensureAuditLogTable();
    await pool.query(
        `INSERT INTO audit_log
        (actor_user_id, actor_name, action, entity_type, entity_id, route, payload)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            actorUserId ? String(actorUserId) : null,
            actorName ? String(actorName) : null,
            String(action),
            String(entityType),
            entityId === undefined || entityId === null ? null : String(entityId),
            route ? String(route) : null,
            normalizePayload(payload),
        ]
    );
}

function normalizePaging(page, pageSize) {
    let p = Number(page);
    let ps = Number(pageSize);
    if (!Number.isInteger(p) || p < 1) p = 1;
    if (!Number.isInteger(ps) || ps < 1) ps = 20;
    if (ps > 100) ps = 100;
    return { page: p, pageSize: ps, offset: (p - 1) * ps };
}

async function listAuditLogs({ page = 1, pageSize = 20 } = {}) {
    await ensureAuditLogTable();
    const { page: safePage, pageSize: safePageSize, offset } = normalizePaging(page, pageSize);

    const countRes = await pool.query("SELECT COUNT(*)::int AS total FROM audit_log");
    const total = countRes?.rows?.[0]?.total || 0;

    const itemsRes = await pool.query(
        `SELECT id, created_at, actor_user_id, actor_name, action, entity_type, entity_id, route, payload
         FROM audit_log
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [safePageSize, offset]
    );

    return {
        items: itemsRes.rows || [],
        total,
        page: safePage,
        pageSize: safePageSize,
    };
}

async function clearAuditLogs() {
    await ensureAuditLogTable();
    const res = await pool.query(`
        WITH deleted AS (
            DELETE FROM audit_log
            RETURNING 1
        )
        SELECT COUNT(*)::int AS deleted_count
        FROM deleted
    `);
    return res?.rows?.[0]?.deleted_count || 0;
}

module.exports = {
    ensureAuditLogTable,
    writeAuditLog,
    listAuditLogs,
    clearAuditLogs,
};
