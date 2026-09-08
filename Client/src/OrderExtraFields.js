import './OrderExtraFields.css';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function parseNumberValue(value) {
  if (!hasValue(value)) return null;
  const normalized = String(value).replace(/[\s\u00A0]+/g, '').replace(',', '.');
  if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function formatCalculatedValue(value) {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return String(rounded);
}

function calculateStorageTotal(order) {
  const ton = parseNumberValue(order?.storageTon);
  const price = parseNumberValue(order?.storagePrice);
  if (ton === null || price === null) return '';
  return formatCalculatedValue(ton * price);
}

function OrderExtraFields({ order, setOrder, variant = 'desktop' }) {
  const updateField = (field, value) => {
    setOrder((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'storageTon' || field === 'storagePrice') {
        next.storageTotal = calculateStorageTotal(next);
      }
      return next;
    });
  };

  const inputProps = (field, readOnly = false) => ({
    as: 'input',
    type: 'text',
    value: order?.[field] || '',
    readOnly,
    onChange: (evt) => updateField(field, evt.target.value),
  });

  if (variant === 'mobile') {
    return (
      <div className='orderExtraFields orderExtraFields-mobile'>
        <div className='orderExtraFields-mobileField'>
          <div className='orderExtraFields-mobileLabel'>Курьер</div>
          <Form.Control {...inputProps('courier')} />
        </div>
        <div className='orderExtraFields-mobileField'>
          <div className='orderExtraFields-mobileLabel'>Недостача</div>
          <Form.Control {...inputProps('shortage')} />
        </div>
        <div className='orderExtraFields-mobileField'>
          <div className='orderExtraFields-mobileLabel'>Транс.склад</div>
          <Form.Control {...inputProps('transWarehouse')} />
        </div>
        <div className='orderExtraFields-mobileField'>
          <div className='orderExtraFields-mobileLabel'>Место загрузки</div>
          <Form.Control {...inputProps('loadingPlace')} />
        </div>
        <div className='orderExtraFields-storageGrid'>
          <div className='orderExtraFields-mobileField'>
            <div className='orderExtraFields-mobileLabel'>Хранение (Тонна)</div>
            <Form.Control {...inputProps('storageTon')} />
          </div>
          <div className='orderExtraFields-mobileField'>
            <div className='orderExtraFields-mobileLabel'>Хранение цена</div>
            <Form.Control {...inputProps('storagePrice')} />
          </div>
          <div className='orderExtraFields-mobileField'>
            <div className='orderExtraFields-mobileLabel'>Хранение итого</div>
            <Form.Control {...inputProps('storageTotal', true)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='orderExtraFields orderExtraFields-desktop'>
      <FloatingLabel label='Курьер' className='orderExtraFields-wide'>
        <Form.Control {...inputProps('courier')} />
      </FloatingLabel>
      <FloatingLabel label='Недостача' className='orderExtraFields-wide'>
        <Form.Control {...inputProps('shortage')} />
      </FloatingLabel>
      <FloatingLabel label='Транс.склад' className='orderExtraFields-wide'>
        <Form.Control {...inputProps('transWarehouse')} />
      </FloatingLabel>
      <FloatingLabel label='Место загрузки' className='orderExtraFields-wide'>
        <Form.Control {...inputProps('loadingPlace')} />
      </FloatingLabel>
      <div className='orderExtraFields-storageGrid'>
        <FloatingLabel label='Хранение (Тонна)'>
          <Form.Control {...inputProps('storageTon')} />
        </FloatingLabel>
        <FloatingLabel label='Хранение цена'>
          <Form.Control {...inputProps('storagePrice')} />
        </FloatingLabel>
        <FloatingLabel label='Хранение итого'>
          <Form.Control {...inputProps('storageTotal', true)} />
        </FloatingLabel>
      </div>
    </div>
  );
}

export default OrderExtraFields;
