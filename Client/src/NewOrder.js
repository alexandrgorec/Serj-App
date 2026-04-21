
import OrderTable from './OrderTable';
import NewOrderMobile from './NewOrderMobile';
import './NewOrder.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Stack from 'react-bootstrap/Stack';
import { useState, useContext } from 'react';
import { Alert } from 'react-bootstrap';
import { userContext } from './App';
import { useNavigate } from 'react-router-dom';





function NewOrder({ order, setOrder }) {
  
  const isPhone = window.innerWidth <= 480;

  const redirect = useNavigate();
  const { aAxios } = useContext(userContext);
  const [message, setMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("");

  const addSupplier = () => {
    setOrder((prev) => ({
      ...prev,
      suppliers: [
        ...(prev.suppliers || []),
        { liters: '', name: '', price: '', tons: '', typeOfProduct: '' },
      ],
    }));
  };

  const addBuyer = () => {
    setOrder((prev) => ({
      ...prev,
      buyers: [
        ...(prev.buyers || []),
        { liters: '', name: '', price: '', tons: '', typeOfProduct: '' },
      ],
    }));
  };

  const clearData = () => {
    setMessage("");
    setOrder({
      suppliers: [],
      buyers: [],
      date: Intl.DateTimeFormat('ru',{year:'numeric'}).format(new Date()) + '-' + Intl.DateTimeFormat('ru',{month:'2-digit'}).format(new Date()) + '-' + Intl.DateTimeFormat('ru',{day:'2-digit'}).format(new Date())
    });
  }
  console.log(order);
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
      {isPhone
        ? <NewOrderMobile order={order} setOrder={setOrder} />
        : <>
            <Stack direction='horizontal' gap={2} className='orderTable-topActions newOrderDesktop-topBar noselect'>
              <Button variant="primary" onClick={addSupplier}>Добавить поставщика</Button>
              <Button variant="success" onClick={addBuyer}>Добавить покупателя</Button>
              <FloatingLabel label="Менеджер" className="p-0 newOrderDesktop-manager">
                <Form.Control
                  as="input"
                  type='text'
                  value={order.manager || ''}
                  onChange={(evt) => {
                    setOrder((prev) => ({ ...prev, manager: evt.target.value }));
                  }}
                />
              </FloatingLabel>
            </Stack>
            <OrderTable
              order={order}
              setOrder={setOrder}
              hideInlineAddButtons={true}
              hideManagerInTable={true}
            />
          </>
      }
      {message !== ""
        ? <Alert key={alertVariant} variant={alertVariant}> {message} </Alert>
        : ""
      }
      <div
        style={{
          marginTop: isPhone ? '14px' : '8px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <Button variant="danger " onClick={clearData}>Очистить</Button>
        <Button variant="success" onClick={() => {
          sendData();
        }}>Создать заявку</Button>
      </div>
    </>

  );
}


export default NewOrder;
