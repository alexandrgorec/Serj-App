import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useRef, useState, useEffect } from "react";
import InputGroup from 'react-bootstrap/InputGroup';



function TDSumma({ object, field = '', fontSize = '16px', display = '', calcTrigger = 0 }) {
    let tabIndex = sessionStorage.tabIndex++;
    const ref = useRef(null);
    const [mode, setMode] = useState(object.summaMode || 'liters');

    const groupRuInt = (digits) => {
        // digits: string of only [0-9], no sign
        if (!digits) return '0';
        let s = digits.replace(/^0+(?=\d)/, '');
        let out = '';
        for (let i = 0; i < s.length; i++) {
            const posFromEnd = s.length - i;
            out += s[i];
            if (posFromEnd > 1 && posFromEnd % 3 === 1) out += ' ';
        }
        return out;
    };

    const parseDecimal = (raw) => {
        if (raw === undefined || raw === null) return null;
        let s = String(raw).trim();
        if (s === '') return null;
        s = s.replace(/\s/g, '').replace(/,/g, '.');
        const sign = s.startsWith('-') ? -1 : 1;
        if (sign === -1) s = s.slice(1);
        const [intRaw, fracRaw = ''] = s.split('.');
        if (!intRaw || !/^\d+$/.test(intRaw) || (fracRaw && !/^\d+$/.test(fracRaw))) return null;
        const scale = fracRaw.length;
        const digits = (intRaw + fracRaw).replace(/^0+(?=\d)/, '') || '0';
        return { sign, digits, scale };
    };

    const multiplyDigits = (a, b) => {
        // a,b: strings of digits [0-9], no sign. returns string digits.
        if (a === '0' || b === '0') return '0';
        const res = Array(a.length + b.length).fill(0);
        for (let i = a.length - 1; i >= 0; i--) {
            const ai = a.charCodeAt(i) - 48;
            for (let j = b.length - 1; j >= 0; j--) {
                const bj = b.charCodeAt(j) - 48;
                const idx = i + j + 1;
                const sum = res[idx] + ai * bj;
                res[idx] = sum % 10;
                res[idx - 1] += Math.floor(sum / 10);
            }
        }
        // normalize carries (in case res[idx-1] exceeded 9 multiple times)
        for (let k = res.length - 1; k > 0; k--) {
            if (res[k] >= 10) {
                const carry = Math.floor(res[k] / 10);
                res[k] = res[k] % 10;
                res[k - 1] += carry;
            }
        }
        let out = res.join('').replace(/^0+(?=\d)/, '');
        return out === '' ? '0' : out;
    };

    const multiplyDecimal = (a, b) => {
        if (!a || !b) return '';
        const sign = a.sign * b.sign;
        const scale = a.scale + b.scale;
        let digits = multiplyDigits(a.digits, b.digits);
        if (scale > 0) {
            if (digits.length <= scale) {
                digits = digits.padStart(scale + 1, '0');
            }
            const cut = digits.length - scale;
            const intPart = digits.slice(0, cut);
            const fracPart = digits.slice(cut); // keep ALL digits, no rounding
            const intGrouped = groupRuInt(intPart);
            const res = intGrouped + ',' + fracPart;
            return sign < 0 && digits !== '0' ? '-' + res : res;
        }
        const intGrouped = groupRuInt(digits);
        return sign < 0 && digits !== '0' ? '-' + intGrouped : intGrouped;
    };

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

    const calculate = (currentMode) => {
        const m = currentMode !== undefined ? currentMode : mode;
        const raw = m === 'liters' ? object?.liters : object?.tons;
        const price = object?.price;
        const formatted = multiplyDecimal(parseDecimal(raw), parseDecimal(price));
        if (ref.current) ref.current.value = formatted;
        object[field] = formatted;
    };

    useEffect(() => {
        if (calcTrigger > 0) {
            const m = object?.summaMode || 'liters';
            const raw = m === 'liters' ? object?.liters : object?.tons;
            const price = object?.price;
            const formatted = multiplyDecimal(parseDecimal(raw), parseDecimal(price));
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
                        ref.current.value = formatPreserveFraction(ref.current.value);
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
