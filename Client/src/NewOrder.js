
import OrderTable from './OrderTable';
import NewOrderMobile from './NewOrderMobile';
import './NewOrder.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useState, useContext } from 'react';
import { Alert } from 'react-bootstrap';
import { userContext } from './App';
import { useNavigate } from 'react-router-dom';
import { syncOrderSelectLists } from './selectListsSync';





const emptyOrderRow = () => ({
  liters: '',
  name: '',
  price: '',
  tons: '',
  typeOfProduct: '',
});

const todayInputDate = () =>
  Intl.DateTimeFormat('ru', { year: 'numeric' }).format(new Date()) + '-' +
  Intl.DateTimeFormat('ru', { month: '2-digit' }).format(new Date()) + '-' +
  Intl.DateTimeFormat('ru', { day: '2-digit' }).format(new Date());


function NewOrder({ order, setOrder }) {
  
  const isPhone = window.innerWidth <= 480;

  const redirect = useNavigate();
  const { user, setUser, aAxios } = useContext(userContext);
  const [message, setMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("");

  const updateOrderField = (field, value) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const deliveryCost = Number(String(order.cost || '').replace(/\s/g, '').replace(/,/g, '.'));
  const tax = Number.isNaN(deliveryCost) ? 0 : Math.round(deliveryCost * 0.4);

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
      suppliers: [emptyOrderRow()],
      buyers: [emptyOrderRow()],
      orderNumber: '',
      date: todayInputDate(),
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
        .then(async function (response) {
          if (response.status === 202) {
            await syncOrderSelectLists({ order, user, setUser, aAxios }).catch((error) => {
              console.error('Select lists sync error:', error);
            });
            clearData();
            setAlertVariant("success");
            sessionStorage.createdOrderId = response.data?.id || response.data;
            sessionStorage.bgColor = 'rgba(61, 174, 12, 0.44)';
            redirect('/allorders');
            // setMessage("Заявка создана")  //id = response.data
          }
        })
        .catch(function (error) {
          if (error?.response?.status === 409) {
            setAlertVariant("danger");
            setMessage(error.response.data?.message || "Заявка с таким номером уже существует");
          }
          if (error?.response?.status === 400) {
            setAlertVariant("danger");
            setMessage(error.response.data?.message || "Некорректный номер заявки");
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
      {isPhone
        ? <NewOrderMobile order={order} setOrder={setOrder} />
        : <>
            <div className='orderTable-topActions newOrderDesktop-topBar noselect'>
              <div className='newOrderDesktop-topBarLeft'>
                <Button variant="primary" onClick={addSupplier}>Добавить поставщика</Button>
                <Button variant="success" onClick={addBuyer}>Добавить покупателя</Button>
              </div>

              <div className='newOrderDesktop-topBarCenter'>
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
                <h4 className='m-0 p-0 newOrderDesktop-title'>Новая заявка</h4>
                <FloatingLabel label="№ заявки" className="p-0 newOrderDesktop-orderNumber">
                  <Form.Control
                    as="input"
                    type='number'
                    min='1'
                    placeholder='Авто'
                    value={order.orderNumber || ''}
                    onChange={(evt) => {
                      setOrder((prev) => ({ ...prev, orderNumber: evt.target.value }));
                    }}
                  />
                </FloatingLabel>
                <FloatingLabel label="Дата" className="p-0 newOrderDesktop-date">
                  <Form.Control
                    as="input"
                    type='date'
                    value={order.date || ''}
                    onChange={(evt) => {
                      setOrder((prev) => ({ ...prev, date: evt.target.value }));
                    }}
                  />
                </FloatingLabel>
              </div>

              <div className='newOrderDesktop-topBarRight' />
            </div>
            <OrderTable
              order={order}
              setOrder={setOrder}
              hideInlineAddButtons={true}
              hideManagerInTable={true}
            />

            <div className='newOrderDesktop-serviceFields'>
              <div className='newOrderDesktop-comments'>
                <Form.Control
                  as='textarea'
                  placeholder='Комментарии'
                  value={order.comments || ''}
                  onChange={(evt) => updateOrderField('comments', evt.target.value)}
                />
              </div>

              <div className='newOrderDesktop-requisites'>
                <FloatingLabel label="ИП Перевозчик" className="mb-2">
                  <Form.Control
                    as="input"
                    type='text'
                    value={order.ip || ''}
                    onChange={(evt) => updateOrderField('ip', evt.target.value)}
                  />
                </FloatingLabel>
                <FloatingLabel label="Водитель" className="mb-2">
                  <Form.Control
                    as="input"
                    type='text'
                    value={order.driver || ''}
                    onChange={(evt) => updateOrderField('driver', evt.target.value)}
                  />
                </FloatingLabel>
                <FloatingLabel label="Стоимость доставки" className="mb-2">
                  <Form.Control
                    as="input"
                    type='number'
                    value={order.cost || ''}
                    onChange={(evt) => updateOrderField('cost', evt.target.value)}
                  />
                </FloatingLabel>
                <FloatingLabel label="ОТК" className="mb-2">
                  <Form.Control
                    as="input"
                    type='text'
                    value={order.otk || ''}
                    onChange={(evt) => updateOrderField('otk', evt.target.value)}
                  />
                </FloatingLabel>
                <FloatingLabel label="Налог (40% от доставки)" className="mb-0">
                  <Form.Control as="input" type='number' readOnly value={tax} />
                </FloatingLabel>
              </div>
            </div>
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
