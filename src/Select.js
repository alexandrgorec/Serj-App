import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

function Select({data,label,id}) {
  return (
    <FloatingLabel label={label}>
      <Form.Select id={id}>
      <option value="">Не выбрано</option>  
      { data.sort().map( item => (
        <option value={item}>{item}</option>  
      ))}
      </Form.Select>
    </FloatingLabel>
  );
}

export default Select;
