import "./ComboBox.css";
import { useRef, useContext } from "react";
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
    const isTablet = window.innerWidth <= 1024;
    const btnSize = isTablet ? 28 : 36;
    return (
        <div style={{ display: display }}>
            <div
                className="combobox-row"
                style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    alignItems: 'stretch',
                    width: '100%',
                }}
            >
                <div
                    className="combobox-typeahead-wrap"
                    style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        overflow: 'hidden',
                    }}
                >
                    <Typeahead className="combobox-typeahead" id={id} ref={typeaheadRef}
                    inputProps={{
                        className: `tabIndex-${tabIndex} ${isBuyerH}`,
                        style: {
                            fontSize: isTablet ? '12px' : fontSize,
                            paddingTop: isTablet ? '2px' : undefined,
                            paddingBottom: isTablet ? '2px' : undefined,
                        }
                    }}
                    onKeyDown={(evt) => {

                        if (evt.key === 'Enter') {
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
                    renderMenuItemChildren={(option) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{option}</span>
                            <MdDelete
                                className="icon"
                                size={iconSize}
                                style={{ color: 'rgba(194, 65, 65, 0.82)', flexShrink: 0 }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const updated = user.selectListsData[nameDataList].filter(item => item !== option);
                                    setUser(user => {
                                        user.selectListsData[nameDataList] = updated;
                                        return { ...user };
                                    });
                                    aAxios.post(`/user/editSelectListsData`, {
                                        selectListsData: { ...user.selectListsData, [nameDataList]: updated },
                                    });
                                    if (typeaheadRef.current) typeaheadRef.current.hideMenu();
                                }}
                            />
                        </div>
                    )}
                    />
                </div>

                <button
                    type="button"
                    className="combobox-btn combobox-btn-clear"
                    style={{
                        cursor: 'pointer',
                        flex: '0 0 auto',
                        width: `${btnSize}px`,
                        minWidth: `${btnSize}px`,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={() => {
                    if (typeaheadRef.current) {
                        typeaheadRef.current.clear();
                    }
                }}>
                    <MdClear className="combobox-btn-icon" style={{ width: '100%', height: '100%'}} />
                </button>

                <button
                    type="button"
                    className="combobox-btn combobox-btn-save d-flex justify-content-center align-items-center"
                    style={{
                        cursor: 'pointer',
                        flex: '0 0 auto',
                        width: `${btnSize}px`,
                        minWidth: `${btnSize}px`,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={() => {
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
                }}>
                    <FaSave className="combobox-btn-icon" style={{ width: '70%', height: '70%' }} />
                </button>
            </div>

        </div>
    )
}

export default ComboBox;