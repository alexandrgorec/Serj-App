import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import ComboBox from './ComboBox';
import { Alert } from 'react-bootstrap';
import { useRef, useState, useContext } from 'react';
import { userContext } from './App';


const verifyBuyerData = (Buyer) => {
  let verify = false;
  let errorVerifyMessage = "";
  if (Buyer.typeOfProduct === "")
    errorVerifyMessage = "Тип продукта не выбран";
  if (errorVerifyMessage === "")
    verify = true;

  return ([verify, errorVerifyMessage]);
}

const getBuyerData = () => {
  let result = {};
  result.name = document.querySelector("#newBuyer-name").value;
  result.typeOfProduct = document.querySelector("#newBuyer-typeOfProduct").value;
  result.liters = document.querySelector("#newBuyer-liters").value;
  result.tons = document.querySelector("#newBuyer-tons").value;
  result.price = document.querySelector("#newBuyer-price").value;
  result.manager = document.querySelector("#newBuyer-manager").value;
  // result.otk = document.querySelector("#newBuyer-otk").value;
  return (result);
}


function NewBuyer({ order, setOrder, handleCloseNewBuyer, showNewBuyer, litersForSale, currentBuyer = null, buyerHIndex = null, editBuyerInDB = false }) {
  const { user, aAxios } = useContext(userContext);
  const [message, setMessage] = useState("");
  const refLiters = useRef(null);
  const refTons = useRef(null);
  const refPrice = useRef(null);
  const refOtk = useRef(null);
  const refReady = useRef(null);
  const index = currentBuyer;

  let displayComboBoxManager = 'none';

  if (currentBuyer !== null) {
    currentBuyer = order.buyers[currentBuyer];
    displayComboBoxManager = ''
  }

  if (currentBuyer !== null && buyerHIndex !== null) {
    currentBuyer = currentBuyer.buyersH[buyerHIndex];
  }



  const saveBuyer = () => {
    const buyer = getBuyerData();
    const [verify, errorVerifyMessage] = verifyBuyerData(buyer);
    if (verify) {
      if (!editBuyerInDB) {
        if (currentBuyer === null) { // Новый покупатель
          setOrder((order) => {
            order.buyers.push(buyer);
            return (order);
          })
        }
        else { // Редактируем имеющегося покупателя
          if (buyerHIndex === null) {
            setOrder((order) => {
              buyer.buyersH = order.buyers[index].buyersH || [];
              order.buyers[index] = buyer;
              return (order);
            })
          }
          else {
            setOrder((order) => {
              order.buyers[index].buyersH[buyerHIndex] = buyer;
              return (order);
            })
          }
        }
      }
      if (editBuyerInDB) {
        setOrder((order) => {
          order.orderjson.buyers[index] = buyer;
          return (order);
        });
        aAxios.post(`/user/editorder`, {
          order,
        })
          .then(function (response) {
            if (response.status === 202) {
              console.log("edited");
            }
          })
          .catch(function (error) {
          
          })
          .finally(() => { handleCloseNewBuyer() });
      }
      handleCloseNewBuyer();
    }
    else {
      setMessage(errorVerifyMessage);
    }
  }
  let TYPE_OF_PRODUCT = [];
  // if (!editBuyerInDB) {
  //   let set = new Set();
  //   order.suppliers.forEach(supplier => {
  //     if (litersForSale[supplier.typeOfProduct] !== undefined && litersForSale[supplier.typeOfProduct] > 0)
  //       set.add(supplier.typeOfProduct)
  //   })
  //   TYPE_OF_PRODUCT = [...set];
  // }
  // else {
  //   TYPE_OF_PRODUCT = user.selectListsData.TYPE_OF_PRODUCT;
  // }

  TYPE_OF_PRODUCT = user.selectListsData.TYPE_OF_PRODUCT;



  const handleOnShowBuyer = () => {
    const comboBoxTypeOfProduct = document.querySelector('#newBuyer-typeOfProduct');
    comboBoxTypeOfProduct.addEventListener('change', () => {
      refLiters.current.value = (litersForSale[comboBoxTypeOfProduct.value] || '');
    });
    setMessage('');
  }

  const nextFocus = (evt) => {
    if (evt.keyCode === 13) {
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
    <Offcanvas
      show={showNewBuyer}
      onShow={handleOnShowBuyer}
      onHide={() => {
        setMessage('');
        handleCloseNewBuyer();
      }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title >{`${currentBuyer === null ? 'Добавить покупателя' : 'Редактировать покупателя'}`}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <ComboBox
          display={displayComboBoxManager}
          data={user.selectListsData.MANAGERS}
          defaultValue={`${currentBuyer ? currentBuyer.manager : user.name}`}
          label="Менеджер" id="newBuyer-manager"
          nameDataList={'MANAGERS'}
        />
        <ComboBox
          data={user.selectListsData.BUYERS}
          defaultValue={`${currentBuyer ? currentBuyer.name : ''}`}
          label="Покупатель" id="newBuyer-name"
          nameDataList={'BUYERS'}
        />
        <ComboBox
          data={TYPE_OF_PRODUCT}
          defaultValue={`${currentBuyer ? currentBuyer.typeOfProduct : ''}`}
          label="Тип продукта"
          id="newBuyer-typeOfProduct"
          relationship='#newBuyer-liters'
          nameDataList={'TYPE_OF_PRODUCT'}
        />

        <FloatingLabel
          label="Литры"
          className="mb-3" >
          <Form.Control
            as="input"
            defaultValue={`${currentBuyer ? currentBuyer.liters : ''}`}
            type='number'
            id="newBuyer-liters"
            ref={refLiters}
            onKeyUp={nextFocus} />
        </FloatingLabel>

        <FloatingLabel
          label="Тонны"
          className="mb-3">
          <Form.Control
            as="input"
            defaultValue={`${currentBuyer ? currentBuyer.tons : ''}`}
            type='number'
            id="newBuyer-tons"
            ref={refTons}
            onKeyUp={nextFocus} />
        </FloatingLabel>
        <FloatingLabel
          label="Цена"
          className="mb-3">
          <Form.Control
            as="input"
            defaultValue={`${currentBuyer ? currentBuyer.price : ''}`}
            type='number'
            id="newBuyer-price"
            ref={refPrice}
            onKeyUp={nextFocus} />
        </FloatingLabel>

        {/* <FloatingLabel
          label="ОТК"
          className="mb-3">
          <Form.Control
            as="input"
            defaultValue={`${currentBuyer ? currentBuyer.otk : ''}`}
            id="newBuyer-otk" ref={refOtk} onKeyUp={nextFocus} />
        </FloatingLabel> */}
        <Button
          style={{ float: 'left' }}
          variant="danger"
          onClick={handleCloseNewBuyer}
        >
          Отмена
        </Button>
        <Button
          style={{ float: 'right' }}
          variant="success"
          onClick={saveBuyer}
          ref={refReady}
        >
          Готово
        </Button>
        <br /><br />
        {message !== ""
          ? <Alert key="danger" variant="danger"> {message} </Alert>
          : ""
        }
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default NewBuyer;