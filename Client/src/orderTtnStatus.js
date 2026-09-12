export const ORDER_TTN_STATUS_OPTIONS = [
  { value: 'Х', label: 'Х' },
  { value: 'О', label: 'О' },
  { value: 'З', label: 'З' },
  { value: 'Т', label: 'Т' },
];

const ORDER_TTN_DEFAULT_STATUS = ORDER_TTN_STATUS_OPTIONS[0].value;
const ORDER_TTN_STATUS_ALIASES = {
  'Х - Не заполняется': 'Х',
  'О - Отсутствует': 'О',
  'З - Создано': 'З',
  'Т - Отправлено': 'Т',
};

export function normalizeOrderTtnStatus(status) {
  const rawStatus = String(status || '').trim();
  if (rawStatus === '') return ORDER_TTN_DEFAULT_STATUS;

  const matchedOption = ORDER_TTN_STATUS_OPTIONS.find((option) =>
    option.value === rawStatus || option.label === rawStatus
  );

  return matchedOption?.value || ORDER_TTN_STATUS_ALIASES[rawStatus] || rawStatus;
}
