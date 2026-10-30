import OrderTable from './OrderTable';
import EditOrderMobile from './EditOrderMobile';
import './NewOrder.css';
import './EditOrder.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useState, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Modal, Table } from 'react-bootstrap';
import { userContext } from './App';
import { useNavigate } from 'react-router-dom';
import { syncOrderSelectLists } from './selectListsSync';
import OtkFields, { getOrderOtkForSave, getOrderOtkTax } from './OtkFields';
import OrderExtraFields from './OrderExtraFields';
import OrderPaymentDates from './OrderPaymentDates';
import OrderDeliveryFields from './OrderDeliveryFields';
import { getManagerOptions } from './managerOptions';
import { createEmptyOrder, emptyOrderRow } from './orderDefaults';
import { ORDER_STATUS_OPTIONS, getAvailableOrderStatusOptions, normalizeOrderStatus } from './orderStatus';
import { ORDER_TTN_STATUS_OPTIONS, normalizeOrderTtnStatus } from './orderTtnStatus';
import { ORDER_SPECIFICATION_STATUS_OPTIONS, normalizeOrderSpecificationStatus } from './orderSpecificationStatus';
import { FaArrowsRotate, FaPrint } from 'react-icons/fa6';
import useOrderEditSession from './useOrderEditSession';
import { receiveOrderLock, comparableOrder, withSaveDeadline, leasePhase } from './orderEditSession';

const HISTORY_FIELD_LABELS = {
  orderNumber: '№ заявки',
  order_number: '№ заявки',
  orderStatus: 'Статус заявки',
  ttnStatus: 'Статус ТТН',
  specificationStatus: 'Спецификация',
  clientPaid: 'Оплачено клиент',
  salaryIncluded: 'Учтено в ЗП',
  invoiceSent: 'Счет отправлен',
  reconciliationAct: 'Акт сверки',
  manager: 'Менеджер',
  date: 'Дата заявки',
  ip: 'Условия поставки',
  carrier: 'Перевозчик',
  driver: 'Водитель',
  cost: 'Стоимость доставки',
  otk: 'ОТК',
  otkManual: 'ОТК (ручной ввод)',
  otkFormulaTon: 'ОТК формула (тонна)',
  otkFormulaPrice: 'ОТК формула (цена)',
  otkFormulaTotal: 'ОТК формула (итого)',
  courier: 'Курьер',
  shortage: 'Недостача',
  transWarehouse: 'Транспорт Склад',
  loadingPlace: 'Место загрузки',
  drainPlace: 'Место слива',
  storageTon: 'Хранение (тонна)',
  storagePrice: 'Хранение цена',
  storageTotal: 'Хранение итого',
  supplierPaymentDate: 'Дата оплаты поставщику',
  supplierPaymentDeferred: 'Отсрочка оплаты поставщику',
  loadingDate: 'Дата загрузки',
  loadingFromStorage: 'Загрузка с хранения',
  shipmentDate: 'Дата реализации',
  comments: 'Комментарии',
  name: 'наименование',
  typeOfProduct: 'вид продукта',
  liters: 'литры',
  tons: 'тонны',
  price: 'цена',
  sf: 'С/Ф',
  rowDate: 'Дата СФ',
  summa: 'сумма',
  akt: 'акт транспорт',
};

const LOCKED_ORDER_STATUSES = ['Заприходована', 'Реализована'];
const LOCKED_ORDER_MESSAGE = 'Заявка заприходована или реализована. Изменения доступны только бухгалтеру или администратору.';

function formatHistoryDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ru-RU');
}

function formatLastSaveInfo(item) {
  if (!item) return '';
  const actor = item.actor_name || item.actor_user_id || '—';
  const date = formatHistoryDateTime(item.created_at);
  return `${actor} - ${date}`;
}

function formatHistoryAction(action) {
  if (action === 'CREATE_ORDER') return 'Создание';
  if (action === 'UPDATE_ORDER') return 'Изменение';
  if (action === 'DELETE_ORDER') return 'Удаление';
  return action || '—';
}

function isBlankHistoryValue(value) {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  return text === '' || text === '""' || text === '∅' || text === 'null' || text === 'пусто';
}

function normalizeHistoryStatus(value) {
  const text = isBlankHistoryValue(value) ? 'Создана' : String(value).trim();
  if (text === 'Новая') return 'Создана';
  if (text === 'Приход внесен') return 'Заприходована';
  if (text === 'Заприходирована') return 'Заприходована';
  if (text === 'Машина загружена') return 'Заполнена';
  if (text === 'Выполнена реализация') return 'Реализована';
  return text;
}

function normalizeHistoryTtnStatus(value) {
  const text = isBlankHistoryValue(value) ? 'Х' : String(value).trim();
  if (text.startsWith('Х')) return 'Х';
  if (text.startsWith('О')) return 'О';
  if (text.startsWith('З')) return 'З';
  if (text.startsWith('Т')) return 'Т';
  return text;
}

function normalizeHistoryClientPaid(value) {
  return isBlankHistoryValue(value) ? 'Нет' : String(value).trim();
}

function normalizeHistoryYesNo(value) {
  return isBlankHistoryValue(value) ? 'Нет' : String(value).trim();
}

function normalizeHistoryComparable(field, value) {
  if (field === 'orderStatus' || field === 'Статус заявки') return normalizeHistoryStatus(value);
  if (field === 'ttnStatus' || field === 'Статус ТТН') return normalizeHistoryTtnStatus(value);
  if (field === 'clientPaid' || field === 'Оплачено клиент') return normalizeHistoryClientPaid(value);
  if (field === 'salaryIncluded' || field === 'Учтено в ЗП') return normalizeHistoryYesNo(value);
  if (field === 'invoiceSent' || field === 'Счет отправлен') return normalizeHistoryYesNo(value);
  if (field === 'reconciliationAct' || field === 'Акт сверки') return normalizeHistoryYesNo(value);

  if (field === 'orderNumber' || field === 'order_number' || field === '№ заявки') {
    const number = Number(String(value || '').replace(/\s/g, '').trim());
    return Number.isFinite(number) ? number : String(value || '').trim();
  }

  if (isBlankHistoryValue(value)) return '';
  return String(value).trim();
}

function formatHistoryValue(value) {
  if (isBlankHistoryValue(value)) return 'пусто';
  return String(value);
}

function getHistoryFieldLabel(field) {
  const buyerHMatch = String(field || '').match(/^buyers\[(\d+)]\.buyersH\[(\d+)]\.(.+)$/);
  if (buyerHMatch) {
    const buyerIndex = Number(buyerHMatch[1]) + 1;
    const buyerHIndex = Number(buyerHMatch[2]) + 1;
    const fieldLabel = buyerHMatch[3] === 'date'
      ? HISTORY_FIELD_LABELS.rowDate
      : HISTORY_FIELD_LABELS[buyerHMatch[3]] || buyerHMatch[3];
    return `Покупатель №${buyerIndex}, Н №${buyerHIndex}: ${fieldLabel}`;
  }

  const rowMatch = String(field || '').match(/^(suppliers|buyers)\[(\d+)]\.(.+)$/);
  if (rowMatch) {
    const sectionLabel = rowMatch[1] === 'suppliers' ? 'Поставщик' : 'Покупатель';
    const rowIndex = Number(rowMatch[2]) + 1;
    const fieldLabel = rowMatch[3] === 'date'
      ? HISTORY_FIELD_LABELS.rowDate
      : HISTORY_FIELD_LABELS[rowMatch[3]] || rowMatch[3];
    return `${sectionLabel} №${rowIndex}: ${fieldLabel}`;
  }

  return HISTORY_FIELD_LABELS[field] || field || 'Заявка';
}

function formatHistoryDetails(payload) {
  if (Array.isArray(payload?.changes)) {
    const lines = payload.changes
      .filter((change) =>
        normalizeHistoryComparable(change?.field, change?.before) !== normalizeHistoryComparable(change?.field, change?.after)
      )
      .map((change) =>
        `${getHistoryFieldLabel(change?.field)}: с ${formatHistoryValue(change?.before)} на ${formatHistoryValue(change?.after)}`
      );
    if (payload.truncated) {
      lines.push(`... и еще ${Math.max(0, (payload.totalChanges || 0) - (payload.shownChanges || 0))} изменений`);
    }
    return lines.length ? lines.join('\n') : '—';
  }

  if (!payload || typeof payload !== 'object') return '—';
  try {
    const text = JSON.stringify(payload, null, 2);
    return text === '{}' ? '—' : text;
  } catch (error) {
    return '—';
  }
}

function getVisibleHistoryChanges(payload) {
  if (!Array.isArray(payload?.changes)) return [];

  return payload.changes.filter((change) =>
    normalizeHistoryComparable(change?.field, change?.before) !== normalizeHistoryComparable(change?.field, change?.after)
  );
}

function renderHistoryDetails(payload) {
  const changes = getVisibleHistoryChanges(payload);
  if (changes.length > 0) {
    return (
      <div className='orderEditor-historyChanges'>
        {changes.map((change, index) => (
          <div className='orderEditor-historyChangeLine' key={`${change?.field || 'field'}-${index}`}>
            <span className='orderEditor-historyField'>{getHistoryFieldLabel(change?.field)}:</span>
            <span className='orderEditor-historyOldValue'>{formatHistoryValue(change?.before)}</span>
            <span className='orderEditor-historyArrow'>→</span>
            <span className='orderEditor-historyNewValue'>{formatHistoryValue(change?.after)}</span>
          </div>
        ))}
        {payload?.truncated && (
          <div className='orderEditor-historyMore'>
            ... и еще {Math.max(0, (payload.totalChanges || 0) - (payload.shownChanges || 0))} изменений
          </div>
        )}
      </div>
    );
  }

  return formatHistoryDetails(payload);
}

function getOrderStatusClass(status) {
  const normalizedStatus = normalizeOrderStatus(status);
  if (normalizedStatus === 'Отложенная') return 'editOrder-status-postponed';
  if (normalizedStatus === 'Заприходована') return 'editOrder-status-income';
  if (normalizedStatus === 'Заполнена') return 'editOrder-status-loaded';
  if (normalizedStatus === 'Реализована') return 'editOrder-status-done';
  return 'editOrder-status-created';
}

function getSpecificationStatusClass(status) {
  const normalizedStatus = normalizeOrderSpecificationStatus(status);
  if (normalizedStatus === 'Подписана') return 'editOrder-specification-signed';
  if (normalizedStatus === 'Отправлена') return 'editOrder-specification-sent';
  if (normalizedStatus === 'Требуется') return 'editOrder-specification-required';
  return 'editOrder-specification-not-required';
}

function hasEmptyBuyerH(order) {
  return (order.buyers || [])
    .some((buyer) => (buyer.buyersH || [])
      .some((buyerH) => String(buyerH?.name || '').trim() === ''));
}

function formatLockDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ru-RU');
}

function OrderEditor({ mode = 'new', order, setOrder }) {
  const isEditMode = mode === 'edit';
  const isNewMode = !isEditMode;
  const isPhone = window.innerWidth <= 480;
  const navigate = useNavigate();
  const {
    user,
    setUser,
    setToast,
    aAxios,
    editingOrder,
    setEditingOrder,
    orderEditLock,
    setOrderEditLock,
    orderTimerTarget,
  } = useContext(userContext);
  const releasedLockRef = useRef(false);
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoClosing, setAutoClosing] = useState(false);
  const autoFinishStartedRef = useRef(false);
  const latestSaveRef = useRef(null);
  const [formRevision, setFormRevision] = useState(0);
  const [message, setMessage] = useState('');
  const [alertVariant] = useState('');
  const [historyShow, setHistoryShow] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastSaveInfo, setLastSaveInfo] = useState('');

  const activeOrder = isEditMode ? editingOrder : order;
  const setActiveOrder = isEditMode ? setEditingOrder : setOrder;
  const orderStatus = normalizeOrderStatus(activeOrder?.orderStatus);
  const hasPrivilegedOrderEditAccess = !!(user?.rights?.finBlockAccess || user?.rights?.adminAccess);
  const isOrderLockedForCurrentUser = isEditMode && LOCKED_ORDER_STATUSES.includes(orderStatus) && !hasPrivilegedOrderEditAccess;
  const isOrderLockedByAnotherUser = isEditMode && orderEditLock?.canEdit === false;
  const canEditOrder = !isOrderLockedForCurrentUser && !isOrderLockedByAnotherUser;
  const controlsReadOnly = !canEditOrder || autoClosing || isSaving;
  const canEditOrderStatus = !controlsReadOnly;
  const availableOrderStatusOptions = getAvailableOrderStatusOptions({
    canUsePrivilegedStatuses: hasPrivilegedOrderEditAccess,
    currentStatus: orderStatus,
  });
  const ttnStatus = normalizeOrderTtnStatus(activeOrder?.ttnStatus);
  const specificationStatus = normalizeOrderSpecificationStatus(activeOrder?.specificationStatus);
  const managerOptions = user?.managerOptions || [];
  const releaseCurrentOrderLock = ({ bestEffort = false } = {}) => {
    if (!isEditMode || !activeOrder?.id || !orderEditLock?.isOwner || releasedLockRef.current) return Promise.resolve();
    releasedLockRef.current = true;
    setOrderEditLock(null);

    if (bestEffort) {
      const token = window.localStorage.token || '';
      const baseUrl = aAxios?.defaults?.baseURL || window.location.origin;
      const url = `${baseUrl}/user/releaseorderlock?token=${encodeURIComponent(token)}&id=${encodeURIComponent(activeOrder.id)}&lockId=${encodeURIComponent(orderEditLock.lockId || '')}`;
      const payload = JSON.stringify({ id: activeOrder.id, lockId: orderEditLock.lockId });
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          if (navigator.sendBeacon(url, blob)) return Promise.resolve();
        }
      } catch (error) {
        // Best-effort release continues with keepalive fetch below.
      }
      try {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      } catch (error) {
        // If the browser is closing, admin can release a stale lock manually.
      }
      return Promise.resolve();
    }

    return aAxios.post('/user/releaseorderlock', { id: activeOrder.id, lockId: orderEditLock.lockId }, { timeout: 3000 }).catch(() => {});
  };
  const goBack = () => {
    return releaseCurrentOrderLock().finally(() => navigate(-1));
  };

  const reopenOrderForEdit = () => {
    if (!activeOrder?.id) return;
    aAxios.post('/user/openorderforedit', { id: activeOrder.id })
      .then((response) => {
        if (response.status === 202) {
          setActiveOrder(response.data?.order || activeOrder);
          setOrderEditLock(receiveOrderLock(response.data?.lock));
          releasedLockRef.current = false;
          setMessage('');
        }
      })
      .catch((error) => {
        setToast(error?.response?.data?.message || 'Не удалось открыть заявку', 'danger');
      });
  };

  const forceUnlockOrder = () => {
    if (!activeOrder?.id || !user?.rights?.adminAccess) return;
    aAxios.post('/user/forceorderunlock', { id: activeOrder.id, lockId: orderEditLock?.lockId })
      .then((response) => {
        if (response.status === 202) {
          setToast('Блокировка снята');
          reopenOrderForEdit();
        }
      })
      .catch((error) => {
        setToast(error?.response?.data?.message || 'Не удалось снять блокировку', 'danger');
      });
  };

  useEffect(() => {
    if (isNewMode && user?.name) {
      setActiveOrder((prev) => {
        if (prev?.manager) return prev;
        return { ...prev, manager: user.name };
      });
    }
  }, [isNewMode, user?.name, setActiveOrder]);

  useEffect(() => {
    if (isEditMode && activeOrder?.id === undefined) {
      navigate('/allorders');
    }
  }, [isEditMode, activeOrder?.id, navigate]);

  useEffect(() => {
    releasedLockRef.current = false;
  }, [activeOrder?.id]);

  useEffect(() => {
    if (!isEditMode || !activeOrder?.id || !orderEditLock?.isOwner) return undefined;

    const handleBeforeUnload = () => {
      releaseCurrentOrderLock({ bestEffort: true });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseCurrentOrderLock({ bestEffort: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, activeOrder?.id, orderEditLock?.isOwner, orderEditLock?.lockId]);

  useEffect(() => {
    if (!isEditMode || !activeOrder?.id) {
      setLastSaveInfo('');
      return;
    }

    let cancelled = false;
    aAxios.post('/user/orderhistory', {
      id: activeOrder.id,
      page: 1,
      pageSize: 20,
    })
      .then((response) => {
        if (cancelled || response.status !== 202) return;
        const items = response.data?.items || [];
        const lastSave = items.find((item) => item?.action === 'UPDATE_ORDER' || item?.action === 'CREATE_ORDER');
        setLastSaveInfo(formatLastSaveInfo(lastSave));
      })
      .catch(() => {
        if (!cancelled) setLastSaveInfo('');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, activeOrder?.id]);

  const updateOrderField = (field, value) => {
    if (!canEditOrder) return;
    setActiveOrder((prev) => ({ ...prev, [field]: value }));
  };

  const addSupplier = () => {
    if (!canEditOrder) return;
    setActiveOrder((prev) => ({
      ...prev,
      suppliers: [
        ...(prev.suppliers || []),
        { ...emptyOrderRow() },
      ],
    }));
  };

  const addBuyer = () => {
    if (!canEditOrder) return;
    setActiveOrder((prev) => ({
      ...prev,
      buyers: [
        ...(prev.buyers || []),
        { ...emptyOrderRow() },
      ],
    }));
  };

  const resetNewOrder = () => {
    setMessage('');
    setActiveOrder(createEmptyOrder({ manager: user?.name || '' }));
  };

  const resetOrder = () => {
    if (!canEditOrder) {
      setToast(LOCKED_ORDER_MESSAGE, 'warning');
      return;
    }
    if (isNewMode) {
      resetNewOrder();
      return;
    }

    setMessage('');
    const emptyOrder = createEmptyOrder();
    setActiveOrder({
      ...emptyOrder,
      id: activeOrder.id,
      orderNumber: activeOrder.orderNumber || activeOrder.order_number || activeOrder.id || '',
      order_number: activeOrder.order_number,
      orderStatus: normalizeOrderStatus(activeOrder.orderStatus),
      ttnStatus: normalizeOrderTtnStatus(activeOrder.ttnStatus),
      date: activeOrder.date || emptyOrder.date,
    });
  };

  const buildOrderForSave = () => ({
    ...activeOrder,
    orderStatus: isNewMode ? ORDER_STATUS_OPTIONS[0] : normalizeOrderStatus(activeOrder?.orderStatus),
    ttnStatus: normalizeOrderTtnStatus(activeOrder?.ttnStatus),
    specificationStatus: normalizeOrderSpecificationStatus(activeOrder?.specificationStatus),
    clientPaid: activeOrder?.clientPaid || 'Нет',
    salaryIncluded: activeOrder?.salaryIncluded || 'Нет',
    invoiceSent: activeOrder?.invoiceSent || 'Нет',
    reconciliationAct: activeOrder?.reconciliationAct || 'Нет',
    otk: getOrderOtkForSave(activeOrder),
    haveEmptyBuyerH: hasEmptyBuyerH(activeOrder),
  });

  const saveOrder = async ({ closeAfterSave = false, automatic = false } = {}) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    let orderToSave;
    try {
      document.activeElement?.blur?.();
      lease.captureDraft(true);
      const draftSaveAttempt = lease.beginSave();
      if (!canEditOrder) throw new Error(LOCKED_ORDER_MESSAGE);
      orderToSave = JSON.parse(JSON.stringify(buildOrderForSave()));
      if (!orderToSave.buyers?.length || !orderToSave.suppliers?.length) {
        throw new Error('Заполните разделы Поставщики и Покупатели');
      }
      setActiveOrder(orderToSave);
      const endpoint = isEditMode
        ? (closeAfterSave ? '/user/finishorderedit' : '/user/editorder')
        : '/user/neworder';
      const payload = isEditMode
        ? { editingOrder: orderToSave, lockId: orderEditLock?.lockId }
        : { order: orderToSave };
      const response = await withSaveDeadline(signal => aAxios.post(endpoint, payload, {
        signal, timeout: 15000, preserveSessionOnAuthError: true,
      }));
      if (response.status !== 202) throw new Error('Сервер не подтвердил сохранение заявки');

      lease.acknowledgeSaved(orderToSave, closeAfterSave, draftSaveAttempt);
      setMessage('');
      // Updating suggestions is independent of the committed order and must not delay closing.
      syncOrderSelectLists({ order: orderToSave, user, setUser, aAxios }).catch(error => {
        console.error('Select lists sync error:', error);
      });
      if (isEditMode) {
        setLastSaveInfo(formatLastSaveInfo({
          actor_name: user?.name, actor_user_id: user?.id || user?.userId,
          created_at: new Date().toISOString(),
        }));
        sessionStorage.createdOrderId = orderToSave.id;
        if (closeAfterSave) {
          releasedLockRef.current = true;
          setOrderEditLock(null);
          setToast(automatic ? 'Время редактирования истекло. Заявка сохранена и закрыта.' : 'Изменения записаны');
          if (automatic) navigate('/allorders', { replace: true });
          else navigate(-1);
        } else {
          setToast('Изменения записаны');
        }
        return;
      }

      const createdOrderId = response.data?.id || response.data;
      const createdOrderNumber = response.data?.orderNumber || orderToSave.orderNumber || createdOrderId;
      if (!closeAfterSave) {
        try {
          const opened = await aAxios.post('/user/openorderforedit', { id: createdOrderId }, { timeout: 15000 });
          setEditingOrder(opened.data.order);
          setOrderEditLock(receiveOrderLock(opened.data.lock));
          releasedLockRef.current = false;
        } catch (_) {
          setEditingOrder({ ...orderToSave, id: createdOrderId, orderNumber: createdOrderNumber });
          setOrderEditLock({ canEdit: false, isOwner: false });
        }
      }
      resetNewOrder();
      sessionStorage.createdOrderId = createdOrderId;
      sessionStorage.bgColor = 'rgba(61, 174, 12, 0.44)';
      setToast(`Заявка №${createdOrderNumber} создана`);
      if (closeAfterSave) navigate(-1);
      else navigate('/editorder', { replace: true });
    } catch (error) {
      const hasDraft = lease.captureDraft(true);
      const reason = error.response?.data?.message || error.message || 'Не удалось сохранить заявку';
      if (automatic) {
        // An HTTP timeout may mean the server committed but its acknowledgement was lost.
        setToast(`${reason}. Сохранение не подтверждено. ${hasDraft
          ? 'Черновик сохранён на этом устройстве.'
          : 'Локальный черновик сохранить не удалось.'}`, 'danger');
        releaseCurrentOrderLock({ bestEffort: true });
        navigate('/allorders', { replace: true });
      } else {
        setToast(reason, 'danger');
        if (isEditMode && leasePhase(orderEditLock).phase === 'expired') {
          setAutoClosing(true);
        } else if (error.response?.status === 423 && error.response.data?.lock) {
          setOrderEditLock(receiveOrderLock(error.response.data.lock));
        }
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  latestSaveRef.current = saveOrder;
  useEffect(() => {
    setAutoClosing(false);
    // Clearing the lock after a successful finish must not re-arm autosave before navigation.
    if (orderEditLock?.lockId) autoFinishStartedRef.current = false;
  }, [activeOrder?.id, orderEditLock?.lockId]);

  const lease = useOrderEditSession({
    userId: user?.id || user?.userId, order: activeOrder,
    lock: isEditMode ? orderEditLock : null, enabled: isEditMode && canEditOrder,
    onExpire: () => setAutoClosing(true), setToast,
  });

  useEffect(() => {
    if (!autoClosing || isSaving || autoFinishStartedRef.current) return;
    autoFinishStartedRef.current = true;
    latestSaveRef.current({ automatic: true, closeAfterSave: true });
  }, [autoClosing, isSaving]);

  const saveAndCloseOrder = () => {
    if (savingRef.current || autoClosing) return;
    if (!canEditOrder) return goBack();
    return saveOrder({ closeAfterSave: true });
  };

  const captureAfterInput = () => {
    // Child controls also mutate row objects directly; capture after their handlers complete.
    setTimeout(() => lease.captureDraft(), 0);
  };

  const printOrder = () => {
    if (!isEditMode || !activeOrder?.id) return;

    const token = window.localStorage.token || '';
    const baseUrl = aAxios?.defaults?.baseURL || window.location.origin;
    const printUrl = `${baseUrl}/user/printorder/${activeOrder.id}?token=${encodeURIComponent(token)}`;
    const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      setToast('Разрешите всплывающие окна, чтобы открыть печать', 'warning');
    }
  };

  const openHistory = () => {
    if (!isEditMode || !activeOrder?.id) return;

    setHistoryShow(true);
    setHistoryLoading(true);
    aAxios.post('/user/orderhistory', {
      id: activeOrder.id,
      page: 1,
      pageSize: 100,
    })
      .then((response) => {
        if (response.status === 202) {
          setHistoryItems(response.data?.items || []);
        }
      })
      .catch(() => {
        setToast('Не удалось загрузить историю заявки', 'warning');
      })
      .finally(() => {
        setHistoryLoading(false);
      });
  };

  const renderOrderNumberField = () => (
    <FloatingLabel
      label="№ заявки"
      className={`p-0 ${isEditMode ? 'editOrderDesktop-orderNumber' : 'newOrderDesktop-orderNumber'}`}
    >
      <Form.Control
        as="input"
        type='number'
        min='1'
        placeholder='Авто'
        value={activeOrder.orderNumber || (isEditMode ? activeOrder.id || '' : '')}
        disabled={controlsReadOnly}
        onChange={(evt) => updateOrderField('orderNumber', evt.target.value)}
      />
    </FloatingLabel>
  );

  const renderStatusField = () => (
    <FloatingLabel label="Статус" className={`p-0 editOrderDesktop-status ${getOrderStatusClass(orderStatus)}`}>
      <Form.Select
        value={orderStatus}
        disabled={isNewMode || !canEditOrderStatus}
        onChange={(evt) => updateOrderField('orderStatus', evt.target.value)}
      >
        {availableOrderStatusOptions.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </Form.Select>
    </FloatingLabel>
  );

  const renderTtnStatusField = () => (
    <FloatingLabel label="ТТН" className="p-0 editOrderDesktop-ttnStatus">
      <Form.Select
        value={ttnStatus}
        disabled={controlsReadOnly}
        onChange={(evt) => updateOrderField('ttnStatus', evt.target.value)}
      >
        {ORDER_TTN_STATUS_OPTIONS.map((status) => (
          <option key={status.value} value={status.value}>{status.label}</option>
        ))}
      </Form.Select>
    </FloatingLabel>
  );

  const renderSpecificationStatusField = () => (
    <FloatingLabel label="Спецификация" className={`p-0 editOrderDesktop-specificationStatus ${getSpecificationStatusClass(specificationStatus)}`}>
      <Form.Select
        value={specificationStatus}
        disabled={controlsReadOnly}
        onChange={(evt) => updateOrderField('specificationStatus', evt.target.value)}
      >
        {ORDER_SPECIFICATION_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </Form.Select>
    </FloatingLabel>
  );

  const renderClientPaidField = () => (
    <FloatingLabel label="Оплачено клиент" className="p-0 orderEditor-clientPaid">
      <Form.Select
        value={activeOrder.clientPaid || 'Нет'}
        disabled={controlsReadOnly}
        onChange={(evt) => updateOrderField('clientPaid', evt.target.value)}
      >
        <option value="Нет">Нет</option>
        <option value="Да">Да</option>
      </Form.Select>
    </FloatingLabel>
  );

  const renderSalaryIncludedField = () => (
    <FloatingLabel label="Учтено в ЗП" className="p-0 orderEditor-salaryIncluded">
      <Form.Select
        value={activeOrder.salaryIncluded || 'Нет'}
        disabled={controlsReadOnly}
        onChange={(evt) => updateOrderField('salaryIncluded', evt.target.value)}
      >
        <option value="Нет">Нет</option>
        <option value="Да">Да</option>
      </Form.Select>
    </FloatingLabel>
  );

  const renderInvoiceSentField = () => (
    <FloatingLabel label="Счет отправлен" className="p-0 orderEditor-invoiceSent">
      <Form.Select
        value={activeOrder.invoiceSent || 'Нет'}
        disabled={controlsReadOnly}
        onChange={(evt) => updateOrderField('invoiceSent', evt.target.value)}
      >
        <option value="Нет">Нет</option>
        <option value="Да">Да</option>
      </Form.Select>
    </FloatingLabel>
  );

  const renderReconciliationActField = () => (
    <FloatingLabel label="Акт сверки" className="p-0 orderEditor-reconciliationAct">
      <Form.Select
        value={activeOrder.reconciliationAct || 'Нет'}
        disabled={controlsReadOnly}
        onChange={(evt) => updateOrderField('reconciliationAct', evt.target.value)}
      >
        <option value="Нет">Нет</option>
        <option value="Да">Да</option>
      </Form.Select>
    </FloatingLabel>
  );

  const renderCreatedDateField = () => (
    <FloatingLabel label="Дата создания" className={`p-0 orderEditor-createdDate ${isEditMode ? 'editOrderDesktop-date' : 'newOrderDesktop-date'}`}>
      <Form.Control
        as="input"
        type='date'
        value={activeOrder.date || ''}
        disabled
      />
    </FloatingLabel>
  );

  const renderDesktop = () => (
    <>
      <div className={`${isEditMode ? 'mb-2 editOrderDesktop-topBar' : 'orderTable-topActions newOrderDesktop-topBar'} noselect`}>
        <div className={isEditMode ? 'editOrderDesktop-topBarLeft' : 'newOrderDesktop-topBarLeft'}>
          <Button tabIndex={-1} variant="success" className='p-2' onClick={addBuyer} disabled={controlsReadOnly}>
            + Покупатель
          </Button>
          <Button tabIndex={-1} variant="primary" className='p-2' onClick={addSupplier} disabled={controlsReadOnly}>
            + Поставщик
          </Button>
          <FloatingLabel label="Менеджер" className={`p-0 ${isEditMode ? 'editOrderDesktop-manager' : 'newOrderDesktop-manager'}`}>
            <Form.Select
              value={activeOrder.manager || ''}
              disabled={controlsReadOnly}
              onChange={(evt) => updateOrderField('manager', evt.target.value)}
            >
              <option value="">Менеджер</option>
              {getManagerOptions(activeOrder.manager, managerOptions).map((manager) => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </Form.Select>
          </FloatingLabel>
          {renderOrderNumberField()}
          {renderStatusField()}
          {renderTtnStatusField()}
          {renderSpecificationStatusField()}
          {renderClientPaidField()}
          {renderSalaryIncludedField()}
          {renderInvoiceSentField()}
          {renderReconciliationActField()}
          {isEditMode && lastSaveInfo &&
            <div className="orderEditor-lastSaveInfo">
              <div className="orderEditor-lastSaveLabel">Последнее сохранение</div>
              <div className="orderEditor-lastSaveValue">{lastSaveInfo}</div>
            </div>
          }
        </div>

        <div className={isEditMode ? 'editOrderDesktop-topBarRight' : 'newOrderDesktop-topBarRight'}>
          {renderCreatedDateField()}
          <Button
            tabIndex={-1}
            variant="outline-secondary"
            className='p-2 orderEditor-clearBtn'
            title="Очистить"
            aria-label="Очистить"
            disabled={controlsReadOnly}
            onClick={resetOrder}
          >
            <FaArrowsRotate />
          </Button>
          <Button
            tabIndex={-1}
            variant="outline-secondary"
            className='p-2 orderEditor-historyBtn'
            title={isEditMode ? 'История изменений заявки' : 'История появится после создания заявки'}
            disabled={isNewMode}
            onClick={openHistory}
          >
            История
          </Button>
          <Button tabIndex={-1} variant="primary" className='pt-2 pb-2' onClick={saveAndCloseOrder} disabled={isSaving || autoClosing}>
            {canEditOrder ? 'Записать и закрыть' : 'Закрыть'}
          </Button>
          <Button tabIndex={-1} variant="success" className='p-2' onClick={() => saveOrder()} disabled={controlsReadOnly}>
            Записать
          </Button>
          <Button
            tabIndex={-1}
            variant="outline-secondary"
            className='p-2 orderEditor-printBtn'
            title={isEditMode ? 'Печать заявки' : 'Печать доступна после создания заявки'}
            aria-label="Печать заявки"
            disabled={isNewMode}
            onClick={printOrder}
          >
            <FaPrint />
          </Button>
        </div>
      </div>

      <OrderTable
        order={activeOrder}
        setOrder={setActiveOrder}
        hideInlineAddButtons={true}
        hideManagerInTable={true}
        readOnly={controlsReadOnly}
      />

      <OrderPaymentDates order={activeOrder} setOrder={setActiveOrder} readOnly={controlsReadOnly} />
      <OrderDeliveryFields order={activeOrder} setOrder={setActiveOrder} readOnly={controlsReadOnly} />

      <div className='newOrderDesktop-serviceArea'>
        <div className='newOrderDesktop-serviceFields'>
          <div className='newOrderDesktop-leftServiceColumn'>
            <OrderExtraFields order={activeOrder} setOrder={setActiveOrder} section='main' readOnly={controlsReadOnly} />
            <FloatingLabel label="Комментарии" className="newOrderDesktop-compactComments">
              <Form.Control
                as='input'
                type='text'
                value={activeOrder.comments || ''}
                disabled={controlsReadOnly}
                onChange={(evt) => updateOrderField('comments', evt.target.value)}
              />
            </FloatingLabel>
          </div>

          <div className='newOrderDesktop-requisites'>
            <OrderExtraFields order={activeOrder} setOrder={setActiveOrder} section='storage' readOnly={controlsReadOnly} />
            <OtkFields order={activeOrder} setOrder={setActiveOrder} readOnly={controlsReadOnly} />
            <FloatingLabel label="Налог 42%" className="mb-0">
              <Form.Control as="input" type='number' readOnly value={getOrderOtkTax(activeOrder)} />
            </FloatingLabel>
          </div>
        </div>
      </div>
    </>
  );

  const renderLockAlert = () => {
    if (!isEditMode || !isOrderLockedByAnotherUser) return null;
    if (!orderEditLock?.locked) return null;
    const userName = orderEditLock?.userName || 'другой пользователь';
    const lockedAt = formatLockDateTime(orderEditLock?.lockedAt);
    return (
      <Alert className="mt-2 mb-2" variant="warning">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span>
            Заявку редактирует {userName}{lockedAt ? ` с ${lockedAt}` : ''}. Открыт режим просмотра.
          </span>
          {user?.rights?.adminAccess &&
            <Button size="sm" variant="outline-danger" onClick={forceUnlockOrder}>
              Снять блокировку
            </Button>
          }
        </div>
      </Alert>
    );
  };

  if (isEditMode && activeOrder?.id === undefined) return null;

  return (
    <div onInputCapture={captureAfterInput} onChangeCapture={captureAfterInput} onClickCapture={captureAfterInput}>
      {renderLockAlert()}
      {orderTimerTarget && isEditMode && orderEditLock?.isOwner && lease.phase.phase !== 'none' && canEditOrder && createPortal(
        <div className={`orderEditor-timer${autoClosing ? ' orderEditor-timer--saving' : ''}`}
          role="timer" aria-label="До автоматического сохранения" aria-live="off"
          title="По окончании времени заявка автоматически сохраняется и закрывается">
          <span>Автосохранение</span>
          <strong>{autoClosing ? 'Сохраняем…'
            : `${Math.floor(lease.phase.seconds / 60)}:${String(lease.phase.seconds % 60).padStart(2, '0')}`}</strong>
        </div>, orderTimerTarget
      )}
      <div key={formRevision}>
      {isPhone
        ? <EditOrderMobile
            mode={mode}
            order={activeOrder}
            setOrder={setActiveOrder}
            onSave={() => saveOrder()}
            onBack={saveAndCloseOrder}
            backLabel={canEditOrder ? 'Записать и закрыть' : 'Закрыть'}
            isSaving={isSaving || autoClosing}
            onClear={resetOrder}
            onPrint={printOrder}
            onHistory={openHistory}
            historyDisabled={isNewMode}
            printDisabled={isNewMode}
            readOnly={controlsReadOnly}
            specificationStatus={specificationStatus}
            saveLabel="Записать"
          />
        : renderDesktop()
      }
      </div>
      <Modal show={lease.recovery.length > 0 && canEditOrder && !autoClosing} backdrop="static" keyboard={false} centered>
        <Modal.Header><Modal.Title>Найдены несохранённые изменения</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>Черновики сохранены только на этом устройстве. Восстановление заполнит редактор, но не запишет заявку автоматически.</p>
          {lease.recovery.map(draft => (
            <div key={draft.key} className="border rounded p-2 mb-2">
              <p>Черновик от {new Date(draft.savedAt).toLocaleString('ru-RU')}</p>
              {comparableOrder(draft.base) !== comparableOrder(activeOrder) &&
                <Alert variant="warning">После создания черновика заявка на сервере изменилась. Восстановление заменит поля редактора значениями черновика. Проверьте их перед сохранением.</Alert>
              }
              <div className="d-flex gap-2 flex-wrap">
                <Button disabled={controlsReadOnly} onClick={() => {
                  lease.markRestored(draft);
                  setActiveOrder({ ...draft.order, id: activeOrder.id });
                  setFormRevision(value => value + 1);
                }}>Восстановить черновик</Button>
                <Button variant="outline-danger" onClick={() => lease.discardDraft(draft)}>Удалить черновик</Button>
              </div>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={goBack}>Вернуться к списку</Button></Modal.Footer>
      </Modal>
      {message !== ''
        ? <Alert key={alertVariant} className='mt-3' variant={alertVariant}> {message} </Alert>
        : ''
      }
      <Modal size='xl' centered show={historyShow} onHide={() => setHistoryShow(false)} animation={true}>
        <Modal.Header closeButton>
          <Modal.Title>История изменений заявки №{activeOrder?.orderNumber || activeOrder?.id || ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {historyLoading
            ? <div>Загрузка истории...</div>
            : <Table striped bordered hover responsive='sm' size='sm' className='mb-0'>
                <thead>
                  <tr>
                    <th>Дата/время</th>
                    <th>Пользователь</th>
                    <th>Действие</th>
                    <th>Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.length === 0 &&
                    <tr>
                      <td colSpan={4} className='text-center'>История изменений пуста</td>
                    </tr>
                  }
                  {historyItems.map((item) => (
                    <tr key={item.id}>
                      <td>{formatHistoryDateTime(item.created_at)}</td>
                      <td>{item.actor_name || item.actor_user_id || '—'}</td>
                      <td>{formatHistoryAction(item.action)}</td>
                      <td className='orderEditor-historyDetails'>{renderHistoryDetails(item.payload)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          }
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setHistoryShow(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default OrderEditor;
