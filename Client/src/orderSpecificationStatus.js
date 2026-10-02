export const ORDER_SPECIFICATION_STATUS_OPTIONS = [
  'Не требуется',
  'Требуется',
  'Отправлена',
  'Подписана',
];

const ORDER_SPECIFICATION_STATUS_ALIASES = {};
export const DEFAULT_ORDER_SPECIFICATION_STATUS = ORDER_SPECIFICATION_STATUS_OPTIONS[0];

export function normalizeOrderSpecificationStatus(status) {
  const normalizedStatus = ORDER_SPECIFICATION_STATUS_ALIASES[status] || status || DEFAULT_ORDER_SPECIFICATION_STATUS;
  return ORDER_SPECIFICATION_STATUS_OPTIONS.includes(normalizedStatus)
    ? normalizedStatus
    : DEFAULT_ORDER_SPECIFICATION_STATUS;
}
