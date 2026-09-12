import OrderTable from './OrderTable';
import EditOrderMobile from './EditOrderMobile';
import './NewOrder.css';
import './EditOrder.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useState, useContext, useEffect } from 'react';
import { Alert, Modal, Table } from 'react-bootstrap';
import { userContext } from './App';
import { useNavigate } from 'react-router-dom';
import { syncOrderSelectLists } from './selectListsSync';
import OtkFields, { getOrderOtkForSave, getOrderOtkTax } from './OtkFields';
import OrderExtraFields from './OrderExtraFields';
import OrderPaymentDates from './OrderPaymentDates';
import { getManagerOptions } from './managerOptions';
import { createEmptyOrder, emptyOrderRow } from './orderDefaults';
import { ORDER_STATUS_OPTIONS, normalizeOrderStatus } from './orderStatus';
import { ORDER_TTN_STATUS_OPTIONS, normalizeOrderTtnStatus } from './orderTtnStatus';
import { FaArrowsRotate, FaPrint } from 'react-icons/fa6';

const HISTORY_FIELD_LABELS = {
  orderNumber: '№ заявки',
  order_number: '№ заявки',
  orderStatus: 'Статус заявки',
  ttnStatus: 'Статус ТТН',
  manager: 'Менеджер',
  date: 'Дата заявки',
  ip: 'ИП перевозчик',
  driver: 'Водитель',
  cost: 'Стоимость доставки',
  otk: 'ОТК',
  otkManual: 'ОТК (ручной ввод)',
  otkFormulaTon: 'ОТК формула (тонна)',
  otkFormulaPrice: 'ОТК формула (цена)',
  otkFormulaTotal: 'ОТК формула (итого)',
  courier: 'Курьер',
  shortage: 'Недостача',
  transWarehouse: 'Транс.склад',
  loadingPlace: 'Место загрузки',
  storageTon: 'Хранение (тонна)',
  storagePrice: 'Хранение цена',
  storageTotal: 'Хранение итого',
  supplierPaymentDate: 'Дата оплаты поставщику',
  supplierPaymentDeferred: 'Отсрочка оплаты поставщику',
  loadingDate: 'Дата загрузки',
  loadingFromStorage: 'Загрузка с хранения',
  shipmentDate: 'Дата отгрузки',
  comments: 'Комментарии',
  name: 'наименование',
  typeOfProduct: 'вид продукта',
  liters: 'литры',
  tons: 'тонны',
  price: 'цена',
  sf: 'С/Ф',
  summa: 'сумма',
  akt: 'акт транспорт',
};

function formatHistoryDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ru-RU');
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
  const text = isBlankHistoryValue(value) ? 'Новая' : String(value).trim();
  if (text === 'Создана') return 'Новая';
  if (text === 'Приход внесен') return 'Заприходирована';
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

function normalizeHistoryComparable(field, value) {
  if (field === 'orderStatus' || field === 'Статус заявки') return normalizeHistoryStatus(value);
  if (field === 'ttnStatus' || field === 'Статус ТТН') return normalizeHistoryTtnStatus(value);

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
    const fieldLabel = HISTORY_FIELD_LABELS[buyerHMatch[3]] || buyerHMatch[3];
    return `Покупатель №${buyerIndex}, Н №${buyerHIndex}: ${fieldLabel}`;
  }

  const rowMatch = String(field || '').match(/^(suppliers|buyers)\[(\d+)]\.(.+)$/);
  if (rowMatch) {
    const sectionLabel = rowMatch[1] === 'suppliers' ? 'Поставщик' : 'Покупатель';
    const rowIndex = Number(rowMatch[2]) + 1;
    const fieldLabel = HISTORY_FIELD_LABELS[rowMatch[3]] || rowMatch[3];
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

function getOrderStatusClass(status) {
  const normalizedStatus = normalizeOrderStatus(status);
  if (normalizedStatus === 'Заприходирована') return 'editOrder-status-income';
  if (normalizedStatus === 'Реализована') return 'editOrder-status-done';
  return 'editOrder-status-created';
}

function hasEmptyBuyerH(order) {
  return (order.buyers || [])
    .some((buyer) => (buyer.buyersH || [])
      .some((buyerH) => String(buyerH?.name || '').trim() === ''));
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
  } = useContext(userContext);
  const [message, setMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('');
  const [historyShow, setHistoryShow] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const activeOrder = isEditMode ? editingOrder : order;
  const setActiveOrder = isEditMode ? setEditingOrder : setOrder;
  const canEditOrderStatus = !!user?.rights?.finBlockAccess;
  const orderStatus = normalizeOrderStatus(activeOrder?.orderStatus);
  const ttnStatus = normalizeOrderTtnStatus(activeOrder?.ttnStatus);
  const managerOptions = user?.managerOptions || [];
  const goBack = () => navigate(-1);

  useEffect(() => {
    if (isNewMode && setActiveOrder) {
      setMessage('');
      setActiveOrder(createEmptyOrder({ manager: user?.name || '' }));
    }
    // Сбрасываем форму именно при открытии режима новой заявки.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewMode]);

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

  if (isEditMode && activeOrder?.id === undefined) return null;

  const updateOrderField = (field, value) => {
    setActiveOrder((prev) => ({ ...prev, [field]: value }));
  };

  const addSupplier = () => {
    setActiveOrder((prev) => ({
      ...prev,
      suppliers: [
        ...(prev.suppliers || []),
        { ...emptyOrderRow() },
      ],
    }));
  };

  const addBuyer = () => {
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
    otk: getOrderOtkForSave(activeOrder),
    haveEmptyBuyerH: hasEmptyBuyerH(activeOrder),
  });

  const saveOrder = async () => {
    let alertMessage = '';
    if ((activeOrder.buyers || []).length === 0)
      alertMessage = 'Заполните раздел Покупатели';
    if ((activeOrder.suppliers || []).length === 0)
      alertMessage = 'Заполните раздел Поставщики';

    if (alertMessage !== '') {
      setAlertVariant('danger');
      setMessage(alertMessage);
      return;
    }

    const orderToSave = buildOrderForSave();
    setActiveOrder(orderToSave);

    try {
      if (isEditMode) {
        const response = await aAxios.post('/user/editorder', {
          editingOrder: orderToSave,
        });
        if (response.status === 202) {
          await syncOrderSelectLists({ order: orderToSave, user, setUser, aAxios }).catch((error) => {
            console.error('Select lists sync error:', error);
          });
          setAlertVariant('success');
          setMessage('');
          setToast('Изменения записаны');
          sessionStorage.createdOrderId = orderToSave.id;
        }
        return;
      }

      const response = await aAxios.post('/user/neworder', {
        order: orderToSave,
      });
      if (response.status === 202) {
        await syncOrderSelectLists({ order: orderToSave, user, setUser, aAxios }).catch((error) => {
          console.error('Select lists sync error:', error);
        });
        const createdOrderNumber = response.data?.orderNumber || orderToSave.orderNumber || response.data?.id || response.data;
        resetNewOrder();
        setAlertVariant('success');
        sessionStorage.createdOrderId = response.data?.id || response.data;
        sessionStorage.bgColor = 'rgba(61, 174, 12, 0.44)';
        setToast(createdOrderNumber ? `Заявка №${createdOrderNumber} создана` : 'Заявка создана');
        navigate('/allorders');
      }
    } catch (error) {
      if (error?.response?.status === 409) {
        setAlertVariant('danger');
        setMessage(error.response.data?.message || 'Заявка с таким номером уже существует');
        return;
      }
      if (error?.response?.status === 400) {
        setAlertVariant('danger');
        setMessage(error.response.data?.message || 'Некорректный номер заявки');
      }
    }
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
        {ORDER_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </Form.Select>
    </FloatingLabel>
  );

  const renderTtnStatusField = () => (
    <FloatingLabel label="ТТН" className="p-0 editOrderDesktop-ttnStatus">
      <Form.Select
        value={ttnStatus}
        onChange={(evt) => updateOrderField('ttnStatus', evt.target.value)}
      >
        {ORDER_TTN_STATUS_OPTIONS.map((status) => (
          <option key={status.value} value={status.value}>{status.label}</option>
        ))}
      </Form.Select>
    </FloatingLabel>
  );

  const renderDesktop = () => (
    <>
      <div className={`${isEditMode ? 'mb-2 editOrderDesktop-topBar' : 'orderTable-topActions newOrderDesktop-topBar'} noselect`}>
        <div className={isEditMode ? 'editOrderDesktop-topBarLeft' : 'newOrderDesktop-topBarLeft'}>
          <Button tabIndex={-1} variant="success" className='p-2' onClick={addBuyer}>
            + Покупатель
          </Button>
          <Button tabIndex={-1} variant="primary" className='p-2' onClick={addSupplier}>
            + Поставщик
          </Button>
          <FloatingLabel label="Менеджер" className={`p-0 ${isEditMode ? 'editOrderDesktop-manager' : 'newOrderDesktop-manager'}`}>
            <Form.Select
              value={activeOrder.manager || ''}
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
          <FloatingLabel label="Дата" className={`p-0 ${isEditMode ? 'editOrderDesktop-date' : 'newOrderDesktop-date'}`}>
            <Form.Control
              as="input"
              type='date'
              value={activeOrder.date || ''}
              onChange={(evt) => updateOrderField('date', evt.target.value)}
            />
          </FloatingLabel>
        </div>

        <div className={isEditMode ? 'editOrderDesktop-topBarRight' : 'newOrderDesktop-topBarRight'}>
          <Button
            tabIndex={-1}
            variant="outline-secondary"
            className='p-2 orderEditor-clearBtn'
            title="Очистить"
            aria-label="Очистить"
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
          <Button tabIndex={-1} variant="primary" className='pt-2 pb-2' onClick={goBack}>
            Назад
          </Button>
          <Button tabIndex={-1} variant="success" className='p-2' onClick={saveOrder}>
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
            <span>Печать</span>
          </Button>
        </div>
      </div>

      <OrderTable
        order={activeOrder}
        setOrder={setActiveOrder}
        hideInlineAddButtons={true}
        hideManagerInTable={true}
      />

      <OrderPaymentDates order={activeOrder} setOrder={setActiveOrder} />

      <div className='newOrderDesktop-serviceArea'>
        <div className='newOrderDesktop-serviceFields'>
          <div className='newOrderDesktop-leftServiceColumn'>
            <OrderExtraFields order={activeOrder} setOrder={setActiveOrder} />
          </div>

          <div className='newOrderDesktop-requisites'>
            <FloatingLabel label="ИП Перевозчик" className="mb-2">
              <Form.Control
                as="input"
                type='text'
                value={activeOrder.ip || ''}
                onChange={(evt) => updateOrderField('ip', evt.target.value)}
              />
            </FloatingLabel>
            <FloatingLabel label="Водитель" className="mb-2">
              <Form.Control
                as="input"
                type='text'
                value={activeOrder.driver || ''}
                onChange={(evt) => updateOrderField('driver', evt.target.value)}
              />
            </FloatingLabel>
            <FloatingLabel label="Стоимость доставки" className="mb-2">
              <Form.Control
                as="input"
                type='number'
                value={activeOrder.cost || ''}
                onChange={(evt) => updateOrderField('cost', evt.target.value)}
              />
            </FloatingLabel>
            <OtkFields order={activeOrder} setOrder={setActiveOrder} />
            <FloatingLabel label="Налог 42%" className="mb-0">
              <Form.Control as="input" type='number' readOnly value={getOrderOtkTax(activeOrder)} />
            </FloatingLabel>
          </div>
        </div>

        <div className='newOrderDesktop-comments'>
          <Form.Control
            as='textarea'
            placeholder='Комментарии'
            value={activeOrder.comments || ''}
            onChange={(evt) => updateOrderField('comments', evt.target.value)}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      {isPhone
        ? <EditOrderMobile
            mode={mode}
            order={activeOrder}
            setOrder={setActiveOrder}
            onSave={saveOrder}
            onBack={goBack}
            onClear={resetOrder}
            onPrint={printOrder}
            onHistory={openHistory}
            historyDisabled={isNewMode}
            printDisabled={isNewMode}
            saveLabel="Записать"
          />
        : renderDesktop()
      }
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
                      <td className='orderEditor-historyDetails'>{formatHistoryDetails(item.payload)}</td>
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
    </>
  );
}

export default OrderEditor;
