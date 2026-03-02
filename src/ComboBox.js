import "./ComboBox.css";
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useRef, useContext, useState } from "react";
import InputGroup from 'react-bootstrap/InputGroup';
import { FaSave } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { userContext } from "./App";



function ComboBox({ label = '', isBuyerH = '', iconSize = '2em', fontSize = '16px', id, object, nameDataList, field = '', display = '' }) {
    const { user, setUser, aAxios } = useContext(userContext);
    let tabIndex = sessionStorage.tabIndex++;
    const ref = useRef(null);
    const handleClick = (value) => {
        ref.current.value = value;
        let event = new Event('input')
        ref.current.dispatchEvent(event);
        object[field] = ref.current.value;
    }
    if (window.innerWidth < 850) {
        fontSize = '10px';
        iconSize='1em'
    }
    const data = user?.selectListsData?.[nameDataList] || [];
    return (
        <div style={{ display: display }}>
            <InputGroup size='sm'>
                <Form.Control style={{ fontSize: fontSize }} className={`tabIndex-${tabIndex} ${isBuyerH}`} as='input' type="text" defaultValue={object[field]} autoComplete="off" ref={ref} id={id}
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
                    }} />

                <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => {
                    const selectListsDataEdited = user.selectListsData;
                    if (!selectListsDataEdited[nameDataList].includes(ref.current.value) && ref.current.value !== '') {
                        selectListsDataEdited[nameDataList].push(ref.current.value);

                        aAxios.post(`/user/editSelectListsData`, {
                            selectListsData: selectListsDataEdited,
                        })
                            .then(function (response) {
                                if (response.status === 202) {
                                    console.log("edited");
                                }
                            })
                            .catch(function (error) {

                            })
                    }
                    setUser(user => {
                        user.selectListsData = selectListsDataEdited;
                        return { ...user };
                    })

                }
                }>
                    <FaSave className="icon" />

                </InputGroup.Text>

                <Dropdown >
                    <Dropdown.Toggle size="lg" split variant={'secondary'} tabIndex={-1} />
                    <Dropdown.Menu >
                        {
                            data.map(item =>
                                <Dropdown.Item key={item} as={Button} size="lg" variant='outline-light' className="pb-1 pt-0 px-1" onClick={() => { }}>
                                    <InputGroup>
                                        <InputGroup.Text className="col-9 pb-0 pt-0" onClick={() => handleClick(item)} >{item}</InputGroup.Text>
                                        <InputGroup.Text style={{ cursor: 'pointer' }} className="col-3 p-0 pt-0" onClick={() => {
                                            setUser(user => {
                                                user.selectListsData[nameDataList] = user.selectListsData[nameDataList].filter(item2 => item !== item2)
                                                return { ...user };

                                            })
                                            aAxios.post(`/user/editSelectListsData`, {
                                                selectListsData: user.selectListsData,
                                            })
                                                .then(function (response) {
                                                    if (response.status === 202) {
                                                        console.log("edited");
                                                    }
                                                })
                                                .catch(function (error) {

                                                })

                                        }
                                        }><MdDelete className="icon" size={iconSize} style={{ color: 'rgba(194, 65, 65, 0.82)' }} /></InputGroup.Text>
                                    </InputGroup>
                                </Dropdown.Item>
                            )
                        }
                    </Dropdown.Menu>
                </Dropdown>


            </InputGroup>

        </div>
    )
}

export default ComboBox;