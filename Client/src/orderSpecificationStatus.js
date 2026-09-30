export const ORDER_SPECIFICATION_STATUS_OPTIONS = [
  'Требуется',
  'Отправлена',
  'Подписана',
];

const ORDER_SPECIFICATION_STATUS_ALIASES = {};

export function normalizeOrderSpecificationStatus(status) {
  return ORDER_SPECIFICATION_STATUS_ALIASES[status] || status || ORDER_SPECIFICATION_STATUS_OPTIONS[0];
}
