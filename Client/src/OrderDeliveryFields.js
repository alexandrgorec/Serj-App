import './OrderDeliveryFields.css';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';

const CARRIER_OPTIONS = [
  'Не выбрано',
  'Самовывоз',
  'Доставка поставщика',
  'Наш водитель',
  'Наемный транспорт',
];

function OrderDeliveryFields({ order, setOrder, variant = 'desktop', readOnly = false }) {
  const updateField = (field, value) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`orderDeliveryFields orderDeliveryFields-${variant}`}>
      <div className="orderDeliveryFields-carrierGroup">
        <FloatingLabel controlId={`delivery-terms-${variant}`} label="Условия поставки">
          <Form.Select
            value={order?.ip || 'Не выбрано'}
            disabled={readOnly}
            onChange={(evt) => updateField('ip', evt.target.value)}
          >
            {CARRIER_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Form.Select>
        </FloatingLabel>
        <FloatingLabel controlId={`delivery-carrier-${variant}`} label="Перевозчик">
          <Form.Control
            type="text"
            value={order?.carrier || ''}
            disabled={readOnly}
            onChange={(evt) => updateField('carrier', evt.target.value)}
          />
        </FloatingLabel>
      </div>
      <FloatingLabel label="Водитель">
        <Form.Control
          as="input"
          type='text'
          value={order?.driver || ''}
          disabled={readOnly}
          onChange={(evt) => updateField('driver', evt.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel label="Стоимость доставки">
        <Form.Control
          as="input"
          type='number'
          value={order?.cost || ''}
          disabled={readOnly}
          onChange={(evt) => updateField('cost', evt.target.value)}
        />
      </FloatingLabel>
    </div>
  );
}

export default OrderDeliveryFields;
