import './OrderPaymentDates.css';
import { useEffect } from 'react';
import Form from 'react-bootstrap/Form';

function OrderPaymentDates({ order, setOrder, variant = 'desktop' }) {
  const updateField = (field, value) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const updateLoadingDate = (value) => {
    setOrder((prev) => ({
      ...prev,
      loadingDate: value,
      shipmentDate: prev.loadingFromStorage ? prev.shipmentDate : value,
    }));
  };

  const updateLoadingFromStorage = (checked) => {
    setOrder((prev) => ({
      ...prev,
      loadingFromStorage: checked,
      shipmentDate: checked ? prev.shipmentDate : prev.loadingDate,
    }));
  };

  const updateSupplierPaymentDeferred = (checked) => {
    setOrder((prev) => ({
      ...prev,
      supplierPaymentDeferred: checked,
      supplierPaymentDeferredDays: checked ? prev.supplierPaymentDeferredDays || '' : '',
    }));
  };

  const updateClientPaymentDeferred = (checked) => {
    setOrder((prev) => ({
      ...prev,
      clientPaymentDeferred: checked,
      clientPaymentDeferredDays: checked ? prev.clientPaymentDeferredDays || '' : '',
    }));
  };

  useEffect(() => {
    if (order?.loadingFromStorage) {
      return;
    }

    const loadingDate = order?.loadingDate || '';
    if ((order?.shipmentDate || '') === loadingDate) {
      return;
    }

    setOrder((prev) => ({
      ...prev,
      shipmentDate: prev.loadingDate || '',
    }));
  }, [order?.loadingDate, order?.loadingFromStorage, order?.shipmentDate, setOrder]);

  const blockClassName = `orderPaymentDates orderPaymentDates-${variant}`;

  return (
    <div className={blockClassName}>
      <div className='orderPaymentDates-field'>
        <div className='orderPaymentDates-label'>Дата оплаты поставщику</div>
        <div className='orderPaymentDates-inputRow'>
          <Form.Control
            type='date'
            value={order?.supplierPaymentDate || ''}
            onChange={(evt) => updateField('supplierPaymentDate', evt.target.value)}
          />
          <Form.Check
            id={`supplierPaymentDeferred-${variant}`}
            className='orderPaymentDates-check'
            type='checkbox'
            label='Отсрочка'
            checked={!!order?.supplierPaymentDeferred}
            onChange={(evt) => updateSupplierPaymentDeferred(evt.target.checked)}
          />
          <Form.Control
            className='orderPaymentDates-deferredDays'
            type='number'
            min='0'
            step='1'
            placeholder='Кол-во дней'
            aria-label='Количество дней отсрочки'
            disabled={!order?.supplierPaymentDeferred}
            value={order?.supplierPaymentDeferredDays || ''}
            onChange={(evt) => updateField('supplierPaymentDeferredDays', evt.target.value)}
          />
        </div>
      </div>

      <div className='orderPaymentDates-field'>
        <div className='orderPaymentDates-label'>Дата оплаты от клиента</div>
        <div className='orderPaymentDates-inputRow'>
          <Form.Control
            type='date'
            value={order?.clientPaymentDate || ''}
            onChange={(evt) => updateField('clientPaymentDate', evt.target.value)}
          />
          <Form.Check
            id={`clientPaymentDeferred-${variant}`}
            className='orderPaymentDates-check'
            type='checkbox'
            label='Отсрочка'
            checked={!!order?.clientPaymentDeferred}
            onChange={(evt) => updateClientPaymentDeferred(evt.target.checked)}
          />
          <Form.Control
            className='orderPaymentDates-deferredDays'
            type='number'
            min='0'
            step='1'
            placeholder='Кол-во дней'
            aria-label='Количество дней отсрочки оплаты от клиента'
            disabled={!order?.clientPaymentDeferred}
            value={order?.clientPaymentDeferredDays || ''}
            onChange={(evt) => updateField('clientPaymentDeferredDays', evt.target.value)}
          />
        </div>
      </div>

      <div className='orderPaymentDates-field'>
        <div className='orderPaymentDates-label'>Дата загрузки</div>
        <div className='orderPaymentDates-inputRow'>
          <Form.Control
            type='date'
            value={order?.loadingDate || ''}
            onChange={(evt) => updateLoadingDate(evt.target.value)}
          />
          <Form.Check
            id={`loadingFromStorage-${variant}`}
            className='orderPaymentDates-check'
            type='checkbox'
            label='с Хранения'
            checked={!!order?.loadingFromStorage}
            onChange={(evt) => updateLoadingFromStorage(evt.target.checked)}
          />
        </div>
      </div>

      <div className='orderPaymentDates-field'>
        <div className='orderPaymentDates-label'>Дата реализации</div>
        <Form.Control
          type='date'
          value={order?.shipmentDate || ''}
          disabled={!order?.loadingFromStorage}
          onChange={(evt) => updateField('shipmentDate', evt.target.value)}
        />
      </div>
    </div>
  );
}

export default OrderPaymentDates;
