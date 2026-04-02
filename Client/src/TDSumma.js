import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useRef, useState, useEffect } from "react";
import InputGroup from 'react-bootstrap/InputGroup';



function TDSumma({ object, field = '', fontSize = '16px', display = '', calcTrigger = 0 }) {
    let tabIndex = sessionStorage.tabIndex++;
    const ref = useRef(null);
    const [mode, setMode] = useState(object.summaMode || 'liters');

    const calculate = (currentMode) => {
        const m = currentMode !== undefined ? currentMode : mode;
        const raw = m === 'liters' ? object['liters'] : object['tons'];
        const price = object['price'];
        if (!raw && !price) return;
        const num1 = Number(String(raw || '0').replace(/\s/g, '').replace(/,/g, '.'));
        const num2 = Number(String(price || '0').replace(/\s/g, '').replace(/,/g, '.'));
        const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(num1 * num2);
        if (ref.current) ref.current.value = formatted;
        object[field] = formatted;
    };

    useEffect(() => {
        if (calcTrigger > 0) {
            const m = object?.summaMode || 'liters';
            const raw = m === 'liters' ? object?.liters : object?.tons;
            const price = object?.price;
            if (!raw && !price) return;
            const num1 = Number(String(raw || '0').replace(/\s/g, '').replace(/,/g, '.'));
            const num2 = Number(String(price || '0').replace(/\s/g, '').replace(/,/g, '.'));
            const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(num1 * num2);
            if (ref.current) ref.current.value = formatted;
            object[field] = formatted;
        }
    }, [calcTrigger, field, object, object?.summaMode]);

    const toggleMode = () => {
        const newMode = mode === 'liters' ? 'tons' : 'liters';
        object.summaMode = newMode;
        setMode(newMode);
        calculate(newMode);
    };

    return (
        <td className='m-0 p-0 td-summa' style={{ display: display }}>
            <InputGroup size='sm' className='summa-input-group'>
                <Form.Control
                    className={`tabIndex-${tabIndex} summa-input`}
                    style={{ fontSize: fontSize }}
                    as='input'
                    type='text'
                    defaultValue={object[field]}
                    autoComplete="off"
                    ref={ref}
                    inputMode="decimal"
                    onKeyDown={(evt) => {
                        if (!(evt.key.match(/\d/)
                            || evt.key === 'Backspace'
                            || evt.key === ','
                            || evt.key === '.'
                            || evt.key === 'Tab'
                            || evt.key === 'ArrowLeft'
                            || evt.key === 'ArrowRight'
                            || evt.key === 'Delete')) {
                            evt.preventDefault();
                        }
                        if (evt.key === 'Enter') {
                            let nextElem = document.querySelector(`.tabIndex-${tabIndex + 1}`)
                            if (nextElem) nextElem.focus();
                        }
                    }}
                    onBlur={() => {
                        const inputWithOutSpace = ref.current.value.replace(/\s/g, '').replace(/,/g, '.');
                        ref.current.value = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(inputWithOutSpace);
                        object[field] = ref.current.value;
                    }}
                />
                <Button
                    tabIndex={-1}
                    variant={mode === 'liters' ? 'info' : 'warning'}
                    size="sm"
                    onClick={toggleMode}
                    title={mode === 'liters' ? 'Литры × Цена' : 'Тонны × Цена'}
                >
                    {mode === 'liters' ? 'ЛхЦ' : 'ТхЦ'}
                </Button>
            </InputGroup>
        </td>
    );
}

export default TDSumma;
