import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import ComboBox from './ComboBox';
import { Alert } from 'react-bootstrap';
import { useRef, useState } from 'react';
import axios from 'axios';


const verifySupplierData = (supplier) => {
  let verify = false;
  let errorVerifyMessage = "";
  if (supplier.liters === "")
    errorVerifyMessage = "Литры не указаны";
  if (supplier.typeOfProduct === "")
    errorVerifyMessage = "Тип продукта не выбран";
  if (supplier.name === "")
    errorVerifyMessage = "Поставщик не выбран";
  if (errorVerifyMessage === "")
    verify = true;
  return ([verify, errorVerifyMessage]);
}

const getSupplierData = () => {
  let result = {};
  result.name = document.querySelector("#newSupplier-name").value;
  result.typeOfProduct = document.querySelector("#newSupplier-typeOfProduct").value;
  result.liters = document.querySelector("#newSupplier-liters").value;
  result.tons = document.querySelector("#newSupplier-tons").value;
  result.price = document.querySelector("#newSupplier-price").value;
  result.driver = document.querySelector("#newSupplier-driver").value;
  result.otk = document.querySelector("#newSupplier-otk").value;
  return (result);
}

function NewSupplier({ setOrder, handleCloseNewSupplier, showNewSupplier, selectListsData, refreshLiterForSale, order, currentSupplier = null, editSupplierInDB = false, PORT = 3001, logOut, token }) {
  const [message, setMessage] = useState("");
  const refLiters = useRef(null);
  const refTons = useRef(null);
  const refPrice = useRef(null);
  const refOtk = useRef(null);
  const refReady = useRef(null);
  const index = currentSupplier;

  if (currentSupplier !== null)
    currentSupplier = order.suppliers[currentSupplier];

  const saveSupplier = () => {
    const supplier = getSupplierData();
    const [verify, errorVerifyMessage] = verifySupplierData(supplier);
    if (verify) {
      if (!editSupplierInDB) {
        if (currentSupplier === null) { // Новый поставщик
          setOrder((order) => {
            order.suppliers.push(supplier);
            refreshLiterForSale();
            return (order);
          })
        }
        else { // Редактируем имеющегося поставщика
          setOrder((order) => {
            order.suppliers[index] = supplier;
            refreshLiterForSale();
            return (order);
          })
        }
      }
      if (editSupplierInDB) {
        setOrder((order) => {
          order.orderjson.suppliers[index] = supplier;
          return (order);
        });
        axios.post(`http://${window.location.hostname}:${PORT}/editorder`, {
          order,
          token,
        })
          .then(function (response) {
            if (response.status === 202) {
              console.log("edited");
            }
          })
          .catch(function (error) {
            console.log(error);
            if (error.response.status === 999) {
              logOut();
            }
          })
          .finally( () => {handleCloseNewSupplier()});
      }
      handleCloseNewSupplier();
    }
    else {
      setMessage(errorVerifyMessage);
    }


  }


  const nextFocus = (evt) => {
    if (evt.keyCode === 13) {
      if (evt.target.id === 'newSupplier-liters')
        refTons.current.focus();
      if (evt.target.id === 'newSupplier-tons')
        refPrice.current.focus();
      if (evt.target.id === 'newSupplier-price')
        refOtk.current.focus();
      if (evt.target.id === 'newSupplier-otk')
        refReady.current.focus();
    }
  }



  return (
    <Offcanvas show={showNewSupplier} onHide={() => {
      setMessage('');
      handleCloseNewSupplier();
    }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{`${currentSupplier === null ? 'Добавить поставщика' : 'Редактировать поставщика'}`}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <ComboBox data={selectListsData.SUPPLIERS} defaultValue={`${currentSupplier ? currentSupplier.name : ''}`} label="Поставщик" id="newSupplier-name" />
        <ComboBox data={selectListsData.TYPE_OF_PRODUCT} defaultValue={`${currentSupplier ? currentSupplier.typeOfProduct : ''}`} label="Тип продукта" id="newSupplier-typeOfProduct" />
        <ComboBox data={selectListsData.DRIVERS} defaultValue={`${currentSupplier ? currentSupplier.driver : ''}`} label="Водитель" id="newSupplier-driver" />

        <FloatingLabel label="Литры" className="mb-3" >
          <Form.Control as="input" type='number' defaultValue={`${currentSupplier ? currentSupplier.liters : ''}`} id="newSupplier-liters" ref={refLiters} onKeyUp={nextFocus} />
        </FloatingLabel>
        <FloatingLabel label="Тонны" className="mb-3">
          <Form.Control as="input" type='number' defaultValue={`${currentSupplier ? currentSupplier.tons : ''}`} id="newSupplier-tons" ref={refTons} onKeyUp={nextFocus} />
        </FloatingLabel>
        <FloatingLabel label="Цена" className="mb-3">
          <Form.Control as="input" type='number' defaultValue={`${currentSupplier ? currentSupplier.price : ''}`} id="newSupplier-price" ref={refPrice} onKeyUp={nextFocus} />
        </FloatingLabel>
        <FloatingLabel label="ОТК" className="mb-3">
          <Form.Control as="input" id="newSupplier-otk" defaultValue={`${currentSupplier ? currentSupplier.otk : ''}`} ref={refOtk} onKeyUp={nextFocus} />
        </FloatingLabel>
        <Button style={{ float: 'left' }} variant="danger" onClick={handleCloseNewSupplier}>Отмена</Button>
        <Button style={{ float: 'right' }} variant="success" onClick={saveSupplier} ref={refReady} >Готово</Button>
        <br /><br />
        {message !== ""
          ? <Alert key="danger" variant="danger"> {message} </Alert>
          : ""
        }
      </Offcanvas.Body>
    </Offcanvas>
  );
}


export default NewSupplier;