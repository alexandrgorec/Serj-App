export const MANAGER_OPTIONS = ['Антон', 'Лена', 'Рома', 'Серж'];

export function getManagerOptions(currentValue, userOptions = []) {
    const current = String(currentValue || '').trim();
    const sourceOptions = Array.isArray(userOptions) && userOptions.length > 0
        ? userOptions
        : MANAGER_OPTIONS;
    const options = sourceOptions
        .map((option) => String(option || '').trim())
        .filter((option, index, list) => option !== '' && list.indexOf(option) === index);

    if (!current || options.includes(current)) return options;
    return [current, ...options];
}
