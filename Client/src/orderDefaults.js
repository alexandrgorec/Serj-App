import { ORDER_STATUS_OPTIONS } from './orderStatus';
import { ORDER_TTN_STATUS_OPTIONS } from './orderTtnStatus';

export const emptyOrderRow = () => ({
  liters: '',
  name: '',
  price: '',
  tons: '',
  typeOfProduct: '',
});

export const todayInputDate = () =>
  Intl.DateTimeFormat('ru', { year: 'numeric' }).format(new Date()) + '-' +
  Intl.DateTimeFormat('ru', { month: '2-digit' }).format(new Date()) + '-' +
  Intl.DateTimeFormat('ru', { day: '2-digit' }).format(new Date());

export const createEmptyOrder = (overrides = {}) => ({
  suppliers: [emptyOrderRow()],
  buyers: [emptyOrderRow()],
  orderNumber: '',
  orderStatus: ORDER_STATUS_OPTIONS[0],
  ttnStatus: ORDER_TTN_STATUS_OPTIONS[0].value,
  supplierPaymentDate: '',
  supplierPaymentDeferred: false,
  loadingDate: '',
  loadingFromStorage: false,
  shipmentDate: '',
  date: todayInputDate(),
  ...overrides,
});
