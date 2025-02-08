import NewSupplier from './NewSupplier';
import OrderTable from './OrderTable';
import NewBuyer from './NewBuyer';
import Button from 'react-bootstrap/Button';
import { useState, useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import axios from 'axios';

const PORT = window.location.port === '3000' ? 3001 : window.location.port;

function NewOrder({ order, setOrder }) {
  const [alert, setAlert] = useState("");
  const [alertVariant, setAlertVariant] = useState("");
  const [selectListsData, setSelectListsData] = useState({
    SUPPLIERS: [],
    BUYERS: [],
    DRIVERS: [],
    TYPE_OF_PRODUCT: [],
    MANAGERS: [],
  });
  const [litersForSale, setLiterForSale] = useState({});



  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const handleCloseNewSupplier = () => setShowNewSupplier(false);
  const handleShowNewSupplier = () => {
    setShowNewSupplier(true);
    setAlert("");
  };

  const [showNewBuyer, setShowNewBuyer] = useState(false);
  const handleCloseNewBuyer = () => setShowNewBuyer(false);
  const handleShowNewBuyer = () => {
    setShowNewBuyer(true);
    setAlert("");
  };

  const clearData = () => {
    setAlert("");
    setOrder({
      suppliers: [],
      buyers: [],
    });
    setLiterForSale({});
  }
  const sendData = () => {
    if (order.suppliers.length != 0 && order.buyers.length != 0) {
      axios.post(`http://${window.location.hostname}:${PORT}/neworder`, order)
        .then(function (response) {
          if (response.data === 'заявка создана') {
            clearData();
            setAlertVariant("success");
            setAlert("Заявка создана")
          }
        })
        .catch(function (error) {
          console.log(error);
        });
    }
    else {
      setAlertVariant("danger");
      setAlert("Заявка заполнена не полностью")
    }
  }

  useEffect(() => {
    axios.post(`http://${window.location.hostname}:${PORT}/getListsData`)
      .then((response) => {
        if (response.status === 200) {
          setSelectListsData(response.data);
        }
      })
  }, selectListsData);

  return (
    <>
      <OrderTable
        handleShowNewSupplier={handleShowNewSupplier}
        handleShowNewBuyer={handleShowNewBuyer}
        order={order} />
      <NewSupplier
        setOrder={setOrder}
        selectListsData={selectListsData}
        handleCloseNewSupplier={handleCloseNewSupplier}
        showNewSupplier={showNewSupplier}
        setLiterForSale={setLiterForSale}
      />
      <NewBuyer
        order={order}
        setOrder={setOrder}
        selectListsData={selectListsData}
        handleCloseNewBuyer={handleCloseNewBuyer}
        showNewBuyer={showNewBuyer}
        setLiterForSale={setLiterForSale}
        litersForSale={litersForSale}
      />
      {alert != ""
        ? <Alert key={alertVariant} variant={alertVariant}> {alert} </Alert>
        : ""
      }
      <Button variant="danger " onClick={clearData} style={{ marginRight: "15px" }}>Очистить</Button>
      <Button variant="success" onClick={sendData}>Создать заявку</Button>
    </>

  );
}


export default NewOrder;