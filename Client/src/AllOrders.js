import './AllOrders.css';
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';
import { useState, useEffect, useContext, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import Collapse from 'react-bootstrap/Collapse';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { BiEditAlt } from "react-icons/bi";
import { MdDelete } from "react-icons/md";
import { userContext } from './App';
import { FaChevronDown, FaChevronUp, FaEye, FaEyeSlash, FaGear, FaPeopleArrows, FaPrint, FaXmark } from "react-icons/fa6";
import { FormLabel } from 'react-bootstrap';
import { Typeahead } from "react-bootstrap-typeahead";
import { ORDER_STATUS_OPTIONS, normalizeOrderStatus } from './orderStatus';
import { ORDER_TTN_STATUS_OPTIONS, normalizeOrderTtnStatus } from './orderTtnStatus';

const DATE_FILTER_TYPE_OPTIONS = [
  { value: 'created', label: 'Создания' },
  { value: 'loading', label: 'Загрузки' },
];

const USER_UI_STATE_PREFIX = 'serjApp:userUiState:';

const DEFAULT_FILTER_SETTINGS = {
  orderNumber: '',
  statuses: [],
  ttnStatus: '',
  clientPaid: '',
  salaryIncluded: '',
  manager: '',
  supplier: '',
  buyer: '',
  dateType: 'created',
  dateFrom: '',
  dateTo: '',
  emptyBuyerH: false,
};

const ALL_ORDERS_COLUMNS = [
  { id: 'realizationDate', colClass: 'allOrders-col-realization-date', defaultWidth: 7 },
  { id: 'orderNumber', colClass: 'allOrders-col-num', defaultWidth: 6 },
  { id: 'status', colClass: 'allOrders-col-status', defaultWidth: 4 },
  { id: 'ttnStatus', colClass: 'allOrders-col-ttn-status', defaultWidth: 4 },
  { id: 'suppliers', colClass: 'allOrders-col-suppliers', defaultWidth: 7 },
  { id: 'loadingDate', colClass: 'allOrders-col-loading-date', defaultWidth: 6 },
  { id: 'products', colClass: 'allOrders-col-products', defaultWidth: 6 },
  { id: 'tons', colClass: 'allOrders-col-tons', defaultWidth: 5 },
  { id: 'buyers', colClass: 'allOrders-col-buyers', defaultWidth: 8 },
  { id: 'clientPaid', colClass: 'allOrders-col-client-paid', defaultWidth: 7 },
  { id: 'hsum', colClass: 'allOrders-col-hsum', defaultWidth: 5 },
  { id: 'invoiceSent', colClass: 'allOrders-col-invoice-sent', defaultWidth: 6 },
  { id: 'reconciliationAct', colClass: 'allOrders-col-reconciliation-act', defaultWidth: 6 },
  { id: 'salaryIncluded', colClass: 'allOrders-col-salary-included', defaultWidth: 6 },
  { id: 'manager', colClass: 'allOrders-col-manager', defaultWidth: 7 },
  { id: 'createdDate', colClass: 'allOrders-col-created-date', defaultWidth: 7 },
  { id: 'menu', colClass: 'allOrders-col-menu', defaultWidth: 6 },
];

const COLUMN_MIN_WIDTH = 3;
const COLUMN_MAX_WIDTH = 24;

function getUserUiStateKey(user) {
  const rawKey = user?.id || user?.userId || user?.name || 'anonymous';
  return `${USER_UI_STATE_PREFIX}${encodeURIComponent(String(rawKey))}`;
}

function readUserUiState(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function normalizeColumnVisibility(value) {
  return ALL_ORDERS_COLUMNS.reduce((acc, column) => {
    acc[column.id] = value?.[column.id] !== false;
    return acc;
  }, {});
}

function normalizeColumnWidths(value) {
  return ALL_ORDERS_COLUMNS.reduce((acc, column) => {
    const rawWidth = Number(value?.[column.id]);
    const width = Number.isFinite(rawWidth) ? rawWidth : column.defaultWidth;
    acc[column.id] = Math.min(Math.max(width, COLUMN_MIN_WIDTH), COLUMN_MAX_WIDTH);
    return acc;
  }, {});
}

function normalizeFilterSettings(value) {
  const dateType = DATE_FILTER_TYPE_OPTIONS.some((option) => option.value === value?.dateType)
    ? value.dateType
    : DEFAULT_FILTER_SETTINGS.dateType;
  const rawStatuses = Array.isArray(value?.statuses)
    ? value.statuses
    : (value?.status ? [value.status] : []);
  const statuses = rawStatuses
    .map((status) => normalizeOrderStatus(status))
    .filter((status) => ORDER_STATUS_OPTIONS.includes(status));
  return {
    orderNumber: String(value?.orderNumber || ''),
    statuses: Array.from(new Set(statuses)),
    ttnStatus: String(value?.ttnStatus || ''),
    clientPaid: String(value?.clientPaid || ''),
    salaryIncluded: String(value?.salaryIncluded || ''),
    manager: String(value?.manager || ''),
    supplier: String(value?.supplier || ''),
    buyer: String(value?.buyer || ''),
    dateType,
    dateFrom: String(value?.dateFrom || ''),
    dateTo: String(value?.dateTo || ''),
    emptyBuyerH: value?.emptyBuyerH === true,
  };
}

function spisok(array) {
  {
    let result = [];
    array.forEach(item => {
      if (!result.includes(item.name))
        result.push(item.name);
      if (item.buyersH) {
        item.buyersH.forEach(itemH => {
          if (!result.includes(itemH.name) && itemH.name != '')
            result.push(itemH.name);
        })
      }
    });
    return (result.join('; '));
  }
}

/** Суммы из buyerH, у которых имя подпокупателя не заполнено (как в списке заявок). */
function formatSummaCell(num) {
  if (num === undefined || num === null || num === '') return '';
  let n = num;
  if (typeof n === 'string')
    n = n.replace(/\s/g, '').replace(/,/g, '.');
  if (n === '' || Number.isNaN(Number(n))) return '';
  return new Intl.NumberFormat().format(Number(n));
}

function parseNumericCellValue(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().replace(/\s/g, '').replace(/,/g, '.');
  if (normalized === '' || Number.isNaN(Number(normalized))) return null;
  return Number(normalized);
}

function suppliersTonsTotal(orderjson) {
  const suppliers = Array.isArray(orderjson?.suppliers) ? orderjson.suppliers : [];
  const total = suppliers.reduce((sum, supplier) => {
    const tons = parseNumericCellValue(supplier?.tons);
    return tons === null ? sum : sum + tons;
  }, 0);
  return total === 0 ? '' : total;
}

function supplierProductsDisplay(orderjson) {
  const suppliers = Array.isArray(orderjson?.suppliers) ? orderjson.suppliers : [];
  const products = [];
  suppliers.forEach((supplier) => {
    const product = String(supplier?.typeOfProduct || '').trim();
    if (product !== '' && !products.includes(product)) products.push(product);
  });
  return products.join('; ');
}

function emptyBuyerHSummasDisplay(buyers) {
  if (!buyers?.length) return '';
  const parts = [];
  buyers.forEach((buyer) => {
    if (!buyer.buyersH?.length) return;
    buyer.buyersH.forEach((h) => {
      if (h.name != null && String(h.name).trim() !== '') return;
      const formatted = formatSummaCell(h.summa);
      if (formatted !== '') parts.push(formatted);
    });
  });
  return parts.join('; ');
}

function buyerNamesFromOrder(orderjson) {
  const out = [];
  const buyers = orderjson?.buyers || [];
  buyers.forEach((b) => {
    if (b?.name != null && String(b.name).trim() !== '') out.push(String(b.name).trim());
    if (b?.buyersH?.length) {
      b.buyersH.forEach((h) => {
        if (h?.name != null && String(h.name).trim() !== '') out.push(String(h.name).trim());
      });
    }
  });
  return out;
}

function supplierNamesFromOrder(orderjson) {
  const out = [];
  const suppliers = orderjson?.suppliers || [];
  suppliers.forEach((supplier) => {
    if (supplier?.name != null && String(supplier.name).trim() !== '') out.push(String(supplier.name).trim());
  });
  return out;
}

function getOrderNumber(order) {
  return order?.order_number || order?.orderjson?.orderNumber || order?.orderjson?.order_number || order?.id;
}

function getOrderStatus(orderjson) {
  return normalizeOrderStatus(orderjson?.orderStatus);
}

function getOrderTtnStatus(orderjson) {
  return normalizeOrderTtnStatus(orderjson?.ttnStatus);
}

function getOrderClientPaid(orderjson) {
  return String(orderjson?.clientPaid || 'Нет').trim() || 'Нет';
}

function getOrderSalaryIncluded(orderjson) {
  return String(orderjson?.salaryIncluded || 'Нет').trim() || 'Нет';
}

function getOrderInvoiceSent(orderjson) {
  return String(orderjson?.invoiceSent || 'Нет').trim() || 'Нет';
}

function getOrderReconciliationAct(orderjson) {
  return String(orderjson?.reconciliationAct || 'Нет').trim() || 'Нет';
}

function getOrderStatusClass(status) {
  const normalizedStatus = normalizeOrderStatus(status);
  if (normalizedStatus === 'Отложенная') return 'allOrders-status-postponed';
  if (normalizedStatus === 'Заприходована') return 'allOrders-status-income';
  if (normalizedStatus === 'Заполнена') return 'allOrders-status-loaded';
  if (normalizedStatus === 'Реализована') return 'allOrders-status-done';
  return 'allOrders-status-created';
}

function getOrderManager(orderjson) {
  const manager = String(orderjson?.manager || '').trim();
  if (manager !== '') return manager;
  const buyers = Array.isArray(orderjson?.buyers) ? orderjson.buyers : [];
  const buyerManager = buyers
    .map((buyer) => String(buyer?.manager || '').trim())
    .find((value) => value !== '');
  if (buyerManager) return buyerManager;
  const buyerHManager = buyers
    .flatMap((buyer) => Array.isArray(buyer?.buyersH) ? buyer.buyersH : [])
    .map((buyerH) => String(buyerH?.manager || '').trim())
    .find((value) => value !== '');
  return buyerHManager || '';
}

function getOrderDateForFilter(order, dateFilterType = 'created') {
  const rawDate = dateFilterType === 'loading'
    ? order?.orderjson?.loadingDate || ''
    : order?.orderjson?.date || order?.date || '';
  if (!rawDate) return '';
  const text = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const parsedDate = new Date(Date.parse(text));
  if (Number.isNaN(parsedDate.getTime())) return '';
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return '—';
  date = new Date(Date.parse(date));
  if (Number.isNaN(date.getTime())) return '—';
  let dd = date.getDate();
  if (dd < 10) dd = '0' + dd;

  let mm = date.getMonth() + 1;
  if (mm < 10) mm = '0' + mm;

  let yy = date.getFullYear() % 100;
  if (yy < 10) yy = '0' + yy;

  return dd + '.' + mm + '.' + yy;
}



function AllOrders() {
  const { user, setToast, aAxios, setEditingOrder } = useContext(userContext);
  const navigate = useNavigate();
  const userUiStateKey = getUserUiStateKey(user);
  const tableRef = useRef(null);
  const skipFilterPersistRef = useRef(false);
  const [lastActiveOrderId, setLastActiveOrderId] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return String(savedState?.lastActiveOrder?.id || '');
  });
  const [columnSettingsMode, setColumnSettingsMode] = useState('');
  const [columnSettingsMenuOpen, setColumnSettingsMenuOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeColumnVisibility(savedState?.visibleColumns);
  });
  const [draftColumnVisibility, setDraftColumnVisibility] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeColumnVisibility(savedState?.visibleColumns);
  });
  const [columnWidths, setColumnWidths] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeColumnWidths(savedState?.columnWidths);
  });
  const [draftColumnWidths, setDraftColumnWidths] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeColumnWidths(savedState?.columnWidths);
  });
  const [buyerFilter, setBuyerFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).buyer;
  });
  const buyerTypeaheadRef = useRef(null);
  const [managerFilter, setManagerFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).manager;
  });
  const managerTypeaheadRef = useRef(null);
  const [supplierFilter, setSupplierFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).supplier;
  });
  const supplierTypeaheadRef = useRef(null);
  const [orderNumberFilter, setOrderNumberFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).orderNumber;
  });
  const [statusFilters, setStatusFilters] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).statuses;
  });
  const [ttnStatusFilter, setTtnStatusFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).ttnStatus;
  });
  const [clientPaidFilter, setClientPaidFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).clientPaid;
  });
  const [salaryIncludedFilter, setSalaryIncludedFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).salaryIncluded;
  });
  const [dateFilterType, setDateFilterType] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).dateType;
  });
  const [dateFromFilter, setDateFromFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).dateFrom;
  });
  const [dateToFilter, setDateToFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).dateTo;
  });
  const [emptyBuyerHFilter, setEmptyBuyerHFilter] = useState(() => {
    const savedState = readUserUiState(getUserUiStateKey(user));
    return normalizeFilterSettings(savedState?.filters).emptyBuyerH;
  });
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);
  const openEditedOrder = () => {
    setOrders((orders) => {
      if (sessionStorage.createdOrderId) {
        orders.forEach(order => {
          order.open = order.id === sessionStorage.createdOrderId ? true : false;
        })
      }
      return (orders)
    })
    setTimeout(() => {
      delete sessionStorage.createdOrderId;
    }, 1000);
  }

  const bgColorH = 'rgba(127, 244, 166, 0.49)';


  const [orders, setOrders] = useState([]);

  const buyerOptions = Array.from(new Set(
    orders
      .flatMap((o) => buyerNamesFromOrder(o?.orderjson))
      .map((s) => String(s).trim())
      .filter((s) => s !== '')
  ));

  const managerOptions = Array.from(new Set(
    orders
      .map((o) => getOrderManager(o?.orderjson))
      .map((s) => String(s).trim())
      .filter((s) => s !== '')
  ));

  const supplierOptions = Array.from(new Set(
    orders
      .flatMap((o) => supplierNamesFromOrder(o?.orderjson))
      .map((s) => String(s).trim())
      .filter((s) => s !== '')
  ));



  const [orderForDelete, setOrderForDelete] = useState(null);
  const [show, setShow] = useState(false);
  const handleCloseModal = () => {
    setShow(false);
    setOrderForDelete(null);
  };
  const handleShowModal = () => setShow(true);

  function showHideOrder(num) {
    setOrders((orders) => {
      orders[num].open = !orders[num].open;
      return (orders)
    })
    reload(!state);
  }


  let size = '';
  let display = '';
  if (window.innerWidth < 850) {
    display = 'none';
    size = 'sm'
  }
  const isPhone = window.innerWidth <= 480;
  const [state, reload] = useState(false);

  const rememberActiveOrder = (order) => {
    const orderId = order?.id || order?.orderjson?.id;
    if (!orderId) return;
    const activeOrderId = String(orderId);
    const previousState = readUserUiState(userUiStateKey);
    const nextState = {
      ...previousState,
      lastActiveOrder: {
        id: activeOrderId,
        orderNumber: getOrderNumber(order),
        updatedAt: new Date().toISOString(),
      },
    };
    window.localStorage.setItem(userUiStateKey, JSON.stringify(nextState));
    setLastActiveOrderId(activeOrderId);
  };

  const saveColumnSettings = (nextVisibility, nextWidths) => {
    const normalizedVisibility = normalizeColumnVisibility(nextVisibility);
    const normalizedWidths = normalizeColumnWidths(nextWidths);
    const previousState = readUserUiState(userUiStateKey);
    window.localStorage.setItem(userUiStateKey, JSON.stringify({
      ...previousState,
      visibleColumns: normalizedVisibility,
      columnWidths: normalizedWidths,
    }));
    setColumnVisibility(normalizedVisibility);
    setColumnWidths(normalizedWidths);
  };

  const saveDraftColumnSettings = () => {
    const normalizedVisibility = normalizeColumnVisibility(draftColumnVisibility);
    const normalizedWidths = normalizeColumnWidths(draftColumnWidths);
    saveColumnSettings(normalizedVisibility, normalizedWidths);
    setDraftColumnVisibility(normalizedVisibility);
    setDraftColumnWidths(normalizedWidths);
  };

  const openColumnSettingsMode = (mode) => {
    if (columnSettingsMode) saveDraftColumnSettings();
    else {
      setDraftColumnVisibility(normalizeColumnVisibility(columnVisibility));
      setDraftColumnWidths(normalizeColumnWidths(columnWidths));
    }
    setColumnSettingsMode(mode);
    setColumnSettingsMenuOpen(false);
  };

  const exitColumnSettingsMode = () => {
    if (columnSettingsMode) saveDraftColumnSettings();
    setColumnSettingsMode('');
    setColumnSettingsMenuOpen(false);
  };

  const toggleDraftColumnVisibility = (columnId) => {
    setDraftColumnVisibility((currentVisibility) => {
      const normalizedVisibility = normalizeColumnVisibility(currentVisibility);
      return {
        ...normalizedVisibility,
        [columnId]: !normalizedVisibility[columnId],
      };
    });
  };

  const startColumnResize = (columnId, evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const tableWidth = tableRef.current?.offsetWidth || 1120;
    const startX = evt.clientX;
    const startWidths = normalizeColumnWidths(draftColumnWidths);
    const startWidth = startWidths[columnId];

    const handleMouseMove = (moveEvt) => {
      const deltaWidth = ((moveEvt.clientX - startX) / tableWidth) * 100;
      const nextWidth = Math.min(Math.max(startWidth + deltaWidth, COLUMN_MIN_WIDTH), COLUMN_MAX_WIDTH);
      setDraftColumnWidths((currentWidths) => ({
        ...normalizeColumnWidths(currentWidths),
        [columnId]: Number(nextWidth.toFixed(2)),
      }));
    };

    const handleMouseUp = () => {
      document.body.classList.remove('allOrders-column-resizing');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.classList.add('allOrders-column-resizing');
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };



  const getAllOrders = (firstUpload = true) => {
    const oldOrders = orders;
    aAxios.post(`/user/getallorders`)
      .then(function (response) {
        if (response.status === 202) {
          setOrders(response.data.orders.map((order, index) => {
            order.orderjson.id = order.id;
            order.orderjson.orderNumber = getOrderNumber(order);
            if (firstUpload) {
              order.open = false;
              if (sessionStorage.createdOrderId) {
                order.open = order.id === sessionStorage.createdOrderId ? true : false;
              }
            }
            else {
              oldOrders[index] ? order.open = oldOrders[index].open : order.open = false;
            }
            return (order);
          }))
        }
      })
      .catch(function (error) {

      });
  }

  const deleteOrder = (id, orderNumber = id) => {
    aAxios.post(`/user/deleteorder`, {
      id
    })
      .then(function (response) {
        if (response.status === 202) {
          getAllOrders(false);
          setToast(`Заявка №${orderNumber} удалена`)
        }
      })
      .catch(function (error) {
      });
  }

  const handleDeleteConfirmed = () => {
    if (!orderForDelete) return;
    deleteOrder(orderForDelete.id, orderForDelete.orderNumber);
    handleCloseModal();
  };

  useEffect(() => {
    if (!show) return undefined;

    const handleGlobalModalKeyDown = (evt) => {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        evt.stopPropagation();
        handleCloseModal();
        return;
      }
      if (evt.key === 'Enter') {
        evt.preventDefault();
        evt.stopPropagation();
        handleDeleteConfirmed();
      }
    };

    document.addEventListener('keydown', handleGlobalModalKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleGlobalModalKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, orderForDelete]);

  const printOrder = (id) => {
    const token = window.localStorage.token || '';
    const baseUrl = aAxios?.defaults?.baseURL || window.location.origin;
    const printUrl = `${baseUrl}/user/printorder/${id}?token=${encodeURIComponent(token)}`;
    const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      setToast('Разрешите всплывающие окна, чтобы открыть печать', 'warning');
    }
  }

  const resetFilters = () => {
    setOrderNumberFilter('');
    setStatusFilters([]);
    setTtnStatusFilter('');
    setClientPaidFilter('');
    setSalaryIncludedFilter('');
    setManagerFilter('');
    setSupplierFilter('');
    setBuyerFilter('');
    setDateFilterType('created');
    setDateFromFilter('');
    setDateToFilter('');
    setEmptyBuyerHFilter(false);
    managerTypeaheadRef.current?.clear();
    supplierTypeaheadRef.current?.clear();
    buyerTypeaheadRef.current?.clear();
    reload(!state);
  };



  useEffect(() => {
    getAllOrders();
    openEditedOrder();
  }, [null])

  useEffect(() => {
    const savedState = readUserUiState(userUiStateKey);
    setLastActiveOrderId(String(savedState?.lastActiveOrder?.id || ''));
    const savedVisibility = normalizeColumnVisibility(savedState?.visibleColumns);
    const savedWidths = normalizeColumnWidths(savedState?.columnWidths);
    const savedFilters = normalizeFilterSettings(savedState?.filters);
    skipFilterPersistRef.current = true;
    setColumnVisibility(savedVisibility);
    setDraftColumnVisibility(savedVisibility);
    setColumnWidths(savedWidths);
    setDraftColumnWidths(savedWidths);
    setColumnSettingsMode('');
    setColumnSettingsMenuOpen(false);
    setOrderNumberFilter(savedFilters.orderNumber);
    setStatusFilters(savedFilters.statuses);
    setTtnStatusFilter(savedFilters.ttnStatus);
    setClientPaidFilter(savedFilters.clientPaid);
    setSalaryIncludedFilter(savedFilters.salaryIncluded);
    setManagerFilter(savedFilters.manager);
    setSupplierFilter(savedFilters.supplier);
    setBuyerFilter(savedFilters.buyer);
    setDateFilterType(savedFilters.dateType);
    setDateFromFilter(savedFilters.dateFrom);
    setDateToFilter(savedFilters.dateTo);
    setEmptyBuyerHFilter(savedFilters.emptyBuyerH);
  }, [userUiStateKey]);

  useEffect(() => {
    if (skipFilterPersistRef.current) {
      skipFilterPersistRef.current = false;
      return;
    }

    const previousState = readUserUiState(userUiStateKey);
    const filters = normalizeFilterSettings({
      orderNumber: orderNumberFilter,
      statuses: statusFilters,
      ttnStatus: ttnStatusFilter,
      clientPaid: clientPaidFilter,
      salaryIncluded: salaryIncludedFilter,
      manager: managerFilter,
      supplier: supplierFilter,
      buyer: buyerFilter,
      dateType: dateFilterType,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
      emptyBuyerH: emptyBuyerHFilter,
    });
    window.localStorage.setItem(userUiStateKey, JSON.stringify({
      ...previousState,
      filters,
    }));
  }, [
    userUiStateKey,
    orderNumberFilter,
    statusFilters,
    ttnStatusFilter,
    clientPaidFilter,
    salaryIncludedFilter,
    managerFilter,
    supplierFilter,
    buyerFilter,
    dateFilterType,
    dateFromFilter,
    dateToFilter,
    emptyBuyerHFilter,
  ]);


  const NumberFormat = (num) => {
    if (num === undefined || num === null) return '';
    let s = String(num).trim();
    if (s === '') return '';

    // normalize: remove spaces, unify decimal separator to "."
    const originalHadComma = s.includes(',');
    s = s.replace(/\s/g, '').replace(/,/g, '.');

    // keep sign, and DO NOT round fractional part
    const sign = s.startsWith('-') ? '-' : '';
    if (sign) s = s.slice(1);

    const [intRaw, fracRaw] = s.split('.');
    if (!intRaw || !/^\d+$/.test(intRaw)) return '';

    const intFormatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(intRaw));
    if (fracRaw === undefined) return sign + intFormatted;
    if (!/^\d+$/.test(fracRaw)) return sign + intFormatted;

    const decSep = originalHadComma ? ',' : '.';
    return sign + intFormatted + decSep + fracRaw;
  }
  const filterEmptyBuyerH = emptyBuyerHFilter;
  const orderNumberQ = String(orderNumberFilter || '').replace(/\s/g, '').trim();
  const buyerQ = String(buyerFilter || '').trim().toLowerCase();
  const managerQ = String(managerFilter || '').trim().toLowerCase();
  const supplierQ = String(supplierFilter || '').trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchOrderNumber =
      orderNumberQ === '' ||
      String(getOrderNumber(order) || '').replace(/\s/g, '').trim() === orderNumberQ;

    const matchBuyer =
      buyerQ === '' ||
      buyerNamesFromOrder(order.orderjson)
        .some((n) => String(n).toLowerCase().includes(buyerQ));

    const matchSupplier =
      supplierQ === '' ||
      supplierNamesFromOrder(order.orderjson)
        .some((n) => String(n).toLowerCase().includes(supplierQ));

    const matchManager =
      managerQ === '' ||
      getOrderManager(order.orderjson).toLowerCase().includes(managerQ);

    const matchStatus =
      statusFilters.length === 0 ||
      statusFilters.includes(getOrderStatus(order.orderjson));

    const matchTtnStatus =
      ttnStatusFilter === '' ||
      getOrderTtnStatus(order.orderjson) === ttnStatusFilter;

    const matchClientPaid =
      clientPaidFilter === '' ||
      getOrderClientPaid(order.orderjson) === clientPaidFilter;

    const matchSalaryIncluded =
      salaryIncludedFilter === '' ||
      getOrderSalaryIncluded(order.orderjson) === salaryIncludedFilter;

    const orderDate = getOrderDateForFilter(order, dateFilterType);
    const matchDateFrom =
      dateFromFilter === '' ||
      (orderDate !== '' && orderDate >= dateFromFilter);
    const matchDateTo =
      dateToFilter === '' ||
      (orderDate !== '' && orderDate <= dateToFilter);

    if (!matchOrderNumber) return false;
    if (!matchBuyer) return false;
    if (!matchSupplier) return false;
    if (!matchManager) return false;
    if (!matchStatus) return false;
    if (!matchTtnStatus) return false;
    if (!matchClientPaid) return false;
    if (!matchSalaryIncluded) return false;
    if (!matchDateFrom) return false;
    if (!matchDateTo) return false;
    if (filterEmptyBuyerH) {
      const matchEmptyBuyerH = !!order.orderjson.haveEmptyBuyerH;
      if (!matchEmptyBuyerH) return false;
    }

    return true;
  });

  const isColumnVisibilityMode = columnSettingsMode === 'visibility';
  const isColumnWidthMode = columnSettingsMode === 'width';
  const activeColumnVisibility = columnSettingsMode ? draftColumnVisibility : columnVisibility;
  const activeColumnWidths = isColumnWidthMode ? draftColumnWidths : columnWidths;
  const isColumnRendered = (columnId) => isColumnVisibilityMode || activeColumnVisibility[columnId] !== false;
  const getColumnWidth = (columnId) => normalizeColumnWidths(activeColumnWidths)[columnId];
  const visibleColumnCount = Math.max(ALL_ORDERS_COLUMNS.filter((column) => isColumnRendered(column.id)).length, 1);

  const renderColumnHeader = (columnId, content, props = {}) => {
    const isVisible = draftColumnVisibility[columnId] !== false;
    const { className = '', children, ...restProps } = props;
    return (
      <th {...restProps} className={className}>
        <span className="allOrders-columnHeaderContent">
          <span>{children || content}</span>
          {isColumnVisibilityMode &&
            <span className="allOrders-columnHeaderControls">
              <button
                type="button"
                className={`allOrders-columnEyeBtn ${isVisible ? '' : 'allOrders-columnEyeBtnHidden'}`}
                title={isVisible ? 'Скрыть столбец' : 'Показать столбец'}
                aria-label={isVisible ? 'Скрыть столбец' : 'Показать столбец'}
                onClick={(evt) => {
                  evt.stopPropagation();
                  toggleDraftColumnVisibility(columnId);
                }}
              >
                {isVisible ? <FaEye /> : <FaEyeSlash />}
              </button>
            </span>
          }
          {isColumnWidthMode &&
            <span className="allOrders-columnHeaderControls">
              <span
                role="separator"
                aria-orientation="vertical"
                className="allOrders-columnResizeHandle"
                title="Изменить ширину столбца"
                onMouseDown={(evt) => startColumnResize(columnId, evt)}
              />
            </span>
          }
        </span>
      </th>
    );
  };

  const statusFilterLabel = statusFilters.length === 0
    ? 'Все'
    : statusFilters.length === 1
      ? statusFilters[0]
      : String(statusFilters.length);
  const isFilterValueActive = (value) => String(value || '').trim() !== '';
  const activeFilterClass = (isActive) => isActive ? ' allOrders-filterActive' : '';
  const isDateFilterActive = isFilterValueActive(dateFromFilter) || isFilterValueActive(dateToFilter);

  const toggleStatusFilter = (status) => {
    setStatusFilters((currentStatuses) => {
      if (currentStatuses.includes(status)) {
        return currentStatuses.filter((item) => item !== status);
      }
      return [...currentStatuses, status];
    });
    reload(!state);
  };

  const clearTypeaheadFilter = (setFilter, typeaheadRef) => {
    setFilter('');
    typeaheadRef.current?.clear();
    reload(!state);
  };

  return (
    <>
      <Stack direction='horizontal' gap={2} className='allOrders-toolbar'>
        <div className='allOrders-controls-row'>
          <Button
            variant="success"
            className='allOrders-newOrderBtn'
            onClick={() => navigate('/neworder')}
          >
            Новая заявка
          </Button>
          {isPhone &&
            <Button
              variant="outline-secondary"
              className="allOrders-mobileFiltersToggle"
              aria-label={mobileFiltersExpanded ? 'Свернуть фильтры' : 'Развернуть фильтры'}
              aria-expanded={mobileFiltersExpanded}
              onClick={() => setMobileFiltersExpanded((expanded) => !expanded)}
            >
              <span>Фильтры</span>
              {mobileFiltersExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </Button>
          }
        </div>

        <div className={`allOrders-textFilters ${isPhone && !mobileFiltersExpanded ? 'allOrders-textFiltersCollapsed' : ''}`}>
          {isPhone &&
            <div className='allOrders-mobileFilterActions'>
              <FormLabel className='allOrders-switches-row noselect clickable mb-0'>
                <Stack direction='horizontal' gap={2} className={emptyBuyerHFilter ? 'allOrders-filterSwitchActive' : ''}>
                  <Form.Check
                    className='noselect'
                    checked={emptyBuyerHFilter}
                    onChange={(evt) => {
                      setEmptyBuyerHFilter(evt.target.checked);
                      reload(!state);
                    }}
                    type="switch"
                  />
                  Фильтр <FaPeopleArrows style={{ color: 'rgba(16, 188, 45, 0.79)' }} />
                </Stack>
              </FormLabel>
              <Button
                variant="outline-secondary"
                className="allOrders-resetFiltersBtn allOrders-mobileResetFiltersBtn"
                onClick={resetFilters}
              >
                Сброс
              </Button>
            </div>
          }
          {!isPhone &&
            <div className='allOrders-switches-row allOrders-filterSwitchDesktop'>
              <FormLabel className='noselect clickable mb-0'>
                <Stack direction='horizontal' gap={2} className={emptyBuyerHFilter ? 'allOrders-filterSwitchActive' : ''}>
                  <Form.Check
                    className='noselect'
                    checked={emptyBuyerHFilter}
                    onChange={(evt) => {
                      setEmptyBuyerHFilter(evt.target.checked);
                      reload(!state);
                    }}
                    type="switch"
                  />
                  Фильтр <FaPeopleArrows style={{ color: 'rgba(16, 188, 45, 0.79)' }} />
                </Stack>
              </FormLabel>
            </div>
          }
          <Dropdown className={`allOrders-statusFilter allOrders-filterWithLabel${activeFilterClass(statusFilters.length > 0)}`} autoClose="outside">
            <span className="allOrders-filterInlineLabel">Статус</span>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="allOrders-statusFilterToggle allOrders-filterLabeledControl"
              style={{ fontSize: window.innerWidth < 850 ? '12px' : '14px' }}
            >
              {statusFilterLabel}
            </Dropdown.Toggle>
            <Dropdown.Menu className="allOrders-statusFilterMenu">
              <Form.Check
                type="checkbox"
                id="allorders-status-filter-all"
                className="allOrders-statusFilterOption"
                label="Все"
                checked={statusFilters.length === 0}
                onChange={() => {
                  setStatusFilters([]);
                  reload(!state);
                }}
              />
              {ORDER_STATUS_OPTIONS.map((status) => (
                <Form.Check
                  key={status}
                  type="checkbox"
                  id={`allorders-status-filter-${status}`}
                  className="allOrders-statusFilterOption"
                  label={status}
                  checked={statusFilters.includes(status)}
                  onChange={() => toggleStatusFilter(status)}
                />
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <div className={`allOrders-ttnStatusFilter allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(ttnStatusFilter))}`}>
            <span className="allOrders-filterInlineLabel">ТТН</span>
            <Form.Select
              className="allOrders-filterLabeledControl"
              value={ttnStatusFilter}
              onChange={(evt) => {
                setTtnStatusFilter(evt.target.value);
                reload(!state);
              }}
              style={{ fontSize: window.innerWidth < 850 ? '12px' : '14px' }}
            >
              <option value="">Все</option>
              {ORDER_TTN_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </Form.Select>
          </div>
          <div className={`allOrders-orderNumberFilter allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(orderNumberFilter))}`}>
            <span className="allOrders-filterInlineLabel">№ заявки</span>
            <Form.Control
              className="allOrders-filterLabeledControl"
              type="text"
              inputMode="numeric"
              aria-label="Фильтр по номеру заявки"
              value={orderNumberFilter}
              onChange={(evt) => {
                setOrderNumberFilter(evt.target.value);
                reload(!state);
              }}
              style={{ fontSize: window.innerWidth < 850 ? '12px' : '14px' }}
            />
          </div>
          <div className={`allOrders-clientPaidFilter allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(clientPaidFilter))}`}>
            <span className="allOrders-filterInlineLabel">Оплата</span>
            <Form.Select
              className="allOrders-filterLabeledControl"
              value={clientPaidFilter}
              onChange={(evt) => {
                setClientPaidFilter(evt.target.value);
                reload(!state);
              }}
              style={{ fontSize: window.innerWidth < 850 ? '12px' : '14px' }}
            >
              <option value="">Все</option>
              <option value="Да">Да</option>
              <option value="Нет">Нет</option>
            </Form.Select>
          </div>
          <div className={`allOrders-salaryIncludedFilter allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(salaryIncludedFilter))}`}>
            <span className="allOrders-filterInlineLabel">ЗП</span>
            <Form.Select
              className="allOrders-filterLabeledControl"
              value={salaryIncludedFilter}
              onChange={(evt) => {
                setSalaryIncludedFilter(evt.target.value);
                reload(!state);
              }}
              style={{ fontSize: window.innerWidth < 850 ? '12px' : '14px' }}
            >
              <option value="">Все</option>
              <option value="Да">Да</option>
              <option value="Нет">Нет</option>
            </Form.Select>
          </div>
          <div className={`allOrders-filterTypeahead allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(managerFilter))}`}>
            <span className="allOrders-filterInlineLabel">Менеджер</span>
            <Typeahead
              id="allorders-manager-filter"
              ref={managerTypeaheadRef}
              options={managerOptions}
              className="allOrders-filterTypeaheadControl"
              selected={managerFilter ? [managerFilter] : []}
              onChange={(selected) => {
                const v = selected.length ? String(selected[0]) : '';
                setManagerFilter(v);
                reload(!state);
              }}
              onInputChange={(text) => {
                setManagerFilter(text);
              }}
              placeholder=""
              highlightOnlyResult
              inputProps={{ type: 'text', style: { fontSize: window.innerWidth < 850 ? '12px' : '14px' } }}
            />
            {isFilterValueActive(managerFilter) &&
              <button
                type="button"
                className="allOrders-typeaheadClearBtn"
                aria-label="Очистить фильтр Менеджер"
                title="Очистить"
                onMouseDown={(evt) => evt.preventDefault()}
                onClick={() => clearTypeaheadFilter(setManagerFilter, managerTypeaheadRef)}
              >
                <FaXmark />
              </button>
            }
          </div>
          <div className={`allOrders-filterTypeahead allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(supplierFilter))}`}>
            <span className="allOrders-filterInlineLabel">Поставщик</span>
            <Typeahead
              id="allorders-supplier-filter"
              ref={supplierTypeaheadRef}
              options={supplierOptions}
              className="allOrders-filterTypeaheadControl"
              selected={supplierFilter ? [supplierFilter] : []}
              onChange={(selected) => {
                const v = selected.length ? String(selected[0]) : '';
                setSupplierFilter(v);
                reload(!state);
              }}
              onInputChange={(text) => {
                setSupplierFilter(text);
              }}
              placeholder=""
              highlightOnlyResult
              inputProps={{ type: 'text', style: { fontSize: window.innerWidth < 850 ? '12px' : '14px' } }}
            />
            {isFilterValueActive(supplierFilter) &&
              <button
                type="button"
                className="allOrders-typeaheadClearBtn"
                aria-label="Очистить фильтр Поставщик"
                title="Очистить"
                onMouseDown={(evt) => evt.preventDefault()}
                onClick={() => clearTypeaheadFilter(setSupplierFilter, supplierTypeaheadRef)}
              >
                <FaXmark />
              </button>
            }
          </div>
          <div className={`allOrders-filterTypeahead allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(buyerFilter))}`}>
            <span className="allOrders-filterInlineLabel">Покупатель</span>
            <Typeahead
              id="allorders-buyer-filter"
              ref={buyerTypeaheadRef}
              options={buyerOptions}
              className="allOrders-filterTypeaheadControl"
              selected={buyerFilter ? [buyerFilter] : []}
              onChange={(selected) => {
                const v = selected.length ? String(selected[0]) : '';
                setBuyerFilter(v);
                reload(!state);
              }}
              onInputChange={(text) => {
                setBuyerFilter(text);
              }}
              placeholder=""
              highlightOnlyResult
              inputProps={{ type: 'text', style: { fontSize: window.innerWidth < 850 ? '12px' : '14px' } }}
            />
            {isFilterValueActive(buyerFilter) &&
              <button
                type="button"
                className="allOrders-typeaheadClearBtn"
                aria-label="Очистить фильтр Покупатель"
                title="Очистить"
                onMouseDown={(evt) => evt.preventDefault()}
                onClick={() => clearTypeaheadFilter(setBuyerFilter, buyerTypeaheadRef)}
              >
                <FaXmark />
              </button>
            }
          </div>
          <div className={`allOrders-dateRangeFilter${activeFilterClass(isDateFilterActive)}`}>
            <div className={`allOrders-dateTypeFilter allOrders-filterWithLabel${activeFilterClass(isDateFilterActive)}`}>
              <span className="allOrders-filterInlineLabel">Дата</span>
              <Form.Select
                className="allOrders-filterLabeledControl"
                aria-label="Выбор даты для фильтра"
                title="Выбор даты для фильтра"
                value={dateFilterType}
                onChange={(evt) => {
                  setDateFilterType(evt.target.value);
                  reload(!state);
                }}
              >
                {DATE_FILTER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
            </div>
            <div className={`allOrders-dateInputFilter allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(dateFromFilter))}`}>
              <span className="allOrders-filterInlineLabel">Дата с</span>
              <Form.Control
                className="allOrders-filterLabeledControl"
                type="date"
                aria-label="Дата с"
                title="Дата с"
                value={dateFromFilter}
                onChange={(evt) => {
                  setDateFromFilter(evt.target.value);
                  reload(!state);
                }}
                style={{ fontSize: window.innerWidth < 850 ? '12px' : '14px' }}
              />
            </div>
            <div className={`allOrders-dateInputFilter allOrders-filterWithLabel${activeFilterClass(isFilterValueActive(dateToFilter))}`}>
              <span className="allOrders-filterInlineLabel">Дата по</span>
              <Form.Control
                className="allOrders-filterLabeledControl"
                type="date"
                aria-label="Дата по"
                title="Дата по"
                value={dateToFilter}
                onChange={(evt) => {
                  setDateToFilter(evt.target.value);
                  reload(!state);
                }}
                style={{ fontSize: window.innerWidth < 850 ? '12px' : '14px' }}
              />
            </div>
          </div>
        </div>
        {!isPhone &&
          <div className="allOrders-toolbarActions">
            <Button
              variant="outline-secondary"
              className="allOrders-resetFiltersBtn"
              onClick={resetFilters}
            >
              Сброс
            </Button>
            <Button
              variant="outline-secondary"
              className={`allOrders-settingsBtn ${columnSettingsMode ? 'allOrders-settingsBtnActive' : ''}`}
              title="Настройки столбцов"
              aria-label="Настройки столбцов"
              aria-expanded={columnSettingsMenuOpen}
              aria-pressed={!!columnSettingsMode}
              onClick={() => setColumnSettingsMenuOpen((opened) => !opened)}
            >
              <FaGear />
            </Button>
            {columnSettingsMenuOpen &&
              <div className="allOrders-settingsMenu">
                <button
                  type="button"
                  className={`allOrders-settingsMenuItem ${isColumnVisibilityMode ? 'allOrders-settingsMenuItemActive' : ''}`}
                  onClick={() => openColumnSettingsMode('visibility')}
                >
                  Отображение столбцов
                </button>
                <button
                  type="button"
                  className={`allOrders-settingsMenuItem ${isColumnWidthMode ? 'allOrders-settingsMenuItemActive' : ''}`}
                  onClick={() => openColumnSettingsMode('width')}
                >
                  Ширина столбцов
                </button>
                {columnSettingsMode &&
                  <button
                    type="button"
                    className="allOrders-settingsMenuItem allOrders-settingsMenuItemSave"
                    onClick={exitColumnSettingsMode}
                  >
                    Сохранить и выйти
                  </button>
                }
              </div>
            }
          </div>
        }

      </Stack>
      {isPhone &&
        <div className='allOrdersCards noselect'>
          {filteredOrders.map((order) => {
            const emptyHSummas = emptyBuyerHSummasDisplay(order.orderjson.buyers);
            const orderNumber = getOrderNumber(order);
            const orderStatus = getOrderStatus(order.orderjson);
            const orderTtnStatus = getOrderTtnStatus(order.orderjson);
            const orderClientPaid = getOrderClientPaid(order.orderjson);
            const orderStatusClass = getOrderStatusClass(orderStatus);
            const orderManager = getOrderManager(order.orderjson);
            const suppliersTons = suppliersTonsTotal(order.orderjson);
            const supplierProducts = supplierProductsDisplay(order.orderjson);
            const isLastActiveOrder = String(order.id) === String(lastActiveOrderId);
            const orderIndex = orders.findIndex((o) => o.id === order.id);
            const toggleRow = () => {
              rememberActiveOrder(order);
              if (orderIndex >= 0) showHideOrder(orderIndex);
            };
            return (
              <div key={order.id} className={`allOrders-card ${order.orderjson.haveEmptyBuyerH ? 'allOrders-card-warning' : ''} ${isLastActiveOrder ? 'allOrders-card-lastActive' : ''}`}>
                <div className='allOrders-card-header clickable' onClick={toggleRow}>
                  <div className='allOrders-card-idGroup'>
                    <span className={`allOrders-status-dot ${orderStatusClass}`} aria-label={orderStatus} />
                    <span className='allOrders-card-ttnStatus' title={`Статус ТТН: ${orderTtnStatus}`}>ТТН: {orderTtnStatus}</span>
                    <div className='allOrders-card-id'>Заявка №{orderNumber}</div>
                  </div>
                  <div className='allOrders-card-date'>{formatDate(order.orderjson.date)}</div>
                  <Stack direction="horizontal" gap={2} className="allOrders-card-actions">
                    <FaPrint title='Печать заявки' size='1.35em' className='clickable icon' style={{ color: 'rgba(47, 79, 112, 0.95)' }} onClick={(e) => {
                      e.stopPropagation();
                      rememberActiveOrder(order);
                      printOrder(order.id);
                    }} />
                    <BiEditAlt size='1.6em' className='clickable icon' style={{ color: 'rgba(1, 87, 248, 0.85)' }} onClick={(e) => {
                      e.stopPropagation();
                      rememberActiveOrder(order);
                      setEditingOrder(() => order.orderjson);
                      navigate("/editorder");
                    }} />
                    <MdDelete size='1.6em' className='clickable icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={(e) => {
                      e.stopPropagation();
                      setOrderForDelete({ id: order.id, orderNumber });
                      handleShowModal();
                    }} />
                  </Stack>
                </div>

                <div className='allOrders-card-body clickable' onClick={toggleRow}>
                  <div className='allOrders-card-summaryGrid'>
                    <div className='allOrders-card-row'>
                      <div className='allOrders-card-label'>Покупатели</div>
                      <div className='allOrders-card-value'>{spisok(order.orderjson.buyers) || '—'}</div>
                    </div>
                    <div className='allOrders-card-row'>
                      <div className='allOrders-card-label'>Оплачено клиентом</div>
                      <div className='allOrders-card-value'>{orderClientPaid}</div>
                    </div>
                    <div className='allOrders-card-row'>
                      <div className='allOrders-card-label'>Поставщики</div>
                      <div className='allOrders-card-value'>{spisok(order.orderjson.suppliers) || '—'}</div>
                    </div>
                    <div className='allOrders-card-row allOrders-card-row-full'>
                      <div className='allOrders-card-label'>Менеджер</div>
                      <div className='allOrders-card-value'>{orderManager || '—'}</div>
                    </div>
                    <div className='allOrders-card-row allOrders-card-row-full'>
                      <div className='allOrders-card-label'>Дата загрузки</div>
                      <div className='allOrders-card-value'>{formatDate(order.orderjson.loadingDate)}</div>
                    </div>
                    <div className='allOrders-card-row allOrders-card-row-full'>
                      <div className='allOrders-card-label'>Тонны поставщиков</div>
                      <div className='allOrders-card-value'>{NumberFormat(suppliersTons) || '—'}</div>
                    </div>
                    <div className='allOrders-card-row allOrders-card-row-full'>
                      <div className='allOrders-card-label'>Вид продукта</div>
                      <div className='allOrders-card-value'>{supplierProducts || '—'}</div>
                    </div>
                    {emptyHSummas !== '' &&
                      <div className='allOrders-card-row allOrders-card-row-full'>
                        <div className='allOrders-card-label'>Суммы "H"</div>
                        <div className='allOrders-card-value'>{emptyHSummas}</div>
                      </div>
                    }
                  </div>
                </div>

                <Collapse in={order.open}>
                  <div className='allOrders-card-details'>
                    <div className='allOrders-card-section'>
                      <div className='allOrders-card-section-title'>Поставщики</div>
                      {order.orderjson.suppliers.map((supplier, supplierIndex) => (
                        <div className='allOrders-card-item' key={`sup-${order.id}-${supplierIndex}`}>
                          <div className='allOrders-card-item-title'>{supplier.name || 'Без имени'}</div>
                          <div className='allOrders-card-item-line'>{supplier.typeOfProduct || 'Без типа продукта'}</div>
                          <div className='allOrders-card-item-line'>
                            Л: {NumberFormat(supplier.liters) || '—'} | Т: {NumberFormat(supplier.tons) || '—'} | Цена: {NumberFormat(supplier.price) || '—'}
                          </div>
                          {user.rights.finBlockAccess &&
                            <div className='allOrders-card-item-line'>
                              С/Ф: {supplier.sf || '—'} | Сумма: {NumberFormat(supplier.summa) || '—'} | Акт: {supplier.akt || '—'}
                            </div>
                          }
                          {supplierIndex === 0 &&
                            <div className='allOrders-card-item-line allOrders-card-delivery'>
                              ИП: {order.orderjson.ip || '—'} | Водитель: {order.orderjson.driver || '—'} | Доставка: {NumberFormat(order.orderjson.cost) || '—'} | ОТК: {order.orderjson.otk || '—'}
                            </div>
                          }
                        </div>
                      ))}
                    </div>

                    <div className='allOrders-card-section'>
                      <div className='allOrders-card-section-title'>Покупатели</div>
                      {order.orderjson.buyers.map((buyer, buyerIndex) => (
                        <div className='allOrders-card-item' key={`buy-${order.id}-${buyerIndex}`}>
                          <div className='allOrders-card-item-title'>{buyer.name || 'Без имени'}</div>
                          <div className='allOrders-card-item-line'>Тип: {buyer.typeOfProduct || '—'} | Менеджер: {buyer.manager || '—'}</div>
                          <div className='allOrders-card-item-line'>
                            Л: {NumberFormat(buyer.liters) || '—'} | Т: {NumberFormat(buyer.tons) || '—'} | Цена: {NumberFormat(buyer.price) || '—'}
                          </div>
                          {user.rights.finBlockAccess &&
                            <div className='allOrders-card-item-line'>
                              С/Ф: {buyer.sf || '—'} | Сумма: {NumberFormat(buyer.summa) || '—'} | Акт: {buyer.akt || '—'}
                            </div>
                          }
                          {buyer.buyersH?.map((buyerH, indexBuyerH) => (
                            <div className='allOrders-card-subitem' key={`bh-${order.id}-${buyerIndex}-${indexBuyerH}`}>
                              <div className='allOrders-card-item-line'>
                                H: {buyerH.name || 'Без имени'} | {buyerH.typeOfProduct || 'Без типа'}
                              </div>
                              <div className='allOrders-card-item-line'>
                                Л: {NumberFormat(buyerH.liters) || '—'} | Т: {NumberFormat(buyerH.tons) || '—'} | Цена: {NumberFormat(buyerH.price) || '—'}
                              </div>
                              {user.rights.finBlockAccess &&
                                <div className='allOrders-card-item-line'>
                                  С/Ф: {buyerH.sf || '—'} | Сумма: {NumberFormat(buyerH.summa) || '—'} | Акт: {buyerH.akt || '—'}
                                </div>
                              }
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {order.orderjson.comments &&
                      <Form.Control className='allOrders-card-comments' as="textarea" rows={3} disabled type='number' defaultValue={order.orderjson.comments} />
                    }
                  </div>
                </Collapse>
              </div>
            );
          })}
        </div>
      }
      {!isPhone &&
      <div className='allOrdersTable noselect'>
        <Table
          ref={tableRef}
          className={`allOrders-main-table ${isPhone ? 'allOrders-main-table-compact' : ''}`}
          striped
          bordered
          hover
          style={{ width: '100%', margin: 0 }}
        >
          <colgroup>
            {ALL_ORDERS_COLUMNS.map((column) => (
              isColumnRendered(column.id) && <col key={column.id} className={column.colClass} style={{ width: `${getColumnWidth(column.id)}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {isColumnRendered('realizationDate') && renderColumnHeader('realizationDate', <>Дата<br />реализации</>, { className: 'allOrders-head-realization-date' })}
              {isColumnRendered('orderNumber') && renderColumnHeader('orderNumber', '№ Заявки', { className: 'allOrders-head-num', style: { textAlign: 'center' } })}
              {isColumnRendered('status') && renderColumnHeader('status', 'Статус', { className: 'allOrders-head-status' })}
              {isColumnRendered('ttnStatus') && renderColumnHeader('ttnStatus', 'ТТН', { className: 'allOrders-head-ttn-status', title: 'Статус ТТН' })}
              {isColumnRendered('suppliers') && renderColumnHeader('suppliers', 'Поставщики', { className: 'allOrders-head-suppliers' })}
              {isColumnRendered('loadingDate') && renderColumnHeader('loadingDate', <>Дата<br />загрузки</>, { className: 'allOrders-head-loading-date' })}
              {isColumnRendered('products') && renderColumnHeader('products', 'Вид продукта', { className: 'allOrders-head-products' })}
              {isColumnRendered('tons') && renderColumnHeader('tons', 'Тонны', { className: 'allOrders-head-tons' })}
              {isColumnRendered('buyers') && renderColumnHeader('buyers', 'Покупатели', { className: 'allOrders-head-buyers' })}
              {isColumnRendered('clientPaid') && renderColumnHeader('clientPaid', 'Оплачено клиентом', { className: 'allOrders-head-client-paid' })}
              {isColumnRendered('hsum') && renderColumnHeader('hsum', 'Суммы H', { className: 'allOrders-head-hsum', title: 'Суммы подпокупателей (buyerH) без заполненного имени' })}
              {isColumnRendered('invoiceSent') && renderColumnHeader('invoiceSent', 'Счет отправлен', { className: 'allOrders-head-invoice-sent' })}
              {isColumnRendered('reconciliationAct') && renderColumnHeader('reconciliationAct', 'Акт сверки', { className: 'allOrders-head-reconciliation-act' })}
              {isColumnRendered('salaryIncluded') && renderColumnHeader('salaryIncluded', 'ЗП', { className: 'allOrders-head-salary-included' })}
              {isColumnRendered('manager') && renderColumnHeader('manager', 'Менеджер', { className: 'allOrders-head-manager' })}
              {isColumnRendered('createdDate') && renderColumnHeader('createdDate', <>Дата<br />создания</>, { className: 'allOrders-head-created-date' })}
              {isColumnRendered('menu') && renderColumnHeader('menu', 'Меню', { className: 'allOrders-th-menu' })}
            </tr>
          </thead>
          <tbody>
        {
          filteredOrders.map((order) => {
            const emptyHSummas = emptyBuyerHSummasDisplay(order.orderjson.buyers);
            const orderNumber = getOrderNumber(order);
            const orderStatus = getOrderStatus(order.orderjson);
            const orderTtnStatus = getOrderTtnStatus(order.orderjson);
            const orderClientPaid = getOrderClientPaid(order.orderjson);
            const orderSalaryIncluded = getOrderSalaryIncluded(order.orderjson);
            const orderInvoiceSent = getOrderInvoiceSent(order.orderjson);
            const orderReconciliationAct = getOrderReconciliationAct(order.orderjson);
            const orderStatusClass = getOrderStatusClass(orderStatus);
            const orderManager = getOrderManager(order.orderjson);
            const suppliersTons = suppliersTonsTotal(order.orderjson);
            const supplierProducts = supplierProductsDisplay(order.orderjson);
            const isLastActiveOrder = String(order.id) === String(lastActiveOrderId);
            const orderIndex = orders.findIndex((o) => o.id === order.id);
            const toggleRow = () => {
              rememberActiveOrder(order);
              if (orderIndex >= 0) showHideOrder(orderIndex);
            };
            return (
              <Fragment key={order.id}>
                <tr
                  id={`order-${order.id}`}
                  className={`colorborder clickable ${isLastActiveOrder ? 'allOrders-row-lastActive' : ''}`}
                  onClick={toggleRow}
                  onDoubleClick={() => {
                    toggleRow();
                    setEditingOrder(() => order.orderjson);
                    navigate("/editorder");
                  }}
                >
                      {isColumnRendered('realizationDate') &&
                        <td className="allOrders-cell-realization-date" style={{ overflow: "hidden", backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }} >{formatDate(order.orderjson.shipmentDate)}</td>
                      }
                      {isColumnRendered('orderNumber') &&
                        <td className="allOrders-cell-num" style={{ overflow: "hidden", textAlign: 'center', backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>{orderNumber}</td>
                      }
                      {isColumnRendered('status') &&
                        <td className="allOrders-cell-status" data-status={orderStatus} aria-label={orderStatus} style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          <span className={`allOrders-status-dot ${orderStatusClass}`} />
                        </td>
                      }
                      {isColumnRendered('ttnStatus') &&
                        <td className="allOrders-cell-ttn-status" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }} title={`Статус ТТН: ${orderTtnStatus}`}>
                          {orderTtnStatus}
                        </td>
                      }
                      {isColumnRendered('suppliers') &&
                        <td className="allOrders-cell-suppliers" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          {spisok(order.orderjson.suppliers)}
                        </td>
                      }
                      {isColumnRendered('loadingDate') &&
                        <td className="allOrders-cell-loading-date" style={{ overflow: "hidden", backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }} >{formatDate(order.orderjson.loadingDate)}</td>
                      }
                      {isColumnRendered('products') &&
                        <td className="allOrders-cell-products" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          {supplierProducts}
                        </td>
                      }
                      {isColumnRendered('tons') &&
                        <td className="allOrders-cell-tons" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          {NumberFormat(suppliersTons)}
                        </td>
                      }
                      {isColumnRendered('buyers') &&
                        <td className="allOrders-cell-buyers" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>{
                          <Stack direction="horizontal" gap={3} className="allOrders-buyers-stack" >
                            {
                              order.orderjson.haveEmptyBuyerH && < FaPeopleArrows style={{ color: 'rgba(16, 188, 45, 0.79)' }} />
                            }
                            {
                              spisok(order.orderjson.buyers)
                            }
                          </Stack>
                        }</td>
                      }
                      {isColumnRendered('clientPaid') &&
                        <td className="allOrders-cell-client-paid" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          {orderClientPaid}
                        </td>
                      }
                      {isColumnRendered('hsum') &&
                        <td className="allOrders-cell-hsum" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '', overflow: 'hidden', fontSize: '0.9em' }} title={emptyHSummas}>
                          {emptyHSummas}
                        </td>
                      }
                      {isColumnRendered('invoiceSent') &&
                        <td className="allOrders-cell-invoice-sent" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          {orderInvoiceSent}
                        </td>
                      }
                      {isColumnRendered('reconciliationAct') &&
                        <td className="allOrders-cell-reconciliation-act" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          {orderReconciliationAct}
                        </td>
                      }
                      {isColumnRendered('salaryIncluded') &&
                        <td className="allOrders-cell-salary-included" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          {orderSalaryIncluded}
                        </td>
                      }
                      {isColumnRendered('manager') &&
                        <td className="allOrders-cell-manager" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>{orderManager}</td>
                      }
                      {isColumnRendered('createdDate') &&
                        <td className="allOrders-cell-created-date" style={{ overflow: "hidden", backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }} >{formatDate(order.orderjson.date)}</td>
                      }
                      {isColumnRendered('menu') &&
                        <td className="allOrders-td-menu" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                          <Stack direction="horizontal" gap={2} className="allOrders-menu-stack">
                            <FaPrint title='Печать заявки' size='1.3em' className='clickable icon' style={{ color: 'rgba(47, 79, 112, 0.95)' }} onClick={(e) => {
                              e.stopPropagation();
                              rememberActiveOrder(order);
                              printOrder(order.id);
                            }} />
                            <div className="vr" />
                            <BiEditAlt size='1.7em' className='clickable icon' style={{ color: 'rgba(1, 87, 248, 0.85)' }} onClick={(e) => {
                              e.stopPropagation();
                              rememberActiveOrder(order);
                              if (orderIndex >= 0) showHideOrder(orderIndex);
                              setEditingOrder(() => order.orderjson);
                              navigate("/editorder");
                            }} />
                            <div className="vr" />
                            <MdDelete size='1.7em' className='clickable icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={(e) => {
                              e.stopPropagation();
                              if (orderIndex >= 0) showHideOrder(orderIndex)
                              setOrderForDelete({ id: order.id, orderNumber });
                              handleShowModal();
                            }} />


                          </Stack>
                        </td>
                      }

                </tr>
                <tr className="allOrders-expand-row">
                  <td colSpan={visibleColumnCount} className="p-0 border-top-0">
                <Collapse in={order.open}>

                  <div className='mb-3'>
                    <Table className='mb-0' striped bordered hover size={size} responsive="sm">
                      <thead>
                        <tr >
                          <th width='10%' >Поставщик </th>
                          <th width='10%' >Вид продукта</th>
                          <th width='5%' >Литры</th>
                          <th width='5%' >Тонны</th>
                          <th width='5%' >Цена</th>
                          <th className='text-center' width='10%' >Перевозчик</th>
                          <th className='text-center' width='10%' >Водитель</th>
                          <th className='text-center' width='10%' >Сумма доставки</th>
                          <th className='text-center' width='4%' >ОТК</th>
                          {user.rights.finBlockAccess &&
                            <>
                              <th width='6%' style={{ display: display }}>С/Ф</th>
                              <th width='6%' style={{ display: display }}>Дата СФ</th>
                              <th width='6%' style={{ display: display }}>Сумма</th>
                              <th width='6%' style={{ display: display }}>Акт транспорт</th>
                            </>
                          }

                        </tr>
                      </thead>
                      <tbody>
                        {order.orderjson.suppliers.map((supplier, supplierIndex) => {
                          return (
                            <tr key={supplierIndex}>
                              <td >
                                <Stack gap={1} direction='horizontal' >
                                  {supplier.name}
                                </Stack>
                              </td>
                              <td >{supplier.typeOfProduct}</td>
                              <td >{NumberFormat(supplier.liters)}</td>
                              <td >{NumberFormat(supplier.tons)}</td>
                              <td >{NumberFormat(supplier.price)}</td>
                              {(supplierIndex === 0) &&
                                <>
                                  <td className='align-middle text-center' rowSpan={order.orderjson.suppliers.length}>{order.orderjson.ip}</td>
                                  <td className='align-middle text-center' rowSpan={order.orderjson.suppliers.length}>{order.orderjson.driver}</td>
                                  <td className='align-middle text-center' rowSpan={order.orderjson.suppliers.length}>{order.orderjson.cost}</td>
                                  <td className='align-middle text-center' rowSpan={order.orderjson.suppliers.length}>{order.orderjson.otk}</td>
                                </>
                              }
                              {user.rights.finBlockAccess &&
                                <>
                                  <td style={{ display: display }}>
                                    <Stack gap={1} direction='horizontal'>
                                      {supplier.sf}
                                      {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, supplierIndex, 'suppliers') }} /> */}
                                    </Stack>
                                  </td>
                                  <td style={{ display: display }}>{supplier.date}</td>
                                  <td style={{ display: display }}>{NumberFormat(supplier.summa)}</td>
                                  <td style={{ display: display }}>{supplier.akt}</td>
                                </>
                              }
                            </tr>
                          )
                        })}
                      </tbody>
                      <thead>
                        <tr>
                          <th colSpan='5'>Покупатель </th>
                          <th colSpan='4'>Менеджер</th>

                          {user.rights.finBlockAccess && <th style={{ display: display }} colSpan={4}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {order.orderjson.buyers.map((buyer, buyerIndex) => {
                          return (
                            <>
                              <tr key={buyerIndex} >
                                <td>
                                  <Stack gap={1} direction='horizontal'>
                                    {buyer.name}
                                    {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditBuyer(num, order.id, buyerIndex) }} /> */}
                                    {/* <Button size="sm" variant="warning" >н</Button> */}
                                  </Stack>
                                </td>
                                <td >{buyer.typeOfProduct}</td>
                                <td >{NumberFormat(buyer.liters)}</td>
                                <td >{NumberFormat(buyer.tons)}</td>
                                <td >{NumberFormat(buyer.price)}</td>
                                <td colSpan='4' >{buyer.manager}</td>

                                {user.rights.finBlockAccess &&
                                  <>
                                    <td style={{ display: display }}>
                                      <Stack gap={1} direction='horizontal'>
                                        {buyer.sf}
                                        {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, buyerIndex, 'buyers') }} /> */}
                                      </Stack>
                                    </td>
                                    <td style={{ display: display }}>{buyer.date}</td>
                                    <td style={{ display: display }}>{NumberFormat(buyer.summa)}</td>
                                    <td style={{ display: display }}>{buyer.akt}</td>
                                  </>
                                }
                              </tr>






                              {
                                buyer.buyersH && buyer.buyersH.map((buyerH, indexBuyerH) => {
                                  return (
                                    <tr key={indexBuyerH} >
                                      <td style={{ backgroundColor: bgColorH }}>
                                        <Stack gap={1} direction='horizontal'>
                                          {buyerH.name}
                                          {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditBuyer(num, order.id, buyerIndex) }} /> */}
                                          {/* <Button size="sm" variant="warning" >н</Button> */}
                                        </Stack>
                                      </td>
                                      <td style={{ backgroundColor: bgColorH }}>{buyerH.typeOfProduct}</td>
                                      <td style={{ backgroundColor: bgColorH }}>{NumberFormat(buyerH.liters)}</td>
                                      <td style={{ backgroundColor: bgColorH }}>{NumberFormat(buyerH.tons)}</td>
                                      <td style={{ backgroundColor: bgColorH }}>{NumberFormat(buyerH.price)}</td>
                                      <td style={{ backgroundColor: bgColorH }} colSpan='4' >{buyerH.manager}</td>

                                      {user.rights.finBlockAccess &&
                                        <>
                                          <td style={{ backgroundColor: bgColorH, display: display }}>
                                            <Stack gap={1} direction='horizontal'>
                                              {buyerH.sf}
                                              {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, buyerIndex, 'buyers') }} /> */}
                                            </Stack>
                                          </td>
                                          <td style={{ backgroundColor: bgColorH, display: display }}>{buyerH.date}</td>
                                          <td style={{ backgroundColor: bgColorH, display: display }}>{NumberFormat(buyerH.summa)}</td>
                                          <td style={{ backgroundColor: bgColorH, display: display }}>{buyerH.akt}</td>
                                        </>
                                      }
                                    </tr>
                                  )
                                }
                                )}











                            </>
                          )

                        })}
                      </tbody>
                    </Table>
                    {order.orderjson.comments &&
                      <Form.Control as="textarea" rows={4} disabled type='number' defaultValue={order.orderjson.comments} />
                    }

                  </div>
                </Collapse >
                  </td>
                </tr>
              </Fragment>
            );
          })}
          </tbody>
        </Table>
      </div >
      }

      <Modal centered show={show} onHide={handleCloseModal}
        animation={true} >
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления заявки № {orderForDelete?.orderNumber || ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>Точно удаляем?</Modal.Body>
        <Modal.Footer>

          <Button variant="secondary" onClick={handleCloseModal}>
            Еще подумаю
          </Button>
          <Button variant="primary" className='col-3' onClick={handleDeleteConfirmed}>
            Да
          </Button>

        </Modal.Footer>
      </Modal>
    </>
  );
}


export default AllOrders;
