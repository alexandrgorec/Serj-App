import Form from 'react-bootstrap/Form';
import { useRef, useEffect, useContext } from "react";
import InputGroup from 'react-bootstrap/InputGroup';
import { userContext } from './App';



function TDInput({ object, value = '', disabled = false, fontSize = '14px', type, field = '', display = '', onChangeExtra = null, tdClassName = '', inputClassName = '' }) {
    const ref = useRef(null);
    const isNumber = type === 'number' ? true : false;
    let tabIndex = -1;
    if (!disabled)
        tabIndex = sessionStorage.tabIndex++;
    if (isNumber)
        type = 'text';
    useEffect(() => {
        if (value != '')
            ref.current.value = object[field];
    }, [object])
    return (
        <td className={`m-0 p-0 ${tdClassName}`} style={{display:display}}>
            <div>
                <Form.Control className={`tabIndex-${tabIndex} ${inputClassName}`}  disabled={disabled} style={{ fontSize: fontSize}} as='input' type={type} defaultValue={object[field]} autoComplete="off" ref={ref}
                    onKeyDown={(evt) => {
                        if (isNumber && !(evt.key.match(/\d/)
                            || evt.key == 'Backspace'
                            || evt.key == ','
                            || evt.key == '.'
                            || evt.key == 'Tab'
                            || evt.key == 'ArrowLeft'
                            || evt.key == 'ArrowRight'
                            || evt.key == 'Delete')) {
                            evt.preventDefault();
                        }
                        if (evt.key == 'Enter') {
                            let nextElem = document.querySelector(`.tabIndex-${tabIndex + 1}`)
                            if (nextElem) {
                                nextElem.focus();
                            }
                        }
                    }}
                    onChange={() => {
                        object[field] = ref.current.value;
                        if (onChangeExtra) onChangeExtra();
                    }}
                    onBlur={() => {
                        if (isNumber) {
                            const inputWithOutSpace = ref.current.value.replace(/\s/g, '').replace(/,/g, '.');
                            ref.current.value = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(inputWithOutSpace);
                        }
                        object[field] = ref.current.value;
                    }} />

            </div>
        </td>
    )
}

export default TDInput;