import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Select from "./Select";
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { Alert } from 'react-bootstrap';
import { useState, useRef } from 'react';




function NewBuyer({ order, setOrder, handleCloseNewBuyer, showNewBuyer, selectListsData, litersForSale, setLiterForSale }) {
  const [message, setMessage] = useState("");
  const [typeOfProduct, setTypeOfProduct] = useState('');
  const refSelectTypeOfProduct = useRef(null);
  const refLiters = useRef(null);
  const refTons = useRef(null);
  const refPrice = useRef(null);
  const refOtk = useRef(null);
  const refReady = useRef(null);



  const handleMinusLitersForSale = (liters, typeOfProduct) => {
    setLiterForSale((litersObj) => {
      litersObj[typeOfProduct] = (litersObj[typeOfProduct] || 0) - (+liters);
      return (litersObj);
    })
  }

  const getBuyerData = () => {
    let result = {};
    result.name = document.querySelector("#newBuyer-name").value;
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
    if (Buyer.liters > litersForSale[Buyer.typeOfProduct])
      errorVerifyMessage = "Количество литров превышает поставляемое значение";
    if (Buyer.liters == 0)
      errorVerifyMessage = "Количество литров не может быть равно 0";
    if (errorVerifyMessage === "")
      verify = true;

    return ([verify, errorVerifyMessage]);
  }

  const addNewBuyer = () => {
    const newBuyer = getBuyerData();
    const [verify, errorVerifyMessage] = verifyBuyerData(newBuyer);
    if (verify) {
      setOrder((order) => {
        order.buyers.push(newBuyer);
        handleMinusLitersForSale(newBuyer.liters, newBuyer.typeOfProduct);
        return (order);
      })
      handleCloseNewBuyer();
    }
    else {
      setMessage(errorVerifyMessage);
    }
  }

  let set = new Set();
  order.suppliers.forEach(supplier => {
    if (litersForSale[supplier.typeOfProduct] != undefined && litersForSale[supplier.typeOfProduct] != 0)
      set.add(supplier.typeOfProduct)
  })
  const TYPE_OF_PRODUCT = [...set];

  let liters = 0;

  // 
  const handleOnShowBuyer = () => {
    refSelectTypeOfProduct.current.addEventListener('change', () => {
      refLiters.current.value = litersForSale[refSelectTypeOfProduct.current.value];
    });


    if (refSelectTypeOfProduct.current.length === 2) {
      refSelectTypeOfProduct.current.selectedIndex = 1;
      refLiters.current.value = litersForSale[refSelectTypeOfProduct.current.value];
    }
    setMessage('');
  }

  const nextFocus = (evt) => {
    console.log(evt);
    if (evt.keyCode === 13) {
      console.log(evt);
      if (evt.target.id === 'newBuyer-liters')
      refTons.current.focus();
      if (evt.target.id === 'newBuyer-tons')
        refPrice.current.focus();
      if (evt.target.id === 'newBuyer-price')
        refOtk.current.focus();
      if (evt.target.id === 'newBuyer-otk')
        refReady.current.focus();
    }
  }

  return (
    <Offcanvas show={showNewBuyer} onShow={handleOnShowBuyer} onHide={handleCloseNewBuyer}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Добавить покупателя</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Select data={selectListsData.BUYERS} label="Покупатель" id="newBuyer-name" />
        <br />
        <Select data={TYPE_OF_PRODUCT} label="Тип продукта" id="newBuyer-typeOfProduct" ref={refSelectTypeOfProduct} />
        <br />
        <Select data={selectListsData.MANAGERS} label="Менеджер" id="newBuyer-manager" />
        <br />
        <FloatingLabel label="Литры" className="mb-3" >
          <Form.Control as="input" type='number' id="newBuyer-liters" ref={refLiters} onKeyUp={nextFocus} />
        </FloatingLabel>
        <FloatingLabel label="Тонны" className="mb-3">
          <Form.Control as="input" type='number' id="newBuyer-tons" ref={refTons} onKeyUp={nextFocus} />
        </FloatingLabel>
        <FloatingLabel label="Цена" className="mb-3">
          <Form.Control as="input" type='number' id="newBuyer-price" ref={refPrice} onKeyUp={nextFocus} />
        </FloatingLabel>

        <FloatingLabel label="ОТК" className="mb-3">
          <Form.Control as="input" id="newBuyer-otk" ref={refOtk} onKeyUp={nextFocus}  />
        </FloatingLabel>
        <Button style={{ float: 'left' }} variant="danger" onClick={handleCloseNewBuyer}>Отмена</Button>
        <Button style={{ float: 'right' }} variant="success" onClick={addNewBuyer} ref={refReady}>Готово</Button>
        <br /><br />
        {message != ""
          ? <Alert key="danger" variant="danger"> {message} </Alert>
          : ""
        }
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default NewBuyer;