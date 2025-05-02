import NewSupplier from './NewSupplier';
import OrderTable from './OrderTable';
import NewBuyer from './NewBuyer';
import Button from 'react-bootstrap/Button';

import { useState, useRef, useContext } from 'react';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { Alert } from 'react-bootstrap';
import axios from 'axios';
import Stack from 'react-bootstrap/Stack';
import { userContext } from './App';





function EditOrder({ order, setOrder, handleSetEditMode, openEditedOrder }) {
    const { logOut, token, PORT } = useContext(userContext);
    const [message, setMessage] = useState("");
    const [alertVariant, setAlertVariant] = useState("");
    const [litersForSale, setLiterForSale] = useState({});
    const [currentBuyer, setCurrentBuyer] = useState(null);
    const [currentSupplier, setCurrentSupplier] = useState(null);
    const refComments = useRef(null);
    const refIp = useRef(null);
    const refDriver = useRef(null);
    const refCost = useRef(null);
    const refOtk = useRef(null);
    const refDate = useRef(null);

    const [buttonH, setButtonH] = useState(false);



    const handleRefreshLitersForSale = () => {
        let result = {};
        order.suppliers.forEach((elem) => {
            result[elem.typeOfProduct] = (result[elem.typeOfProduct] || 0) + (+elem.liters);
        })
        order.buyers.forEach((elem) => {
            result[elem.typeOfProduct] = (result[elem.typeOfProduct] || 0) - (+elem.liters);
        })
        setLiterForSale(result);
    }





    const [showNewSupplier, setShowNewSupplier] = useState(false);
    const handleCloseNewSupplier = () => {
        handleRefreshLitersForSale();
        setShowNewSupplier(false);
    }
    const handleShowNewSupplier = () => {
        setCurrentSupplier(null);
        setMessage("");
        setShowNewSupplier(true);
    };

    const handleEditSupplier = (index) => {
        setCurrentSupplier(index);
        setMessage("");
        setShowNewSupplier(true);

    };

    const [showNewBuyer, setShowNewBuyer] = useState(false);
    const handleCloseNewBuyer = () => {
        handleRefreshLitersForSale();
        setShowNewBuyer(false);
    }
    const handleShowNewBuyer = (H = false) => {
        handleRefreshLitersForSale();
        setButtonH(H);
        setCurrentBuyer(null);
        setMessage("");
        setShowNewBuyer(true);
    };

    const handleEditBuyer = (index, buttonH) => {
        handleRefreshLitersForSale();
        setButtonH(buttonH);
        setCurrentBuyer(index);
        setMessage("");
        setShowNewBuyer(true);
    };

    const sendData = () => {
        const saveOrder = order;
        saveOrder.comments = refComments.current.value;
        saveOrder.ip = refIp.current.value;
        saveOrder.driver = refDriver.current.value;
        saveOrder.cost = refCost.current.value;
        saveOrder.otk = refOtk.current.value;
        saveOrder.date = refDate.current.value;

        setOrder(saveOrder);
        let alertMessage = '';
        // Object.values(litersForSale).forEach(elem => alertMessage = elem < 0 ? 'Количество литров по типу продукта у покупателей не может быть большем чем у поставщиков' : '')
        if (order.buyers.length === 0)
            alertMessage = 'Заполните раздел Покупатели'
        if (order.suppliers.length === 0)
            alertMessage = 'Заполните раздел Поставщики'
        if (alertMessage === '') {
            axios.post(`http://${window.location.hostname}:${PORT}/editorder`, {
                order,
                token,
            })
                .then(function (response) {
                    if (response.status === 202) {
                        setAlertVariant("success");
                        setMessage("Изменения сохранены")  //id = response.data
                        sessionStorage.createdOrderId = order.id;
                        sessionStorage.bgColor = 'rgba(6, 55, 146, 0.338)';
                    }
                })
                .catch(function (error) {
                    console.log(error);
                    if (error.response.status === 999) {
                        logOut();
                    }
                });
        }
        else {
            setAlertVariant("danger");
            setMessage(alertMessage)
        }
    }

    return (
        <>
            <Stack className='mb-2 noselect' direction='horizontal' >
                <Button variant="primary " className='mt-2 p-5 pt-3 pb-3' onClick={() => {
                    handleSetEditMode();
                    openEditedOrder();
                }}>
                    Назад
                </Button>
                <h2 className='m-3 mt-1 mb-1 p-0 ms-auto'>Заявка № {order.id}</h2>
                
                <FloatingLabel label="Дата" className="mt-1 p-0" >
                    <Form.Control as="input" type='date' ref={refDate} defaultValue={order.date} />
                </FloatingLabel>
                <Button variant="success" className='mt-2 p-3 ms-auto' onClick={() => {
                    sendData();
                    document.querySelector(".content").scrollTo(0, 9999);
                }}>Сохранить изменения</Button>
            </Stack>
            {/* <div className='d-grid'>
                <Button variant="outline-primary " className='mt-2 p-2' onClick={() => {
                    handleSetEditMode();
                    openEditedOrder();
                }}>
                    Назад
                </Button>
            </div> */}
            <OrderTable
                handleShowNewSupplier={handleShowNewSupplier}
                handleShowNewBuyer={handleShowNewBuyer}
                handleEditSupplier={handleEditSupplier}
                handleEditBuyer={handleEditBuyer}
                handleRefreshLitersForSale={handleRefreshLitersForSale}
                order={order}
                setOrder={setOrder}
            />
            <NewSupplier
                order={order}
                setOrder={setOrder}
                handleCloseNewSupplier={handleCloseNewSupplier}
                showNewSupplier={showNewSupplier}
                currentSupplier={currentSupplier}
            />
            <NewBuyer
                order={order}
                setOrder={setOrder}
                handleCloseNewBuyer={handleCloseNewBuyer}
                showNewBuyer={showNewBuyer}
                litersForSale={litersForSale}
                currentBuyer={currentBuyer}
                buttonH={buttonH}
            />
            <Stack direction='horizontal' className='mt-0'>

                <div className='mb-3 col-6 px-2' >
                    <Form.Control as='textarea' placeholder='Комментарии' rows={10} ref={refComments} defaultValue={order.comments ? order.comments : ''} />
                </div>
                <div className='mb-3 col-6'>

                    <center>
                        <FloatingLabel label="ИП Перевозчик" className="mb-2 col-11" >
                            <Form.Control as="input" type='text' ref={refIp} defaultValue={order.ip} />
                        </FloatingLabel>
                        <FloatingLabel label="Водитель" className="mb-2 col-11" >
                            <Form.Control as="input" type='text' ref={refDriver} defaultValue={order.driver} />
                        </FloatingLabel>
                        <FloatingLabel label="Стоимость доставки" className="mb-2 col-11" >
                            <Form.Control as="input" type='number' ref={refCost} defaultValue={order.cost} />
                        </FloatingLabel>
                        <FloatingLabel label="ОТК" className="mb-0 col-11" >
                            <Form.Control as="input" type='text' ref={refOtk} defaultValue={order.cost} />
                        </FloatingLabel>
                    </center>
                </div>

            </Stack>
            {/* <div className='d-grid'>
                <Button variant="success" className='mt-0 p-3' onClick={() => {
                    sendData();
                    document.querySelector(".content").scrollTo(0, 9999);
                }}>Сохранить изменения</Button>
            </div> */}
            {message !== ""
                ? <Alert key={alertVariant} className='mt-3' variant={alertVariant}> {message} </Alert>
                : ""
            }



        </>

    );
}


export default EditOrder;