import Form from 'react-bootstrap/Form';
import { useRef, useEffect, useContext } from "react";
import InputGroup from 'react-bootstrap/InputGroup';
import { userContext } from './App';



function TDInput({ object, value = '', disabled = false, fontSize = '14px', type, field = '', display = '', onChangeExtra = null, tdClassName = '', inputClassName = '' }) {
    const ref = useRef(null);
    const isNumber = type === 'number' ? true : false;

    const formatPreserveFraction = (raw) => {
        if (raw === undefined || raw === null) return '';
        let s = String(raw).trim();
        if (s === '') return '';

        const hadComma = s.includes(',');
        s = s.replace(/\s/g, '').replace(/,/g, '.');

        const sign = s.startsWith('-') ? '-' : '';
        if (sign) s = s.slice(1);

        const [intRaw, fracRaw] = s.split('.');
        if (!intRaw || !/^\d+$/.test(intRaw)) return '';

        const intFormatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(intRaw));
        if (fracRaw === undefined) return sign + intFormatted;
        if (!/^\d+$/.test(fracRaw)) return sign + intFormatted;

        return sign + intFormatted + (hadComma ? ',' : '.') + fracRaw;
    };

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
                            ref.current.value = formatPreserveFraction(ref.current.value);
                        }
                        object[field] = ref.current.value;
                    }} />

            </div>
        </td>
    )
}

export default TDInput;