import "./ComboBox.css";
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import { useRef } from "react";



function ComboBox({ data = [], label = '', id, defaultValue = undefined }) {
    const ref = useRef(null);
    const handleClick = (value) => {
        ref.current.value = value;
        let event = new Event('change')
        ref.current.dispatchEvent(event);
    }
    return (
        <div >
            <Stack >
                <Dropdown as={ButtonGroup} >
                    <Form.Control as='input' type="text" defaultValue={defaultValue} autoComplete="off" placeholder={label} ref={ref} id={id} />
                    <div className="vr" />
                    <div className="vr" />
                    <div className="vr" />
                    <Dropdown.Toggle size="lg" split variant={'secondary'} />
                    <Dropdown.Menu>
                        {
                            data.map(item =>
                                <Dropdown.Item as={Button} key={item} size="lg" onClick={() => handleClick(item)} >{item}</Dropdown.Item>
                            )
                        }
                    </Dropdown.Menu>
                </Dropdown>
            </Stack>
            <br />
        </div>
    )
}

export default ComboBox;