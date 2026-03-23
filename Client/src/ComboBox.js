import "./ComboBox.css";
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useRef, useContext, useState } from "react";
import InputGroup from 'react-bootstrap/InputGroup';
import { FaSave } from "react-icons/fa";
import { MdDelete, MdClear } from "react-icons/md";
import { userContext } from "./App";
import { Typeahead } from "react-bootstrap-typeahead";

const associations = {
    SUPPLIERS: "Поставщик",
    TYPE_OF_PRODUCT: "Тип продукта",
    BUYERS: "Покупатель",
}


function ComboBox({ isBuyerH = '', iconSize = '2em', fontSize = '16px', id, object, nameDataList, field = '', display = '' }) {
    const { user, setUser, aAxios } = useContext(userContext);
    const typeaheadRef = useRef(null);
    let tabIndex = sessionStorage.tabIndex++;
    if (window.innerWidth < 850) {
        fontSize = '10px';
        iconSize = '1em'
    }
    const data = user?.selectListsData?.[nameDataList] || [];
    return (
        <div style={{ display: display }}>
            <InputGroup size='sm'>
                <Typeahead className={`col-9`} id={id} ref={typeaheadRef}
                    inputProps={{
                        className: `tabIndex-${tabIndex} ${isBuyerH}`
                    }}
                    onKeyDown={(evt) => {

                        if (evt.key == 'Enter') {
                            let nextElem = document.querySelector(`.tabIndex-${tabIndex + 1}`)
                            console.log(nextElem)
                            if (nextElem) {
                                nextElem.focus();
                            }
                        }
                    }}
                    defaultInputValue={object[field]}
                    labelKey="name"
                    onChange={(selected) => {
                        object[field] = selected[0];
                    }}
                    onInputChange={(text) => {
                        object[field] = text;
                    }}
                    onBlur={() => {
                        if (typeaheadRef.current) {
                            typeaheadRef.current.hideMenu();
                        }
                    }}
                    options={data}
                    placeholder={associations[nameDataList]}
                />
                <InputGroup.Text className="col-1" style={{ cursor: 'pointer' }} onClick={() => {
                    if (typeaheadRef.current) {
                        typeaheadRef.current.clear();
                    }

                }
                }>
                    <MdClear className="icon" />

                </InputGroup.Text>

                <InputGroup.Text className="col-1" style={{ cursor: 'pointer' }} onClick={() => { //save
                    const selectListsDataEdited = user.selectListsData;
                    if (!selectListsDataEdited[nameDataList].includes(object[field]) && object[field] !== '') {
                        selectListsDataEdited[nameDataList].push(object[field]);
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


                <InputGroup.Text style={{ cursor: 'pointer' }} className="col-1 p-0 pt-0" onClick={() => {
                    setUser(user => {
                        user.selectListsData[nameDataList] = user.selectListsData[nameDataList].filter(item => object[field] !== item)
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

                }><MdDelete className="icon" size={iconSize} style={{ color: 'rgba(194, 65, 65, 0.82)' }} />
                </InputGroup.Text>




            </InputGroup>

        </div>
    )
}

export default ComboBox;