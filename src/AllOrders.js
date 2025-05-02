import './AllOrders.css';
import Table from 'react-bootstrap/Table';
import { useState, useEffect, useContext } from 'react';
import Collapse from 'react-bootstrap/Collapse';
import Button from 'react-bootstrap/Button';
import axios from 'axios';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import EditOrder from './EditOrder';
import { BiEditAlt } from "react-icons/bi";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { MdDelete } from "react-icons/md";
import { userContext } from './App';


function spisok(array) {
  {
    let result = [];
    array.forEach(item => {
      if (!result.includes(item.name))
        result.push(item.name);
    });
    return (result.join('; '));
  }
}


function formatDate(date) {
  date = new Date(Date.parse(date));
  let dd = date.getDate();
  if (dd < 10) dd = '0' + dd;

  let mm = date.getMonth() + 1;
  if (mm < 10) mm = '0' + mm;

  let yy = date.getFullYear() % 100;
  if (yy < 10) yy = '0' + yy;

  return dd + '.' + mm + '.' + yy;
}



function AllOrders() {
  const {logOut, token, user, PORT} = useContext(userContext);


  const openEditedOrder = () => {
    setOrders((orders) => {
      if (sessionStorage.createdOrderId) {
        orders.forEach(order => {
          order.open = order.id === sessionStorage.createdOrderId ? true : false;
        })
      }
      return (orders)
    })
    setTimeout(() => {
      delete sessionStorage.createdOrderId;
    }, 1000);
  }


  const bgColorEdited = 'rgba(6, 55, 146, 0.338)';
  // const bgColorEdited = sessionStorage.bgColor || '';
  const bgColorH = 'rgba(127, 244, 166, 0.49)';
  const [editMode, setEditMode] = useState(false);

  const handleSetEditMode = () => {
    setEditMode(!editMode);
    getAllOrders(false);
  }

  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState({
    suppliers: [],
    buyers: [],
  });

  const [idForDeleteOrder, setIdForDeleteOrder] = useState(null);
  const [show, setShow] = useState(false);
  const handleCloseModal = () => setShow(false);
  const handleShowModal = () => setShow(true);

  function showHideOrder(num) {
    setOrders((orders) => {
      orders[num].open = !orders[num].open;
      return (orders)
    })
    reload(!state);
  }


  let size = '';
  let display = '';
  if (window.innerWidth < 850) {
    display = 'none';
    size = 'sm'
  }
  const [state, reload] = useState(false);



  const getAllOrders = (firstUpload = true) => {
    const oldOrders = orders;
    axios.post(`http://${window.location.hostname}:${PORT}/getallorders`, {
      token
    })
      .then(function (response) {
        if (response.status === 202) {
          setOrders(response.data.orders.map((order, index) => {
            order.orderjson.id = order.id;
            if (firstUpload) {
              order.open = false;
              if (sessionStorage.createdOrderId) {
                order.open = order.id === sessionStorage.createdOrderId ? true : false;
              }
            }
            else {
              oldOrders[index] ? order.open = oldOrders[index].open : order.open = false;
            }
            return (order);
          }))
        }
      })
      .catch(function (error) {
        console.log(error);
        if (error?.response?.status === 999) {
          logOut();
        }
      });
  }

  const deleteOrder = (id) => {
    axios.post(`http://${window.location.hostname}:${PORT}/deleteorder`, {
      token,
      id
    })
      .then(function (response) {
        if (response.status === 202) {
          getAllOrders(false);
        }
      })
      .catch(function (error) {
        console.log(error);
        if (error?.response?.status === 999) {
          logOut();
        }
      });
  }



  useEffect(() => {
    getAllOrders();
    openEditedOrder();
  }, [null])


  const NumberFormat = (num) => {
    let res = new Intl.NumberFormat().format(num);
    if (!num)
      res = '';
    return res;
  }


  if (!editMode)
    return (
      <>
        <Button style={{ margin: '5px', marginLeft: '0' }}
          onClick={() => {
            setOrders((orders) => {
              orders.map(order => {
                order.open = true;
                return (order)
              })
              return (orders);
            })
            reload(!state);
          }}
        > Развернуть все
        </Button>
        <Button style={{ marginTop: '5px', marginBottom: '5px' }}
          onClick={() => {
            setOrders((orders) => {
              orders.map(order => {
                order.open = false;
                return (order)
              })
              return (orders);
            })
            reload(!state);
          }}
        > Свернуть все
        </Button>

        <div className='allOrdersTable noselect'>
          <Table style={{ padding: '0', margin: '0' }} striped bordered hover>
            <thead>
              <tr>
                <th width='2%' style={{ textAlign: 'center' }}>№</th>
                <th width='5%'>Дата</th>
                <th width='30%'>Поставщики</th>
                <th >Покупатели</th>
              </tr>
            </thead>
          </Table>
          {
            orders.map((order, num) => {
              return (
                <>
                  <Table key={num} className='colorborder clickable' striped bordered hover onClick={() => {

                    showHideOrder(num);
                  }}
                    onDoubleClick={() => {
                      showHideOrder(num);
                      setOrder(() => order.orderjson);
                      handleSetEditMode();
                    }}
                  >
                    <tbody style={{ borderColor: order.id === sessionStorage.createdOrderId ? bgColorEdited : '' }}>
                      <tr id={`order-${order.id}`}>

                        <td width='2%' style={{ textAlign: 'center', backgroundColor: order.id === sessionStorage.createdOrderId ? bgColorEdited : '' }}>{order.id}</td>
                        <td style={{ backgroundColor: order.id === sessionStorage.createdOrderId ? bgColorEdited : '' }} width='5%' >{formatDate(order.orderjson.date)}</td>
                        <td style={{ backgroundColor: order.id === sessionStorage.createdOrderId ? bgColorEdited : '' }} width='30%'>{
                          spisok(order.orderjson.suppliers)
                          // order.orderjson.suppliers.map((item) => {
                          //   return (item.name + "; ")
                          // })
                        }</td>

                        <td style={{ backgroundColor: order.id === sessionStorage.createdOrderId ? bgColorEdited : '' }}>
                          <Stack direction="horizontal" gap={3} >
                            {
                              spisok(order.orderjson.buyers)
                              // order.orderjson.buyers.map((item) => {
                              //   return (item.name + "; ")
                              // })
                            }
                            {!orders[num].open && <FaEye size='1.7em' className='ms-auto icon clickable' style={{ color: 'rgba(1, 87, 248, 0.85)' }} />}
                            {orders[num].open && <FaEyeSlash size='1.7em' className='ms-auto icon clickable' style={{ color: 'rgba(1, 87, 248, 0.28)' }} />}
                            <div className="vr" />
                            <BiEditAlt size='1.7em' className='clickable icon' style={{ color: 'rgba(1, 87, 248, 0.85)' }} onClick={() => {
                              showHideOrder(num);
                              setOrder(() => order.orderjson);
                              handleSetEditMode();
                            }} />
                            <div className="vr" />
                            <MdDelete size='1.7em' className='clickable icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                              showHideOrder(num)
                              setIdForDeleteOrder(order.id);
                              handleShowModal();
                            }} />


                          </Stack>
                        </td>

                      </tr>
                    </tbody>
                  </Table>
                  <Collapse in={order.open}>
                    <div className='mb-3'>
                      <Table className='mb-0' striped bordered hover size={size} responsive="sm">
                        <thead>
                          <tr >
                            <th width='10%' >Поставщик </th>
                            <th width='10%' >Вид продукта</th>
                            <th width='5%' >Литры</th>
                            <th width='5%' >Тонны</th>
                            <th width='5%' >Цена</th>
                            <th className='text-center' width='10%' >Перевозчик</th>
                            <th className='text-center' width='10%' >Водитель</th>
                            <th className='text-center' width='10%' >Сумма доставки</th>
                            <th className='text-center' width='4%' >ОТК</th>
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
                          {order.orderjson.suppliers.map((supplier, supplierIndex) => {
                            return (
                              <tr key={supplierIndex}>
                                <td >
                                  <Stack gap={1} direction='horizontal' >
                                    {supplier.name}
                                    {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditSupplier(num, order.id, supplierIndex) }} /> */}
                                    {/* <Button size="sm" variant="warning" >н</Button> */}
                                  </Stack>
                                </td>
                                <td >{supplier.typeOfProduct}</td>
                                <td >{NumberFormat(supplier.liters)}</td>
                                <td >{NumberFormat(supplier.tons)}</td>
                                <td >{NumberFormat(supplier.price)}</td>
                                {(supplierIndex === 0) &&
                                  <>
                                    <td className='align-middle text-center' rowSpan={order.orderjson.suppliers.length}>{order.orderjson.ip}</td>
                                    <td className='align-middle text-center' rowSpan={order.orderjson.suppliers.length}>{order.orderjson.driver}</td>
                                    <td className='align-middle text-center' rowSpan={order.orderjson.suppliers.length}>{order.orderjson.cost}</td>
                                    <td className='align-middle text-center' rowSpan={order.orderjson.suppliers.length}>{order.orderjson.otk}</td>
                                  </>
                                }
                                {user.rights.finBlockAccess &&
                                  <>
                                    <td style={{ display: display }}>
                                      <Stack gap={1} direction='horizontal'>
                                        {supplier.sf}
                                        {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, supplierIndex, 'suppliers') }} /> */}
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
                            <th colSpan='5'>Покупатель </th>
                            <th colSpan='4'>Менеджер</th>

                            {user.rights.finBlockAccess && <th style={{ display: display }} colSpan={4}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {order.orderjson.buyers.map((buyer, buyerIndex) => {
                            return (
                              <tr key={buyerIndex} >
                                <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>
                                  <Stack gap={1} direction='horizontal'>
                                    {buyer.name}
                                    {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditBuyer(num, order.id, buyerIndex) }} /> */}
                                    {/* <Button size="sm" variant="warning" >н</Button> */}
                                  </Stack>
                                </td>
                                <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.typeOfProduct}</td>
                                <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{NumberFormat(buyer.liters)}</td>
                                <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{NumberFormat(buyer.tons)}</td>
                                <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{NumberFormat(buyer.price)}</td>
                                <td colSpan='4' style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.manager}</td>

                                {user.rights.finBlockAccess &&
                                  <>
                                    <td style={{ display: display, backgroundColor: buyer.buttonH ? bgColorH : '' }}>
                                      <Stack gap={1} direction='horizontal'>
                                        {buyer.sf}
                                        {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, buyerIndex, 'buyers') }} /> */}
                                      </Stack>
                                    </td>
                                    <td style={{ display: display, backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.date}</td>
                                    <td style={{ display: display, backgroundColor: buyer.buttonH ? bgColorH : '' }}>{NumberFormat(buyer.summa)}</td>
                                    <td style={{ display: display, backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.akt}</td>
                                  </>
                                }
                              </tr>
                            )

                          })}
                        </tbody>
                      </Table>
                      {order.orderjson.comments &&
                        <Form.Control as="textarea" rows={4} disabled type='number' defaultValue={order.orderjson.comments} />
                      }

                    </div>
                  </Collapse >
                </>);
            })
          }
        </div >

        <Modal centered show={show} onHide={handleCloseModal} animation={true} >
          <Modal.Header closeButton>
            <Modal.Title>Подтверждение удаления заявки № {idForDeleteOrder}</Modal.Title>
          </Modal.Header>
          <Modal.Body>Точно удаляем?</Modal.Body>
          <Modal.Footer>

            <Button variant="secondary" onClick={handleCloseModal}>
              Еще подумаю
            </Button>
            <Button variant="primary" className='col-3' onClick={() => {
              if (idForDeleteOrder)
                deleteOrder(idForDeleteOrder);
              handleCloseModal();
            }}>
              Да
            </Button>

          </Modal.Footer>
        </Modal>
      </>
    );
  if (editMode) {
    return (
      <>
        {
          editMode && <EditOrder
            order={order}
            setOrder={setOrder}
            token={token}
            logOut={logOut}
            user={user}
            handleSetEditMode={handleSetEditMode}
            openEditedOrder={openEditedOrder}
          />
        }
      </>
    )
  }
}


export default AllOrders;
