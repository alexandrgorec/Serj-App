export const MANAGER_OPTIONS = ['Антон', 'Лена', 'Рома', 'Серж'];

export function getManagerOptions(currentValue) {
    const current = String(currentValue || '').trim();
    if (!current || MANAGER_OPTIONS.includes(current)) return MANAGER_OPTIONS;
    return [current, ...MANAGER_OPTIONS];
}
