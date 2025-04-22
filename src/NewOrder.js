import NewSupplier from './NewSupplier';
import OrderTable from './OrderTable';
import NewBuyer from './NewBuyer';
import Button from 'react-bootstrap/Button';
import { useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import axios from 'axios';


function NewOrder({ order, setOrder, selectListsData, PORT, token, logOut, user, setActiveComponent }) {
  const [message, setMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("");
  const [litersForSale, setLiterForSale] = useState({});
  const [currentBuyer, setCurrentBuyer] = useState(null);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [buttonH, setButtonH] = useState(false);

  const handleRefreshLitersForSale = () => {
    let result = {};
    order.suppliers.forEach((elem) => {
      result[elem.typeOfProduct] = (result[elem.typeOfProduct] || 0) + (+elem.liters);
    })
    order.buyers.forEach((elem) => {
      result[elem.typeOfProduct] = (result[elem.typeOfProduct] || 0) - (+elem.liters);
    })
    setLiterForSale(() => { return result });
  }


  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const handleCloseNewSupplier = () => {
    setShowNewSupplier(false);
    handleRefreshLitersForSale();
  };
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
    setShowNewBuyer(false)
  };
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

  const clearData = () => {
    setMessage("");
    setOrder({
      suppliers: [],
      buyers: [],
    });
    setCurrentBuyer(null);
    setCurrentSupplier(null);
    setLiterForSale({});
  }
  const sendData = () => {
    let alertMessage = '';
    Object.values(litersForSale).forEach(elem => alertMessage = elem < 0 ? 'Количество литров по типу продукта у покупателей не может быть большем чем у поставщиков' : '')
    if (order.buyers.length === 0)
      alertMessage = 'Заполните раздел Покупатели'
    if (order.suppliers.length === 0)
      alertMessage = 'Заполните раздел Поставщики'
    // if (alertMessage === '') {
    if (false) {
      axios.post(`http://${window.location.hostname}:${PORT}/neworder`, {
        order,
        token,
      })
        .then(function (response) {
          if (response.status === 202) {
            clearData();
            setAlertVariant("success");
            sessionStorage.createdOrderId = response.data;
            sessionStorage.bgColor = 'rgba(61, 174, 12, 0.44)';
            setActiveComponent('AllOrders')
            // setMessage("Заявка создана")  //id = response.data
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
      <OrderTable
        handleShowNewSupplier={handleShowNewSupplier}
        handleShowNewBuyer={handleShowNewBuyer}
        handleEditSupplier={handleEditSupplier}
        handleEditBuyer={handleEditBuyer}
        handleRefreshLitersForSale={handleRefreshLitersForSale}
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
        litersForSale={litersForSale}
        currentBuyer={currentBuyer}
        logOut={logOut}
        token={token}
        user={user}
        buttonH={buttonH}
      />
      {message !== ""
        ? <Alert key={alertVariant} variant={alertVariant}> {message} </Alert>
        : ""
      }
      <Button variant="danger " onClick={clearData} style={{ marginRight: "15px" }}>Очистить</Button>
      <Button variant="success" onClick={() => {
        console.log(litersForSale);
        sendData();
      }}>Создать заявку</Button>
    </>

  );
}


export default NewOrder;