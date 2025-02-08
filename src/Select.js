import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useRef, useEffect } from 'react';

function Select({ data, label, id, ref=null}) {

  return (
    <FloatingLabel label={label} >
      <Form.Select id={id} ref={ref}>
        <option value="">Не выбрано</option>
        {data.sort().map(item => (
          <option value={item} >{item}</option>
        ))}
      </Form.Select>
    </FloatingLabel>
  );
}

export default Select;
// onChange={onChangeFunc}