import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

function Select({ data, label, id, ref = null }) {

  return (
    <>
      <FloatingLabel label={label} >
        <Form.Select id={id} ref={ref}>
          {data.sort().map(item => (
            <option key={item} value={item} >{item}</option>
          ))}
        </Form.Select>
      </FloatingLabel>
      <br />
    </>
  );
}

export default Select;