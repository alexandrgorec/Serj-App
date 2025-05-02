import "./ComboBox.css";
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useRef, useState, useContext } from "react";
import InputGroup from 'react-bootstrap/InputGroup';
import { FaSave } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import axios from "axios";
import { userContext } from "./App";



function ComboBox({ data = [], label = '', id, nameDataList, defaultValue = undefined, display = '' }) {
    const { logOut, token, user, setUser, PORT } = useContext(userContext);
    const [state, reload] = useState(null);
    const ref = useRef(null);
    const handleClick = (value) => {
        ref.current.value = value;
        let event = new Event('change')
        ref.current.dispatchEvent(event);
    }
    return (
        <div style={{ display: display }}>
            <InputGroup size='lg'>
                <FloatingLabel label={label}>
                    <Form.Control as='input' type="text" defaultValue={defaultValue} autoComplete="off" ref={ref} id={id} />
                </FloatingLabel>
                <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => {
                    const selectListsDataEdited = user.selectListsData;
                    console.log("selectListsDataEdited:", selectListsDataEdited);
                    console.log("nameDataList:", nameDataList);
                    if (!selectListsDataEdited[nameDataList].includes(ref.current.value) && ref.current.value !== '') {
                        selectListsDataEdited[nameDataList].push(ref.current.value);

                        axios.post(`http://${window.location.hostname}:${PORT}/editSelectListsData`, {
                            selectListsData: selectListsDataEdited,
                            token,
                        })
                            .then(function (response) {
                                if (response.status === 202) {
                                    console.log("edited");
                                }
                            })
                            .catch(function (error) {
                                console.log(error);
                                if (error.response.status === 999) {
                                    logOut();
                                }
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

                <Dropdown>
                    <Dropdown.Toggle size="lg" split variant={'secondary'} />
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
                                            axios.post(`http://${window.location.hostname}:${PORT}/editSelectListsData`, {
                                                selectListsData: user.selectListsData,
                                                token,
                                            })
                                                .then(function (response) {
                                                    if (response.status === 202) {
                                                        console.log("edited");
                                                    }
                                                })
                                                .catch(function (error) {
                                                    console.log(error);
                                                    if (error.response.status === 999) {
                                                        logOut();
                                                    }
                                                })

                                        }
                                        }><MdDelete className="icon" size={'2em'} style={{ color: 'rgba(194, 65, 65, 0.82)' }} /></InputGroup.Text>
                                    </InputGroup>
                                </Dropdown.Item>
                            )
                        }
                    </Dropdown.Menu>
                </Dropdown>

                {/* <div className="vr" />
                    <div className="vr" />
                    <div className="vr" />
                    <Dropdown as={ButtonGroup} >
                    <Dropdown.Toggle size="lg" split variant={'secondary'} />
                    <Dropdown.Menu>
                        {
                            data.map(item =>
                                <Dropdown.Item as={Button} key={item} size="lg" onClick={() => handleClick(item)} >{item}</Dropdown.Item>
                            )
                        }
                    </Dropdown.Menu>
                </Dropdown> */}
            </InputGroup>
            <br />
        </div>
    )
}

export default ComboBox;