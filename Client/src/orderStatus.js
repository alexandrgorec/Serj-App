export const ORDER_STATUS_OPTIONS = [
  'Новая',
  'Заприходирована',
  'Реализована',
];

const ORDER_STATUS_ALIASES = {
  'Создана': 'Новая',
  'Приход внесен': 'Заприходирована',
  'Выполнена реализация': 'Реализована',
};

export function normalizeOrderStatus(status) {
  return ORDER_STATUS_ALIASES[status] || status || ORDER_STATUS_OPTIONS[0];
}
