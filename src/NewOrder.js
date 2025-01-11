import './NewOrder.css';
import NewSupplier from './NewSupplier';
import OrderTable from './OrderTable';
import NewBuyer from './NewBuyer';

import './NewOrder.css';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Select from "./Select";
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { Alert } from 'react-bootstrap';

import { useState } from 'react';



const SUPPLIERS = ['РНК', "Барс", "Грасс", "Юма"];
const BUYERS = ['Техресурс', "Слава", "Мостпроект", "тройка-тт", "Тайга", "Сеч", "Горбунов"];
const DRIVERS = ['Вася', "Петушара", "Димооооон", "Анатолий Степанович"];
const TYPE_OF_PRODUCT = ['ДТ-Е-К5', "Дизель", "Не дизель", "GT-POWER"];
const MANAGERS = ['Антон', "Сержан", "ЦАРЬ", "Иванов"];

function NewOrder() {
  const [order, setOrder] = useState({
    suppliers: [],
    buyers: [],
  });

  // let supplier = {
  //   supplierName:"ЮМА",
  //   typeOfProduct:"ДТ-Е-К5",
  //   leters:24057,
  //   tons:20.4,
  //   price:64300,
  //   driver:"",
  //   otk:0,
  // }
  // let buyer = {
  //   buyerName:"Слава",
  //   typeOfProduct:"ДТ-Е-К5",
  //   leters:24057,
  //   tons:"",
  //   price:47.6,
  //   manager:"Антон",
  //   otk:"",
  // }


  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const handleCloseNewSupplier = () => setShowNewSupplier(false);
  const handleShowNewSupplier = () => setShowNewSupplier(true);

  const [showNewBuyer, setShowNewBuyer] = useState(false);
  const handleCloseNewBuyer = () => setShowNewBuyer(false);
  const handleShowNewBuyer = () => setShowNewBuyer(true);

  return (
    <>
      <OrderTable handleShowNewSupplier={handleShowNewSupplier} handleShowNewBuyer={handleShowNewBuyer} order={order} />
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
    </>
  );
}


export default NewOrder;