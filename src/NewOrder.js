import NewSupplier from './NewSupplier';
import OrderTable from './OrderTable';
import NewBuyer from './NewBuyer';
import Button from 'react-bootstrap/Button';
import { useState } from 'react';
import { Alert } from 'react-bootstrap';
import axios from 'axios';


function NewOrder({ order, setOrder, selectListsData, PORT, token, logOut, user }) {
  const [message, setMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("");
  const [litersForSale, setLiterForSale] = useState({});
  const [currentBuyer, setCurrentBuyer] = useState(null);
  const [currentSupplier, setCurrentSupplier] = useState(null);

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
  const handleShowNewBuyer = () => {
    setCurrentBuyer(null);
    setMessage("");
    setShowNewBuyer(true);

  };

  const handleEditBuyer = (index) => {
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
    console.log(litersForSale)
    Object.values(litersForSale).forEach(elem => alertMessage = elem < 0 ? 'Количество литров по типу продукта у покупателей не может быть большем чем у поставщиков' : '')
    if (order.buyers.length === 0)
      alertMessage = 'Заполните раздел Покупатели'
    if (order.suppliers.length === 0)
      alertMessage = 'Заполните раздел Поставщики'
    if (alertMessage === '') {
      axios.post(`http://${window.location.hostname}:${PORT}/neworder`, {
        order,
        token,
      })
        .then(function (response) {
          if (response.data === 'заявка создана') {
            clearData();
            setAlertVariant("success");
            setMessage("Заявка создана")
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
        order={order} />
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
      />
      {message !== ""
        ? <Alert key={alertVariant} variant={alertVariant}> {message} </Alert>
        : ""
      }
      <Button variant="danger " onClick={clearData} style={{ marginRight: "15px" }}>Очистить</Button>
      <Button variant="success" onClick={sendData}>Создать заявку</Button>
    </>

  );
}


export default NewOrder;