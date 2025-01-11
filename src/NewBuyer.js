import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Select from "./Select";
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { Alert } from 'react-bootstrap';
import { useState } from 'react';



function NewBuyer({ setOrder, BUYERS, handleCloseNewBuyer, showNewBuyer, MANAGERS, TYPE_OF_PRODUCT }) {
  const [alert, setAlert] = useState("");

  const getBuyerData = () => {
    let result = {};
    result.name = document.querySelector("#newBuyer-name").value;
    console.log(result.name);
    result.typeOfProduct = document.querySelector("#newBuyer-typeOfProduct").value;
    result.liters = document.querySelector("#newBuyer-liters").value;
    result.tons = document.querySelector("#newBuyer-tons").value;
    result.price = document.querySelector("#newBuyer-price").value;
    result.manager = document.querySelector("#newBuyer-manager").value;
    result.otk = document.querySelector("#newBuyer-otk").value;
    return (result);
  }

  const verifyBuyerData = (Buyer) => {
    let verify = false;
    let errorVerifyMessage = "";
    if (Buyer.otk === "")
      errorVerifyMessage = "ОТК не указан";
    if (Buyer.manager === "")
      errorVerifyMessage = "менеджер не выбран";
    if (Buyer.price === "")
      errorVerifyMessage = "Цена не указана";
    if (Buyer.tons === "")
      errorVerifyMessage = "Тонны не указаны";
    if (Buyer.liters === "")
      errorVerifyMessage = "Литры не указаны";
    if (Buyer.typeOfProduct === "")
      errorVerifyMessage = "Тип продукта не выбран";
    if (Buyer.name === "")
      errorVerifyMessage = "Покупатель не выбран";
    if (errorVerifyMessage === "")
      verify = true;
    return ([verify, errorVerifyMessage]);
  }

  const addNewBuyer = () => {
    const newBuyer = getBuyerData();
    const [verify, errorVerifyMessage] = verifyBuyerData(newBuyer);
    if (verify) {
      setOrder((order) => {
        order.buyers.push(newBuyer)
        return (order);
      })
      handleCloseNewBuyer();
    }
    else {
      setAlert(errorVerifyMessage);
    }
  }

  return (
    <Offcanvas show={showNewBuyer} onHide={handleCloseNewBuyer}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Добавить покупателя</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Select data={BUYERS} label="Покупатель" id="newBuyer-name" />
        <br />
        <Select data={TYPE_OF_PRODUCT} label="Тип продукта" id="newBuyer-typeOfProduct" />
        <br />
        <FloatingLabel label="Литры" className="mb-3" >
          <Form.Control as="input" type='number' id="newBuyer-liters" />
        </FloatingLabel>
        <FloatingLabel label="Тонны" className="mb-3">
          <Form.Control as="input" type='number' id="newBuyer-tons" />
        </FloatingLabel>
        <FloatingLabel label="Цена" className="mb-3">
          <Form.Control as="input" type='number' id="newBuyer-price" />
        </FloatingLabel>
        <Select data={MANAGERS} label="Менеджер" id="newBuyer-manager" />
        <br />
        <FloatingLabel label="ОТК" className="mb-3">
          <Form.Control as="input" id="newBuyer-otk" />
        </FloatingLabel>
        <Button style={{ float: 'left' }} variant="danger" onClick={handleCloseNewBuyer}>Отмена</Button>
        <Button style={{ float: 'right' }} variant="success" onClick={addNewBuyer}>Готово</Button>
        <br /><br />
        {alert != ""
          ? <Alert key="danger" variant="danger"> {alert} </Alert>
          : ""
        }
      </Offcanvas.Body>
    </Offcanvas>
  );
}


export default NewBuyer;