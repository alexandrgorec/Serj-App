
import OrderTable from './OrderTable';
import Button from 'react-bootstrap/Button';
import { useState, useContext } from 'react';
import { Alert } from 'react-bootstrap';
import { userContext } from './App';
import { useNavigate } from 'react-router-dom';





function NewOrder({ order, setOrder }) {
  

  const redirect = useNavigate();
  const { aAxios } = useContext(userContext);
  const [message, setMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("");


  const clearData = () => {
    setMessage("");
    setOrder({
      suppliers: [],
      buyers: [],
    });
  }
  const sendData = () => {
    let alertMessage = '';
    // Object.values(litersForSale).forEach(elem => alertMessage = elem < 0 ? 'Количество литров по типу продукта у покупателей не может быть большем чем у поставщиков' : '')
    if (order.buyers.length === 0)
      alertMessage = 'Заполните раздел Покупатели'
    if (order.suppliers.length === 0)
      alertMessage = 'Заполните раздел Поставщики'
    let buyersH = document.querySelectorAll(".buyerH") || [];
    order.haveEmptyBuyerH = false;
    buyersH.forEach(buyerH => buyerH.value == '' ? order.haveEmptyBuyerH = true : '')
    if (alertMessage === '') {
      aAxios.post(`/user/neworder`, {
        order,
      })
        .then(function (response) {
          if (response.status === 202) {
            clearData();
            setAlertVariant("success");
            sessionStorage.createdOrderId = response.data;
            sessionStorage.bgColor = 'rgba(61, 174, 12, 0.44)';
            redirect('/allorders');
            // setMessage("Заявка создана")  //id = response.data
          }
        })
        .catch(function (error) {

        });
    }
    else {
      setAlertVariant("danger");
      setMessage(alertMessage)
    }
  }


  return (
    <>
      { }
      <OrderTable
        order={order}
        setOrder={setOrder}
      />
      {message !== ""
        ? <Alert key={alertVariant} variant={alertVariant}> {message} </Alert>
        : ""
      }
      <Button variant="danger " onClick={clearData} style={{ marginRight: "15px" }}>Очистить</Button>
      <Button variant="success" onClick={() => {
        sendData();
      }}>Создать заявку</Button>
    </>

  );
}


export default NewOrder;