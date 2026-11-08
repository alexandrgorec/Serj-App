const { spawn } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

function parseConfig(env = process.env) {
    const destination = env.BACKUP_RCLONE_DESTINATION;
    if (!destination) return { enabled: false };
    if (!/^[\w.-]+:.+/.test(destination)) {
        throw new Error('BACKUP_RCLONE_DESTINATION должен иметь формат remote:папка');
    }
    const schedule = env.BACKUP_DAILY_AT || '02:00';
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(schedule)) {
        throw new Error('BACKUP_DAILY_AT должен иметь формат ЧЧ:ММ, например 02:00');
    }
    const timezone = env.BACKUP_TIMEZONE || 'Europe/Moscow';
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return {
        enabled: true,
        destination: destination.replace(/\/$/, ''),
        rcloneConfig: env.RCLONE_CONFIG,
        schedule,
        timezone,
        dbHost: env.DB_HOST || 'localhost',
        dbPort: env.DB_PORT || '5432',
        dbName: env.DB_NAME || 'serj',
        dbUser: env.DB_USER || 'postgres',
        dbPassword: env.DB_PASSWORD || '',
    };
}

function localTime(date, timezone) {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(date);
}

function localDateKey(date, timezone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function runCommand(command, args, env = process.env) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.once('error', reject);
        child.once('close', code => code === 0
            ? resolve()
            : reject(new Error(`${command} завершился с кодом ${code}: ${stderr.trim() || 'нет подробностей'}`)));
    });
}

async function createAndUploadBackup(config, { now = new Date() } = {}) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'serj-db-backup-'));
    const filename = `serj-${config.dbName}-${now.toISOString().replace(/[:.]/g, '-')}.dump`;
    const dumpPath = path.join(tempDir, filename);
    const destination = `${config.destination}/${filename}`;
    try {
        await runCommand('pg_dump', [
            '--format=custom', '--no-owner', '--no-privileges',
            '--host', config.dbHost, '--port', String(config.dbPort),
            '--username', config.dbUser, '--file', dumpPath, config.dbName,
        ], { ...process.env, PGPASSWORD: config.dbPassword, PGCONNECT_TIMEOUT: '15' });

        const args = ['copyto', dumpPath, destination];
        if (config.rcloneConfig) args.unshift('--config', config.rcloneConfig);
        await runCommand('rclone', args);
        const { size } = await fs.stat(dumpPath);
        return { filename, size, destination };
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

function startDatabaseBackup(env = process.env, { backup = createAndUploadBackup, now = () => new Date() } = {}) {
    const config = parseConfig(env);
    if (!config.enabled) {
        console.warn('Резервное копирование PostgreSQL на Яндекс Диск выключено: задайте BACKUP_RCLONE_DESTINATION');
        return null;
    }

    let lastRunDate = '';
    let lastAttemptAt = 0;
    let running = false;
    const timer = setInterval(async () => {
        const current = now();
        const date = localDateKey(current, config.timezone);
        const [scheduleHours, scheduleMinutes] = config.schedule.split(':').map(Number);
        const [currentHours, currentMinute] = localTime(current, config.timezone).split(':').map(Number);
        const currentMinutes = currentHours * 60 + currentMinute;
        if (running || date === lastRunDate || currentMinutes < scheduleHours * 60 + scheduleMinutes ||
            current.getTime() - lastAttemptAt < 5 * 60 * 1000) return;
        lastAttemptAt = current.getTime();
        running = true;
        try {
            const result = await backup(config, { now: current });
            lastRunDate = date;
            console.log(`Резервная копия БД загружена на Яндекс Диск: ${result.destination} (${result.size} байт)`);
        } catch (error) {
            console.error('Ошибка резервного копирования БД:', error.message);
        } finally {
            running = false;
        }
    }, 15000);
    timer.unref?.();
    console.log(`Резервирование БД на Яндекс Диск запланировано ежедневно на ${config.schedule} (${config.timezone})`);
    return timer;
}

module.exports = { parseConfig, createAndUploadBackup, startDatabaseBackup };
