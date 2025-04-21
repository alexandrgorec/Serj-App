import NewSupplier from './NewSupplier';
import OrderTable from './OrderTable';
import NewBuyer from './NewBuyer';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useEffect, useState, useRef } from 'react';
import { Alert } from 'react-bootstrap';
import axios from 'axios';


function EditOrder({ order, setOrder, selectListsData, PORT, token, logOut, user, handleSetEditMode, openEditedOrder }) {
    const [message, setMessage] = useState("");
    const [alertVariant, setAlertVariant] = useState("");
    const [litersForSale, setLiterForSale] = useState({});
    const [currentBuyer, setCurrentBuyer] = useState(null);
    const [currentSupplier, setCurrentSupplier] = useState(null);
    const refComments = useRef(null);
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
    const handleCloseNewSupplier = () => setShowNewSupplier(false);
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
    const handleCloseNewBuyer = () => setShowNewBuyer(false);
    const handleShowNewBuyer = (H = false) => {
        setButtonH(H);
        setCurrentBuyer(null);
        setMessage("");
        setShowNewBuyer(true);

    };

    const handleEditBuyer = (index, buttonH) => {
        setButtonH(buttonH);
        setCurrentBuyer(index);
        setMessage("");
        setShowNewBuyer(true);

    };

    const sendData = () => {
        const saveOrder = order;
        saveOrder.comments = refComments.current.value;
        setOrder(saveOrder);
        let alertMessage = '';
        Object.values(litersForSale).forEach(elem => alertMessage = elem < 0 ? 'Количество литров по типу продукта у покупателей не может быть большем чем у поставщиков' : '')
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

    useEffect(() => {
        handleRefreshLitersForSale();
    }, [token])

    return (
        <>
            <div className='mt-2 mb-2 text-center noselect' ><h2>Редактитование заявки № {order.id}</h2></div>
            <OrderTable
                handleShowNewSupplier={handleShowNewSupplier}
                handleShowNewBuyer={handleShowNewBuyer}
                handleEditSupplier={handleEditSupplier}
                handleEditBuyer={handleEditBuyer}
                order={order}
                user={user}
                setOrder={setOrder}
                token={token}
                PORT={PORT}
                logOut={logOut}
            />
            <NewSupplier
                order={order}
                setOrder={setOrder}
                selectListsData={selectListsData}
                handleCloseNewSupplier={handleCloseNewSupplier}
                showNewSupplier={showNewSupplier}
                refreshLiterForSale={handleRefreshLitersForSale}
                currentSupplier={currentSupplier}
                logOut={logOut}
                token={token}
            />
            <NewBuyer
                order={order}
                setOrder={setOrder}
                selectListsData={selectListsData}
                handleCloseNewBuyer={handleCloseNewBuyer}
                showNewBuyer={showNewBuyer}
                refreshLiterForSale={handleRefreshLitersForSale}
                litersForSale={litersForSale}
                currentBuyer={currentBuyer}
                logOut={logOut}
                token={token}
                user={user}
                buttonH={buttonH}
            />
            <h2 className='mt-0 mb-2 text-center'>Комментарии:</h2>
            <Form.Control as='textarea' className='mb-3' rows={6} ref={refComments} defaultValue={order.comments ? order.comments : ''} />
            <Button variant="primary " onClick={() => {
                handleSetEditMode();
                openEditedOrder();
            }} style={{ marginRight: "15px" }}>Назад</Button>
            <Button variant="success" onClick={() => {
                sendData();
                document.querySelector(".content").scrollTo(0,999);
            }}>Сохранить изменения</Button>
            {message !== ""
                ? <Alert key={alertVariant} className='mt-3' variant={alertVariant}> {message} </Alert>
                : ""
            }
        </>

    );
}


export default EditOrder;