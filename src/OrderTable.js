import './OrderTable.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import { BiEditAlt } from "react-icons/bi";
import { useState, useContext } from 'react';
import { MdDelete } from "react-icons/md";
import FinBlockEdit from './FinBlockEdit';
import Modal from 'react-bootstrap/Modal';
import { userContext } from './App';


function OrderTable({ handleShowNewSupplier, handleShowNewBuyer, handleEditSupplier, handleEditBuyer, handleRefreshLitersForSale, setOrder, order }) {
  const { user } = useContext(userContext);
  const [suppliersOrBuyers, setSuppliersOrBuyers] = useState(null);
  const [state, reload] = useState(false);
  const [currentFinBlock, setCurrentFinBlock] = useState(null);
  const [showFinBlock, setShowFinBlock] = useState(false);
  const bgColorH = 'rgba(127, 244, 166, 0.49)';
  const handleEditFinBlock = (finBlockIndex, suppliersOrBuyers) => {
    setCurrentFinBlock(finBlockIndex);
    setSuppliersOrBuyers(suppliersOrBuyers);
    setShowFinBlock(true);
  };


  const [deleteElement, setDeleteElement] = useState(null);
  const [show, setShow] = useState(false);
  const handleCloseModal = () => setShow(false);
  const handleShowModal = () => setShow(true);

  const handleCloseFinBlock = () => {
    setShowFinBlock(false);
  }

  let size = '';
  let display = '';
  if (window.innerWidth < 850) {
    display = 'none';
    size = 'sm'
  }
  const NumberFormat = (num) => {
    let res = new Intl.NumberFormat().format(num);
    if (!num)
      res = '';
    return res;
  }



  return (
    <>
      <div className='newOrderTable noselect'>
        <Table striped bordered hover responsive="sm">
          <thead>
            <tr>
              <th> <Button variant="primary" size={size} onClick={handleShowNewSupplier}>+</Button> Поставщик </th>
              <th>Вид продукта</th>
              <th>Литры</th>
              <th>Тонны</th>
              <th>Цена</th>
              <th></th>
              {/* <th>Водитель</th> */}
              {/* <th>ОТК</th> */}
              {user.rights.finBlockAccess &&
                <>
                  <th width='6%' style={{ display: display }}>С/Ф</th>
                  <th width='6%' style={{ display: display }}>Дата</th>
                  <th width='6%' style={{ display: display }}>Сумма</th>
                  <th width='6%' style={{ display: display }}>Акт транспорт</th>
                </>
              }
            </tr>
          </thead>
          <tbody>
            {order.suppliers.map((supplier, index) => {
              return (
                <tr key={index} onDoubleClick={() => handleEditSupplier(index)}>
                  <td>
                    <Stack gap={1} direction='horizontal'>
                      {supplier.name}
                      <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => handleEditSupplier(index)} />
                      {/* <Button size="sm" variant="warning" >н</Button> */}
                      <div className="vr" />
                      <MdDelete size='1.7em' className='icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                        setDeleteElement({
                          element: 'suppliers',
                          index,
                        })
                        handleShowModal();
                      }}


                      />
                    </Stack>
                  </td>
                  <td>{supplier.typeOfProduct}</td>
                  <td>{supplier.liters}</td>
                  <td>{supplier.tons}</td>
                  <td>{supplier.price}</td>
                  <td></td>
                  {/* <td>{supplier.driver}</td> */}
                  {/* <td>{supplier.otk}</td> */}
                  {user.rights.finBlockAccess &&
                    <>
                      <td style={{ display: display }}>
                        <Stack gap={1} direction='horizontal'>
                          {supplier.sf}
                          <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(index, 'suppliers') }} />
                        </Stack>
                      </td>
                      <td style={{ display: display }}>{supplier.date}</td>
                      <td style={{ display: display }}>{NumberFormat(supplier.summa)}</td>
                      <td style={{ display: display }}>{supplier.akt}</td>
                    </>
                  }
                </tr>
              )
            })}

          </tbody>
          <thead>
            <tr>
              <th colSpan='5'>
                <Stack gap={2} direction='horizontal'>
                  <Button variant="primary" size={size} onClick={() => handleShowNewBuyer(false)}>+</Button>
                  {/* <Button size={size} variant="warning" onClick={() => handleShowNewBuyer(true)}>н</Button> */}
                  Покупатель
                </Stack>
              </th>
              <th colSpan={2} >Менеджер</th>

              {user.rights.finBlockAccess && <th style={{ display: display }} colSpan={4}></th>}
            </tr>
          </thead>
          <tbody>
            {order.buyers.map((buyer, index) => {
              return (
                <>                 
                  <tr key={index} >
                    <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>
                      <Stack gap={1} direction='horizontal'>
                        {buyer.name}
                        <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => handleEditBuyer(index, buyer.buttonH)} />
                        {/* <Button size="sm" variant="warning" >н</Button> */}
                        <div className="vr" />
                        <MdDelete size='1.7em' className='icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                          setDeleteElement({
                            element: 'buyers',
                            index,
                          })
                          handleShowModal();
                        }}


                        />
                        <div className="vr" />
                        <Button variant="warning"  style={{ backgroundColor: buyer.buyersH?.length > 0 ?  bgColorH : '' }} onClick={() => {
                          const orderSave = order;
                          orderSave.buyers[index].buyersH = orderSave.buyers[index].buyersH || [];
                          const copyBuyer = { ...orderSave.buyers[index] };
                          delete copyBuyer.buyersH;
                          copyBuyer.name = '';
                          orderSave.buyers[index].buyersH.push(copyBuyer);
                          setOrder({...orderSave});
                          console.log("order", order);
                        }}>н</Button>
                      </Stack>
                    </td>
                    <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.typeOfProduct}</td>
                    <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.liters}</td>
                    <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.tons}</td>
                    <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.price}</td>
                    <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.manager}</td>

                    {user.rights.finBlockAccess &&
                      <>
                        <td style={{ display: display, backgroundColor: buyer.buttonH ? bgColorH : '' }}>
                          <Stack gap={1} direction='horizontal'>
                            {buyer.sf}
                            <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(index, 'buyers') }} />

                          </Stack>
                        </td>
                        <td style={{ display: display, backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.date}</td>
                        <td style={{ display: display, backgroundColor: buyer.buttonH ? bgColorH : '' }}>{NumberFormat(buyer.summa)}</td>
                        <td style={{ display: display, backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.akt}</td>
                      </>
                    }
                  </tr>



                  {
                  buyer.buyersH && buyer.buyersH.map((buyerH, indexBuyerH) => {
                    return (
                      <tr>
                        <td style={{ backgroundColor: bgColorH }}>
                          <Stack gap={1} direction='horizontal'>
                            {buyerH.name}
                            <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { }} />
                            {/* <Button size="sm" variant="warning" >н</Button> */}
                            <div className="vr" />
                            <MdDelete size='1.7em' className='icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {

                            }}
                            />
                            <div className="vr" />
                          </Stack>
                        </td>
                        <td style={{ backgroundColor: bgColorH }}>{buyerH.typeOfProduct}</td>
                        <td style={{ backgroundColor: bgColorH }}>{buyerH.liters}</td>
                        <td style={{ backgroundColor: bgColorH }}>{buyerH.tons}</td>
                        <td style={{ backgroundColor: bgColorH }}>{buyerH.price}</td>
                        <td style={{ backgroundColor: bgColorH }}>{buyerH.manager}</td>

                        {user.rights.finBlockAccess &&
                          <>
                            <td style={{ display: display, backgroundColor: bgColorH }}>
                              <Stack gap={1} direction='horizontal'>
                                {buyerH.sf}
                                {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(index, 'buyers') }} /> */}

                              </Stack>
                            </td>
                            <td style={{ display: display, backgroundColor: bgColorH }}>{buyerH.date}</td>
                            <td style={{ display: display, backgroundColor: bgColorH }}>{NumberFormat(buyerH.summa)}</td>
                            <td style={{ display: display, backgroundColor: bgColorH }}>{buyerH.akt}</td>
                          </>
                        }
                      </tr>
                    )
                  }
                  )}










                </>
              )
            })}
          </tbody>
        </Table>
      </div>
      <FinBlockEdit
        setOrder={setOrder}
        order={order}
        handleCloseFinBlock={handleCloseFinBlock}
        showFinBlock={showFinBlock}
        current={currentFinBlock}
        suppliersOrBuyers={suppliersOrBuyers}
      />
      <Modal centered show={show} onHide={handleCloseModal} animation={true} >
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>Точно удаляем?</Modal.Body>
        <Modal.Footer>

          <Button variant="secondary" onClick={handleCloseModal}>
            Еще подумаю
          </Button>
          <Button variant="primary" className='col-3' onClick={() => {

            if (deleteElement) {
              setOrder((order) => {
                order[deleteElement.element] = order[deleteElement.element].filter((item, ind) => ind != [deleteElement.index])
                return (order);
              })
              setDeleteElement(null);
              reload(!state);
              handleRefreshLitersForSale();
            }
            handleCloseModal();
          }}>
            Да
          </Button>

        </Modal.Footer>
      </Modal>
    </>
  );
}


export default OrderTable;