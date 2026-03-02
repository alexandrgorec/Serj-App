import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useRef, useContext, useState } from "react";
import InputGroup from 'react-bootstrap/InputGroup';
import { FaSave } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { userContext } from "./App";



function TDSumma({ object, field = '', fontSize = '16px', display = '' }) {
    let tabIndex = sessionStorage.tabIndex++;
    const ref = useRef(null);
    const handleClick = (value) => {
        ref.current.value = value;
        let event = new Event('input')
        ref.current.dispatchEvent(event);
        object[field] = ref.current.value;
    }

    return (
        <td className='m-0 p-0' style={{display:display}}>
            <InputGroup size='sm'>
                <Form.Control className={`tabIndex-${tabIndex}`} style={{ fontSize: fontSize }} as='input' type={'text'} defaultValue={object[field]} autoComplete="off" ref={ref}
                    onKeyDown={(evt) => {
                        if (!(evt.key.match(/\d/)
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
                    onBlur={() => {
                        const inputWithOutSpace = ref.current.value.replace(/\s/g, '').replace(/,/g, '.');
                        ref.current.value = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(inputWithOutSpace);
                        object[field] = ref.current.value;
                    }} />
                {/* <Form.Control style={{ fontSize: '16px' }} className={`tabIndex-${tabIndex} ${isBuyerH}`} as='input' type="number" defaultValue={object[field]} autoComplete="off" ref={ref}
                    onKeyDown={(evt) => {
                        if (evt.key == 'Enter') {
                            let nextElem = document.querySelector(`.tabIndex-${tabIndex + 1}`)
                            if (nextElem) {
                                nextElem.focus();
                            }
                        }
                    }}
                    onInput={() => {
                        object[field] = ref.current.value;
                    }} /> */}


                <Dropdown >
                    <Dropdown.Toggle size="lg" split variant={'secondary'} tabIndex={-1} />
                    <Dropdown.Menu >
                        <Dropdown.Item as={Button} size="lg" variant='outline-light' className="pb-1 pt-0 px-1" onClick={() => {
                            ref.current.value = Number(object['liters'].replace(/\s/g, '')) * object['price'];
                            let event = new Event('input');
                            ref.current.value = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(ref.current.value);
                            ref.current.dispatchEvent(event);
                            object[field] = ref.current.value;
                        }}>
                            <InputGroup.Text className="pb-0 pt-0" onClick={() => { }} >Литры х Цена</InputGroup.Text>
                        </Dropdown.Item>
                        <Dropdown.Item as={Button} size="lg" variant='outline-light' className="pb-1 pt-0 px-1" onClick={() => {
                        }}>
                            <InputGroup.Text className="pb-0 pt-0" onClick={() => {
                                ref.current.value = Number(object['tons'].replace(/\s/g, '')) * object['price'];
                                let event = new Event('input');
                                ref.current.value = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(ref.current.value);
                                ref.current.dispatchEvent(event);
                                object[field] = ref.current.value;
                            }} >Тонны х Цена</InputGroup.Text>
                        </Dropdown.Item>

                    </Dropdown.Menu>
                </Dropdown>
            </InputGroup>

        </td>
    )
}

export default TDSumma;