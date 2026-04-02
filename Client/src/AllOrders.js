import './AllOrders.css';
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';
import { useState, useEffect, useContext, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import Collapse from 'react-bootstrap/Collapse';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { BiEditAlt } from "react-icons/bi";
import { MdDelete } from "react-icons/md";
import { userContext } from './App';
import { FaPeopleArrows } from "react-icons/fa6";
import { FormLabel } from 'react-bootstrap';


function spisok(array) {
  {
    let result = [];
    array.forEach(item => {
      if (!result.includes(item.name))
        result.push(item.name);
      if (item.buyersH) {
        item.buyersH.forEach(itemH => {
          if (!result.includes(itemH.name) && itemH.name != '')
            result.push(itemH.name);
        })
      }
    });
    return (result.join('; '));
  }
}

/** Суммы из buyerH, у которых имя подпокупателя не заполнено (как в списке заявок). */
function formatSummaCell(num) {
  if (num === undefined || num === null || num === '') return '';
  let n = num;
  if (typeof n === 'string')
    n = n.replace(/\s/g, '').replace(/,/g, '.');
  if (n === '' || Number.isNaN(Number(n))) return '';
  return new Intl.NumberFormat().format(Number(n));
}

function emptyBuyerHSummasDisplay(buyers) {
  if (!buyers?.length) return '';
  const parts = [];
  buyers.forEach((buyer) => {
    if (!buyer.buyersH?.length) return;
    buyer.buyersH.forEach((h) => {
      if (h.name != null && String(h.name).trim() !== '') return;
      const formatted = formatSummaCell(h.summa);
      if (formatted !== '') parts.push(formatted);
    });
  });
  return parts.join('; ');
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
  const { user, setToast, aAxios, setEditingOrder } = useContext(userContext);
  const navigate = useNavigate();
  const refFilter = useRef(null);
  const refFilterSumH = useRef(null);
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

  const bgColorH = 'rgba(127, 244, 166, 0.49)';


  const [orders, setOrders] = useState([]);



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
  const [allExpanded, setAllExpanded] = useState(false);



  const getAllOrders = (firstUpload = true) => {
    const oldOrders = orders;
    aAxios.post(`/user/getallorders`)
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

      });
  }

  const deleteOrder = (id) => {
    aAxios.post(`/user/deleteorder`, {
      id
    })
      .then(function (response) {
        if (response.status === 202) {
          getAllOrders(false);
          setToast(`Заявка №${id} удалена`)
        }
      })
      .catch(function (error) {
      });
  }



  useEffect(() => {
    getAllOrders();
    openEditedOrder();
  }, [null])


  const NumberFormat = (num) => {
    if (typeof (num) == 'string')
      num = num.replace(/\s/g, '').replace(/,/g, '.')
    let res = new Intl.NumberFormat().format(num);
    if (!num)
      res = '';
    return res;
  }
  return (
    <>
      <Stack direction='horizontal' gap={2}>
        <Button style={{ margin: '5px', marginLeft: '0' }}
          onClick={() => {
            const next = !allExpanded;
            setOrders((orders) => {
              orders.map(order => {
                order.open = next;
                return (order)
              })
              return (orders);
            })
            setAllExpanded(next);
            reload(!state);
          }}
        > {allExpanded ? 'Свернуть все' : 'Развернуть все'}
        </Button>

        <FormLabel className='noselect clickable'>
          <Stack direction='horizontal' gap={2}>
            <Form.Check className='noselect' ref={refFilter} onClick={() => { reload(!state) }}
              type="switch"
            />
            Фильтр <FaPeopleArrows style={{ color: 'rgba(16, 188, 45, 0.79)' }} />
          </Stack>
        </FormLabel>

        <FormLabel className='noselect clickable'>
          <Stack direction='horizontal' gap={2}>
            <Form.Check className='noselect' ref={refFilterSumH} onClick={() => { reload(!state) }}
              type="switch"
            />
            Фильтр суммы &quot;H&quot;
          </Stack>
        </FormLabel>

      </Stack>
      <div className='allOrdersTable noselect'>
        <Table
          className="allOrders-main-table"
          striped
          bordered
          hover
          style={{ tableLayout: 'fixed', width: '100%', margin: 0 }}
        >
          <colgroup>
            <col className="allOrders-col-num" />
            <col className="allOrders-col-date" />
            <col className="allOrders-col-buyers" />
            <col className="allOrders-col-hsum" />
            <col className="allOrders-col-suppliers" />
            <col className="allOrders-col-menu" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>№</th>
              <th>Дата</th>
              <th>Покупатели</th>
              <th title='Суммы подпокупателей (buyerH) без заполненного имени'>Суммы &quot;H&quot;</th>
              <th>Поставщики</th>
              <th className="allOrders-th-menu">Меню</th>
            </tr>
          </thead>
          <tbody>
        {
          orders.filter((order) => {
            const filterEmptyBuyerH = refFilter.current?.checked;
            const filterSumH = refFilterSumH.current?.checked;
            if (!filterEmptyBuyerH && !filterSumH) return true;
            const matchEmptyBuyerH = !!order.orderjson.haveEmptyBuyerH;
            const matchSumH = emptyBuyerHSummasDisplay(order.orderjson.buyers) !== '';
            if (filterEmptyBuyerH && !filterSumH) return matchEmptyBuyerH;
            if (!filterEmptyBuyerH && filterSumH) return matchSumH;
            return matchEmptyBuyerH && matchSumH;
          }).map((order, num) => {
            const emptyHSummas = emptyBuyerHSummasDisplay(order.orderjson.buyers);
            const orderIndex = orders.findIndex((o) => o.id === order.id);
            const toggleRow = () => {
              if (orderIndex >= 0) showHideOrder(orderIndex);
            };
            return (
              <Fragment key={order.id}>
                <tr
                  id={`order-${order.id}`}
                  className='colorborder clickable'
                  onClick={toggleRow}
                  onDoubleClick={() => {
                    toggleRow();
                    setEditingOrder(() => order.orderjson);
                    navigate("/editorder");
                  }}
                >

                      <td style={{ overflow: "hidden", textAlign: 'center', backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>{order.id}</td>
                      <td style={{ overflow: "hidden", backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }} >{formatDate(order.orderjson.date)}</td>
                      <td style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>{
                        <Stack direction="horizontal" gap={3} >
                          {
                            order.orderjson.haveEmptyBuyerH && < FaPeopleArrows style={{ color: 'rgba(16, 188, 45, 0.79)' }} />
                          }
                          {
                            spisok(order.orderjson.buyers)
                          }
                        </Stack>
                      }</td>

                      <td style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '', overflow: 'hidden', fontSize: '0.9em' }} title={emptyHSummas}>
                        {emptyHSummas}
                      </td>

                      <td style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                        {spisok(order.orderjson.suppliers)}
                      </td>
                      <td className="allOrders-td-menu" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                        <Stack direction="horizontal" gap={1} className="allOrders-menu-stack">
                          <BiEditAlt size='1.7em' className='clickable icon' style={{ color: 'rgba(1, 87, 248, 0.85)' }} onClick={(e) => {
                            e.stopPropagation();
                            if (orderIndex >= 0) showHideOrder(orderIndex);
                            setEditingOrder(() => order.orderjson);
                            navigate("/editorder");
                          }} />
                          <div className="vr" />
                          <MdDelete size='1.7em' className='clickable icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={(e) => {
                            e.stopPropagation();
                            if (orderIndex >= 0) showHideOrder(orderIndex)
                            setIdForDeleteOrder(order.id);
                            handleShowModal();
                          }} />


                        </Stack>
                      </td>

                    </tr>
                <tr className="allOrders-expand-row">
                  <td colSpan={6} className="p-0 border-top-0">
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
                            <>
                              <tr key={buyerIndex} >
                                <td>
                                  <Stack gap={1} direction='horizontal'>
                                    {buyer.name}
                                    {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditBuyer(num, order.id, buyerIndex) }} /> */}
                                    {/* <Button size="sm" variant="warning" >н</Button> */}
                                  </Stack>
                                </td>
                                <td >{buyer.typeOfProduct}</td>
                                <td >{NumberFormat(buyer.liters)}</td>
                                <td >{NumberFormat(buyer.tons)}</td>
                                <td >{NumberFormat(buyer.price)}</td>
                                <td colSpan='4' >{buyer.manager}</td>

                                {user.rights.finBlockAccess &&
                                  <>
                                    <td >
                                      <Stack gap={1} direction='horizontal'>
                                        {buyer.sf}
                                        {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, buyerIndex, 'buyers') }} /> */}
                                      </Stack>
                                    </td>
                                    <td >{buyer.date}</td>
                                    <td >{NumberFormat(buyer.summa)}</td>
                                    <td >{buyer.akt}</td>
                                  </>
                                }
                              </tr>






                              {
                                buyer.buyersH && buyer.buyersH.map((buyerH, indexBuyerH) => {
                                  return (
                                    <tr key={indexBuyerH} >
                                      <td style={{ backgroundColor: bgColorH }}>
                                        <Stack gap={1} direction='horizontal'>
                                          {buyerH.name}
                                          {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditBuyer(num, order.id, buyerIndex) }} /> */}
                                          {/* <Button size="sm" variant="warning" >н</Button> */}
                                        </Stack>
                                      </td>
                                      <td style={{ backgroundColor: bgColorH }}>{buyerH.typeOfProduct}</td>
                                      <td style={{ backgroundColor: bgColorH }}>{NumberFormat(buyerH.liters)}</td>
                                      <td style={{ backgroundColor: bgColorH }}>{NumberFormat(buyerH.tons)}</td>
                                      <td style={{ backgroundColor: bgColorH }}>{NumberFormat(buyerH.price)}</td>
                                      <td style={{ backgroundColor: bgColorH }} colSpan='4' >{buyerH.manager}</td>

                                      {user.rights.finBlockAccess &&
                                        <>
                                          <td style={{ backgroundColor: bgColorH }}>
                                            <Stack gap={1} direction='horizontal'>
                                              {buyerH.sf}
                                              {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, buyerIndex, 'buyers') }} /> */}
                                            </Stack>
                                          </td>
                                          <td style={{ backgroundColor: bgColorH }}>{buyerH.date}</td>
                                          <td style={{ backgroundColor: bgColorH }}>{NumberFormat(buyerH.summa)}</td>
                                          <td style={{ backgroundColor: bgColorH }}>{buyerH.akt}</td>
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
                    {order.orderjson.comments &&
                      <Form.Control as="textarea" rows={4} disabled type='number' defaultValue={order.orderjson.comments} />
                    }

                  </div>
                </Collapse >
                  </td>
                </tr>
              </Fragment>
            );
          })}
          </tbody>
        </Table>
      </div >

      <Modal centered show={show} onHide={handleCloseModal}
        animation={true} >
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
}


export default AllOrders;
