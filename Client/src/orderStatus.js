export const ORDER_STATUS_OPTIONS = [
  'Создана',
  'Заполнена',
  'Заприходована',
  'Реализована',
  'Отложенная',
];

export const ORDER_PRIVILEGED_STATUS_OPTIONS = [
  'Заприходована',
  'Реализована',
];

const ORDER_STATUS_ALIASES = {
  'Новая': 'Создана',
  'Машина загружена': 'Заполнена',
  'Приход внесен': 'Заприходована',
  'Заприходирована': 'Заприходована',
  'Выполнена реализация': 'Реализована',
};

export function normalizeOrderStatus(status) {
  return ORDER_STATUS_ALIASES[status] || status || ORDER_STATUS_OPTIONS[0];
}

export function getAvailableOrderStatusOptions({ canUsePrivilegedStatuses = false, currentStatus } = {}) {
  if (canUsePrivilegedStatuses) return ORDER_STATUS_OPTIONS;

  const options = ORDER_STATUS_OPTIONS.filter((status) => !ORDER_PRIVILEGED_STATUS_OPTIONS.includes(status));
  const normalizedCurrentStatus = normalizeOrderStatus(currentStatus);
  if (ORDER_PRIVILEGED_STATUS_OPTIONS.includes(normalizedCurrentStatus) && !options.includes(normalizedCurrentStatus)) {
    return [...options, normalizedCurrentStatus];
  }
  return options;
}
