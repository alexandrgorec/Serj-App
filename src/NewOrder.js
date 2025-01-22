import NewSupplier from './NewSupplier';
import OrderTable from './OrderTable';
import NewBuyer from './NewBuyer';
import Button from 'react-bootstrap/Button';
import { useState } from 'react';
import { Alert } from 'react-bootstrap';
import axios from 'axios';



const SUPPLIERS = ['РНК', "Барс", "Грасс", "Юма"];
const BUYERS = ['Техресурс', "Слава", "Мостпроект", "тройка-тт", "Тайга", "Сеч", "Горбунов"];
const DRIVERS = ['Вася', "Петушара", "Димооооон", "Анатолий Степанович"];
const TYPE_OF_PRODUCT = ['ДТ-Е-К5', "Дизель", "Не дизель", "GT-POWER"];
const MANAGERS = ['Антон', "Сержан", "ЦАРЬ", "Иванов"];

function NewOrder({order,setOrder}) {

  const [alert, setAlert] = useState("");
  const [alertVariant, setAlertVariant] = useState("");

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
 }
  const sendData = () => {
    if (order.suppliers.length != 0 && order.buyers.length != 0) {
      axios.post(`http://${window.location.hostname}:3001/neworder`, order)
        .then(function (response) {
          if (response.data === "ok") {
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
  return (
    <>
      <div style={{ backgroundColor: "rgb(25, 147, 188)", textAlign: "center", padding: "5px", userSelect:"none" }}>Новая заявка</div>
      <OrderTable
        handleShowNewSupplier={handleShowNewSupplier}
        handleShowNewBuyer={handleShowNewBuyer}
        order={order} />
      <NewSupplier
        setOrder={setOrder}
        SUPPLIERS={SUPPLIERS}
        handleCloseNewSupplier={handleCloseNewSupplier}
        showNewSupplier={showNewSupplier}
        DRIVERS={DRIVERS}
        TYPE_OF_PRODUCT={TYPE_OF_PRODUCT} />
      <NewBuyer
        setOrder={setOrder}
        BUYERS={BUYERS}
        handleCloseNewBuyer={handleCloseNewBuyer}
        showNewBuyer={showNewBuyer}
        MANAGERS={MANAGERS}
        TYPE_OF_PRODUCT={TYPE_OF_PRODUCT} />
      {alert != ""
        ? <Alert key={alertVariant} variant={alertVariant}> {alert} </Alert>
        : ""
      }
      <Button variant="danger " onClick={clearData} style={{marginRight:"15px"}}>Очистить</Button>
      <Button variant="success" onClick={sendData}>Создать заявку</Button>
    </>

  );
}


export default NewOrder;