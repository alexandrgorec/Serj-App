import { ORDER_STATUS_OPTIONS } from './orderStatus';
import { ORDER_TTN_STATUS_OPTIONS } from './orderTtnStatus';
import { ORDER_SPECIFICATION_STATUS_OPTIONS } from './orderSpecificationStatus';

export const emptyOrderRow = () => ({
  date: '',
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
  specificationStatus: ORDER_SPECIFICATION_STATUS_OPTIONS[0],
  clientPaid: 'Нет',
  salaryIncluded: 'Нет',
  invoiceSent: 'Нет',
  reconciliationAct: 'Нет',
  supplierPaymentDate: '',
  supplierPaymentDeferred: false,
  supplierPaymentDeferredDays: '',
  clientPaymentDate: '',
  clientPaymentDeferred: false,
  clientPaymentDeferredDays: '',
  loadingDate: '',
  loadingFromStorage: false,
  shipmentDate: '',
  drainPlace: '',
  date: todayInputDate(),
  ...overrides,
});
