import './OrderDeliveryFields.css';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';

function OrderDeliveryFields({ order, setOrder, variant = 'desktop' }) {
  const updateField = (field, value) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`orderDeliveryFields orderDeliveryFields-${variant}`}>
      <FloatingLabel label="Перевозчик">
        <Form.Control
          as="input"
          type='text'
          value={order?.ip || ''}
          onChange={(evt) => updateField('ip', evt.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel label="Водитель">
        <Form.Control
          as="input"
          type='text'
          value={order?.driver || ''}
          onChange={(evt) => updateField('driver', evt.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel label="Стоимость доставки">
        <Form.Control
          as="input"
          type='number'
          value={order?.cost || ''}
          onChange={(evt) => updateField('cost', evt.target.value)}
        />
      </FloatingLabel>
    </div>
  );
}

export default OrderDeliveryFields;
