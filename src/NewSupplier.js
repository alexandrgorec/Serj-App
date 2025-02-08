import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Select from "./Select";
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { Alert } from 'react-bootstrap';
import { useEffect, useState } from 'react';




function NewSupplier({ setOrder, handleCloseNewSupplier, showNewSupplier, selectListsData, setLiterForSale }) {
  const [alert, setAlert] = useState("");

  const handleAddLitersForSale = (liters, typeOfProduct) => {
    setLiterForSale((litersObj) => {
      litersObj[typeOfProduct] = (litersObj[typeOfProduct] || 0) + +liters;
      console.log("litersObj",litersObj);
      return(litersObj);
    })
  }

  const getSupplierData = () => {
    let result = {};
    result.name = document.querySelector("#newSupplier-name").value;
    console.log(result.name);
    result.typeOfProduct = document.querySelector("#newSupplier-typeOfProduct").value;
    result.liters = document.querySelector("#newSupplier-liters").value;
    result.tons = document.querySelector("#newSupplier-tons").value;
    result.price = document.querySelector("#newSupplier-price").value;
    result.driver = document.querySelector("#newSupplier-driver").value;
    result.otk = document.querySelector("#newSupplier-otk").value;
    return (result);
  }

  const verifySupplierData = (supplier) => {
    let verify = false;
    let errorVerifyMessage = "";
    if (supplier.driver === "")
      errorVerifyMessage = "Водитель не выбран";
    if (supplier.price === "")
      errorVerifyMessage = "Цена не указана";
    if (supplier.tons === "")
      errorVerifyMessage = "Тонны не указаны";
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

  const addNewSupplier = () => {
    const newSupplier = getSupplierData();
    const [verify, errorVerifyMessage] = verifySupplierData(newSupplier);
    if (verify) {
      setOrder((order) => {
        order.suppliers.push(newSupplier);
        handleAddLitersForSale(newSupplier.liters, newSupplier.typeOfProduct);
        return (order);
      })
      handleCloseNewSupplier();
    }
    else {
      setAlert(errorVerifyMessage);
    }
  }

  
  return (
    <Offcanvas show={showNewSupplier} onHide={handleCloseNewSupplier}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Добавить поставщика</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Select data={selectListsData.SUPPLIERS} label="Поставщик" id="newSupplier-name" />
        <br />
        <Select data={selectListsData.TYPE_OF_PRODUCT} label="Тип продукта" id="newSupplier-typeOfProduct" />
        <br />
        <FloatingLabel label="Литры" className="mb-3" >
          <Form.Control as="input" type='number' id="newSupplier-liters" />
        </FloatingLabel>
        <FloatingLabel label="Тонны" className="mb-3">
          <Form.Control as="input" type='number' id="newSupplier-tons" />
        </FloatingLabel>
        <FloatingLabel label="Цена" className="mb-3">
          <Form.Control as="input" type='number' id="newSupplier-price" />
        </FloatingLabel>
        <Select data={selectListsData.DRIVERS} label="Водитель" id="newSupplier-driver" />
        <br />
        <FloatingLabel label="ОТК" className="mb-3">
          <Form.Control as="input" id="newSupplier-otk" />
        </FloatingLabel>
        <Button style={{ float: 'left' }} variant="danger" onClick={handleCloseNewSupplier}>Отмена</Button>
        <Button style={{ float: 'right' }} variant="success" onClick={addNewSupplier}>Готово</Button>
        <br /><br />
        {alert != ""
          ? <Alert key="danger" variant="danger"> {alert} </Alert>
          : ""
        }
      </Offcanvas.Body>
    </Offcanvas>
  );
}


export default NewSupplier;