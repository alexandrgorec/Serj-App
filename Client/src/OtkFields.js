import './OtkFields.css';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const FORMULA_FIELDS = ['otkFormulaTon', 'otkFormulaPrice', 'otkFormulaTotal'];

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

function getFormulaValues(order) {
  return {
    otkFormulaTon: order?.otkFormulaTon || '',
    otkFormulaPrice: order?.otkFormulaPrice || '',
    otkFormulaTotal: order?.otkFormulaTotal || '',
  };
}

export function getOtkManualValue(order) {
  if (order?.otkManual !== undefined && order?.otkManual !== null) return order.otkManual;
  const formula = getFormulaValues(order);
  const hasFormula = FORMULA_FIELDS.some((field) => hasValue(formula[field]));
  return hasFormula ? '' : (order?.otk || '');
}

export function getOrderOtkForSave(order) {
  const manualValue = getOtkManualValue(order);
  if (hasValue(manualValue)) return String(manualValue).trim();
  if (hasValue(order?.otkFormulaTotal)) return String(order.otkFormulaTotal).trim();
  return '';
}

function OtkFields({ order, setOrder, variant = 'desktop' }) {
  const manualValue = getOtkManualValue(order);
  const formulaValues = getFormulaValues(order);
  const manualActive = hasValue(manualValue);
  const formulaActive = FORMULA_FIELDS.some((field) => hasValue(formulaValues[field]));

  const updateOtkField = (field, value) => {
    setOrder((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'otkFormulaTon' || field === 'otkFormulaPrice') {
        const ton = parseNumberValue(next.otkFormulaTon);
        const price = parseNumberValue(next.otkFormulaPrice);
        next.otkFormulaTotal = ton === null || price === null
          ? ''
          : formatCalculatedValue(ton * price);
      }
      next.otk = getOrderOtkForSave(next);
      return next;
    });
  };

  const inputProps = (field, disabled) => ({
    as: 'input',
    type: 'text',
    value: field === 'otkManual' ? manualValue : formulaValues[field],
    disabled,
    onChange: (evt) => updateOtkField(field, evt.target.value),
  });

  if (variant === 'mobile') {
    return (
      <div className='otkFields otkFields-mobile'>
        <div className='otkFields-mobileField'>
          <div className='otkFields-mobileLabel'>ОТК (Ручной ввод)</div>
          <Form.Control {...inputProps('otkManual', formulaActive)} />
        </div>
        <div className='otkFields-mobileField'>
          <div className='otkFields-mobileLabel'>ОТК Формула (Тонна)</div>
          <Form.Control {...inputProps('otkFormulaTon', manualActive)} />
        </div>
        <div className='otkFields-mobileField'>
          <div className='otkFields-mobileLabel'>ОТК Формула (Цена)</div>
          <Form.Control {...inputProps('otkFormulaPrice', manualActive)} />
        </div>
        <div className='otkFields-mobileField'>
          <div className='otkFields-mobileLabel'>ОТК Формула (Итого)</div>
          <Form.Control {...inputProps('otkFormulaTotal', manualActive)} />
        </div>
      </div>
    );
  }

  return (
    <div className='otkFields otkFields-desktop'>
      <FloatingLabel label='ОТК (Ручной ввод)' className='p-0'>
        <Form.Control {...inputProps('otkManual', formulaActive)} />
      </FloatingLabel>
      <FloatingLabel label='ОТК Формула (Тонна)' className='p-0'>
        <Form.Control {...inputProps('otkFormulaTon', manualActive)} />
      </FloatingLabel>
      <FloatingLabel label='ОТК Формула (Цена)' className='p-0'>
        <Form.Control {...inputProps('otkFormulaPrice', manualActive)} />
      </FloatingLabel>
      <FloatingLabel label='ОТК Формула (Итого)' className='p-0'>
        <Form.Control {...inputProps('otkFormulaTotal', manualActive)} />
      </FloatingLabel>
    </div>
  );
}

export default OtkFields;
