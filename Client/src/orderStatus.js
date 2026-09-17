export const ORDER_STATUS_OPTIONS = [
  'Создана',
  'Заполнена',
  'Заприходована',
  'Реализована',
  'Отложенная',
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
