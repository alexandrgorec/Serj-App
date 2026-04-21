import OrderTable from './OrderTable';
import EditOrderMobile from './EditOrderMobile';
import Button from 'react-bootstrap/Button';
import { useState, useRef, useContext } from 'react';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { Alert } from 'react-bootstrap';
import Stack from 'react-bootstrap/Stack';
import { userContext } from './App';
import { useNavigate } from 'react-router-dom';





function EditOrder() {
    const { setToast, aAxios, editingOrder, setEditingOrder } = useContext(userContext);
    const navigate = useNavigate();
    const isPhone = window.innerWidth <= 480;
    const [message, setMessage] = useState("");
    const [alertVariant, setAlertVariant] = useState("");
    const [cost, setCost] = useState(editingOrder.cost || 0);
    const refComments = useRef(null);
    const refIp = useRef(null);
    const refDriver = useRef(null);
    const refCost = useRef(null);
    const refOtk = useRef(null);
    const refDate = useRef(null);
    const refManager = useRef(null);
    if (editingOrder.id === undefined)
        navigate("/allorders");

    const addSupplier = () => {
        setEditingOrder((prev) => ({
            ...prev,
            suppliers: [
                ...(prev.suppliers || []),
                { liters: '', name: '', price: '', tons: '', typeOfProduct: '' },
            ],
        }));
    };

    const addBuyer = () => {
        setEditingOrder((prev) => ({
            ...prev,
            buyers: [
                ...(prev.buyers || []),
                { liters: '', name: '', price: '', tons: '', typeOfProduct: '' },
            ],
        }));
    };


    const sendData = () => {
        const saveOrder = editingOrder;
        if (!isPhone) {
            saveOrder.comments = refComments.current.value;
            saveOrder.ip = refIp.current.value;
            saveOrder.driver = refDriver.current.value;
            saveOrder.cost = refCost.current.value;
            saveOrder.otk = refOtk.current.value;
            saveOrder.date = refDate.current.value;
            saveOrder.manager = refManager.current.value;
        }

        setEditingOrder({ ...saveOrder });
        let alertMessage = '';
        // Object.values(litersForSale).forEach(elem => alertMessage = elem < 0 ? 'Количество литров по типу продукта у покупателей не может быть большем чем у поставщиков' : '')
        if (editingOrder.buyers.length === 0)
            alertMessage = 'Заполните раздел Покупатели'
        if (editingOrder.suppliers.length === 0)
            alertMessage = 'Заполните раздел Поставщики'
        editingOrder.haveEmptyBuyerH = (editingOrder.buyers || [])
            .some((buyer) => (buyer.buyersH || [])
                .some((buyerH) => String(buyerH?.name || '').trim() === ''));
        if (alertMessage === '') {
            aAxios.post(`/user/editorder`, {
                editingOrder,
            })
                .then(function (response) {
                    if (response.status === 202) {
                        setAlertVariant("success");
                        setToast("Изменения сохранены")  //id = response.data
                        sessionStorage.createdOrderId = editingOrder.id;
                    }
                })
                .catch(function (error) {

                });
        }
        else {
            setAlertVariant("danger");
            setMessage(alertMessage);
        }
    }
    return (
        <>
            {isPhone
                ? <EditOrderMobile
                    order={editingOrder}
                    setOrder={setEditingOrder}
                    onSave={sendData}
                    onBack={() => navigate(-1)}
                    cost={cost}
                    setCost={setCost}
                />
                : <>
                    <Stack className='mb-2 noselect' gap={2} direction='horizontal' >
                        <h4 className='m-3 mt-1 mb-1 p-0'>Заявка № {editingOrder.id}</h4>
                        <FloatingLabel label="Дата" className="mt-1 p-0" >
                            <Form.Control as="input" type='date' ref={refDate} defaultValue={editingOrder.date} onChange={() => {
                                editingOrder.date = refDate.current.value;
                                setEditingOrder({ ...editingOrder });
                            }} />
                        </FloatingLabel>
                        <Button tabIndex={-1} variant="primary" className='mt-2 p-2' onClick={addSupplier}>
                            Добавить поставщика
                        </Button>
                        <Button tabIndex={-1} variant="success" className='mt-2 p-2' onClick={addBuyer}>
                            Добавить покупателя
                        </Button>
                        <FloatingLabel label="Менеджер" className="mt-1 p-0">
                            <Form.Control
                                as="input"
                                type='text'
                                ref={refManager}
                                defaultValue={editingOrder.manager || ''}
                                onChange={() => {
                                    editingOrder.manager = refManager.current.value;
                                    setEditingOrder({ ...editingOrder });
                                }}
                            />
                        </FloatingLabel>
                        <Button tabIndex={-1} variant="primary " className='mt-2 pt-2 pb-2 ms-auto' onClick={() => {
                            navigate(-1);
                        }}>
                            Назад
                        </Button>
                        <Button tabIndex={-1} variant="success" className='mt-2 p-2' onClick={() => {
                            sendData();
                            // document.querySelector(".content").scrollTo(0, 9999);
                        }}>Сохранить</Button>
                    </Stack>
                    <OrderTable
                        order={editingOrder}
                        setOrder={setEditingOrder}
                        hideInlineAddButtons={true}
                        hideManagerInTable={true}
                    />

                    <Stack direction='horizontal' className='mt-0 align-items-stretch'>

                        <div className='mb-3 col-6 px-2 d-flex' >
                            <Form.Control as='textarea' placeholder='Комментарии' ref={refComments} defaultValue={editingOrder.comments ? editingOrder.comments : ''} style={{ resize: 'none', height: '100%' }} />
                        </div>
                        <div className='mb-3 col-6'>

                            <center>
                                <FloatingLabel label="ИП Перевозчик" className="mb-2 col-11" >
                                    <Form.Control as="input" type='text' ref={refIp} defaultValue={editingOrder.ip} />
                                </FloatingLabel>
                                <FloatingLabel label="Водитель" className="mb-2 col-11" >
                                    <Form.Control as="input" type='text' ref={refDriver} defaultValue={editingOrder.driver} />
                                </FloatingLabel>
                                <FloatingLabel label="Стоимость доставки" className="mb-2 col-11" >
                                    <Form.Control as="input" type='number' ref={refCost} defaultValue={editingOrder.cost} onChange={() => setCost(refCost.current.value)} />
                                </FloatingLabel>
                                <FloatingLabel label="ОТК" className="mb-2 col-11" >
                                    <Form.Control as="input" type='text' ref={refOtk} defaultValue={editingOrder.otk} />
                                </FloatingLabel>
                                <FloatingLabel label="Налог (40% от доставки)" className="mb-0 col-11" >
                                    <Form.Control as="input" type='number' readOnly value={Math.round(cost * 0.4)} />
                                </FloatingLabel>
                            </center>
                        </div>

                    </Stack>
                </>
            }
            {message !== ""
                ? <Alert key={alertVariant} className='mt-3' variant={alertVariant}> {message} </Alert>
                : ""
            }



        </>

    );
}


export default EditOrder;
