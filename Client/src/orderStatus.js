export const ORDER_STATUS_OPTIONS = [
  'Новая',
  'Отложенная',
  'Машина загружена',
  'Заприходована',
  'Реализована',
];

const ORDER_STATUS_ALIASES = {
  'Создана': 'Новая',
  'Приход внесен': 'Заприходована',
  'Заприходирована': 'Заприходована',
  'Выполнена реализация': 'Реализована',
};

export function normalizeOrderStatus(status) {
  return ORDER_STATUS_ALIASES[status] || status || ORDER_STATUS_OPTIONS[0];
}
