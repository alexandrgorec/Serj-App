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
import { FaPeopleArrows, FaPrint } from "react-icons/fa6";
import { FormLabel } from 'react-bootstrap';
import { Typeahead } from "react-bootstrap-typeahead";


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

function buyerNamesFromOrder(orderjson) {
  const out = [];
  const buyers = orderjson?.buyers || [];
  buyers.forEach((b) => {
    if (b?.name != null && String(b.name).trim() !== '') out.push(String(b.name).trim());
    if (b?.buyersH?.length) {
      b.buyersH.forEach((h) => {
        if (h?.name != null && String(h.name).trim() !== '') out.push(String(h.name).trim());
      });
    }
  });
  return out;
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
  const [buyerFilter, setBuyerFilter] = useState('');
  const buyerTypeaheadRef = useRef(null);
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

  const buyerOptions = Array.from(new Set(
    orders
      .flatMap((o) => buyerNamesFromOrder(o?.orderjson))
      .map((s) => String(s).trim())
      .filter((s) => s !== '')
  ));



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
  const isPhone = window.innerWidth <= 480;
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

  const printOrder = (id) => {
    const token = window.localStorage.token || '';
    const baseUrl = aAxios?.defaults?.baseURL || `http://${window.location.hostname}:3001`;
    const printUrl = `${baseUrl}/user/printorder/${id}?token=${encodeURIComponent(token)}`;
    const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      setToast('Разрешите всплывающие окна, чтобы открыть печать', 'warning');
    }
  }



  useEffect(() => {
    getAllOrders();
    openEditedOrder();
  }, [null])


  const NumberFormat = (num) => {
    if (num === undefined || num === null) return '';
    let s = String(num).trim();
    if (s === '') return '';

    // normalize: remove spaces, unify decimal separator to "."
    const originalHadComma = s.includes(',');
    s = s.replace(/\s/g, '').replace(/,/g, '.');

    // keep sign, and DO NOT round fractional part
    const sign = s.startsWith('-') ? '-' : '';
    if (sign) s = s.slice(1);

    const [intRaw, fracRaw] = s.split('.');
    if (!intRaw || !/^\d+$/.test(intRaw)) return '';

    const intFormatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(intRaw));
    if (fracRaw === undefined) return sign + intFormatted;
    if (!/^\d+$/.test(fracRaw)) return sign + intFormatted;

    const decSep = originalHadComma ? ',' : '.';
    return sign + intFormatted + decSep + fracRaw;
  }
  const filterEmptyBuyerH = !!refFilter.current?.checked;
  const filterSumH = !!refFilterSumH.current?.checked;
  const q = String(buyerFilter || '').trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchBuyer =
      q === '' ||
      buyerNamesFromOrder(order.orderjson)
        .some((n) => String(n).toLowerCase().includes(q));

    if (!matchBuyer) return false;
    if (!filterEmptyBuyerH && !filterSumH) return true;
    const matchEmptyBuyerH = !!order.orderjson.haveEmptyBuyerH;
    const matchSumH = emptyBuyerHSummasDisplay(order.orderjson.buyers) !== '';
    if (filterEmptyBuyerH && !filterSumH) return matchEmptyBuyerH;
    if (!filterEmptyBuyerH && filterSumH) return matchSumH;
    return matchEmptyBuyerH && matchSumH;
  });
  return (
    <>
      <Stack direction='horizontal' gap={2} className='allOrders-toolbar'>
        <div className='allOrders-controls-row'>
          <Button
            className='allOrders-toggleAllBtn'
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

          <div className='allOrders-switches-row'>
            <FormLabel className='noselect clickable mb-0'>
              <Stack direction='horizontal' gap={2}>
                <Form.Check className='noselect' ref={refFilter} onClick={() => { reload(!state) }}
                  type="switch"
                />
                Фильтр <FaPeopleArrows style={{ color: 'rgba(16, 188, 45, 0.79)' }} />
              </Stack>
            </FormLabel>
            <FormLabel className='noselect clickable mb-0'>
              <Stack direction='horizontal' gap={2}>
                <Form.Check className='noselect' ref={refFilterSumH} onClick={() => { reload(!state) }}
                  type="switch"
                />
                Фильтр ∑ &quot;H&quot;
              </Stack>
            </FormLabel>
          </div>
        </div>

        <div className="allOrders-buyerFilter">
          <Typeahead
            id="allorders-buyer-filter"
            ref={buyerTypeaheadRef}
            options={buyerOptions}
            className="allOrders-buyerTypeahead"
            selected={buyerFilter ? [buyerFilter] : []}
            onChange={(selected) => {
              const v = selected.length ? String(selected[0]) : '';
              setBuyerFilter(v);
              reload(!state);
            }}
            onInputChange={(text) => {
              setBuyerFilter(text);
            }}
            placeholder="Фильтр покупатель…"
            highlightOnlyResult
            inputProps={{ type: 'text', style: { fontSize: window.innerWidth < 850 ? '12px' : '14px' } }}
          />
        </div>

      </Stack>
      {isPhone &&
        <div className='allOrdersCards noselect'>
          {filteredOrders.map((order) => {
            const emptyHSummas = emptyBuyerHSummasDisplay(order.orderjson.buyers);
            const orderIndex = orders.findIndex((o) => o.id === order.id);
            const toggleRow = () => {
              if (orderIndex >= 0) showHideOrder(orderIndex);
            };
            return (
              <div key={order.id} className={`allOrders-card ${order.orderjson.haveEmptyBuyerH ? 'allOrders-card-warning' : ''}`}>
                <div className='allOrders-card-header clickable' onClick={toggleRow}>
                  <div className='allOrders-card-id'>Заявка №{order.id}</div>
                  <div className='allOrders-card-date'>{formatDate(order.orderjson.date)}</div>
                  <Stack direction="horizontal" gap={2} className="allOrders-card-actions">
                    <BiEditAlt size='1.6em' className='clickable icon' style={{ color: 'rgba(1, 87, 248, 0.85)' }} onClick={(e) => {
                      e.stopPropagation();
                      setEditingOrder(() => order.orderjson);
                      navigate("/editorder");
                    }} />
                    <MdDelete size='1.6em' className='clickable icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={(e) => {
                      e.stopPropagation();
                      setIdForDeleteOrder(order.id);
                      handleShowModal();
                    }} />
                  </Stack>
                </div>

                <div className='allOrders-card-body clickable' onClick={toggleRow}>
                  <div className='allOrders-card-summaryGrid'>
                    <div className='allOrders-card-row'>
                      <div className='allOrders-card-label'>Покупатели</div>
                      <div className='allOrders-card-value'>{spisok(order.orderjson.buyers) || '—'}</div>
                    </div>
                    <div className='allOrders-card-row'>
                      <div className='allOrders-card-label'>Поставщики</div>
                      <div className='allOrders-card-value'>{spisok(order.orderjson.suppliers) || '—'}</div>
                    </div>
                    {emptyHSummas !== '' &&
                      <div className='allOrders-card-row allOrders-card-row-full'>
                        <div className='allOrders-card-label'>Суммы "H"</div>
                        <div className='allOrders-card-value'>{emptyHSummas}</div>
                      </div>
                    }
                  </div>
                </div>

                <Collapse in={order.open}>
                  <div className='allOrders-card-details'>
                    <div className='allOrders-card-section'>
                      <div className='allOrders-card-section-title'>Поставщики</div>
                      {order.orderjson.suppliers.map((supplier, supplierIndex) => (
                        <div className='allOrders-card-item' key={`sup-${order.id}-${supplierIndex}`}>
                          <div className='allOrders-card-item-title'>{supplier.name || 'Без имени'}</div>
                          <div className='allOrders-card-item-line'>{supplier.typeOfProduct || 'Без типа продукта'}</div>
                          <div className='allOrders-card-item-line'>
                            Л: {NumberFormat(supplier.liters) || '—'} | Т: {NumberFormat(supplier.tons) || '—'} | Цена: {NumberFormat(supplier.price) || '—'}
                          </div>
                          {user.rights.finBlockAccess &&
                            <div className='allOrders-card-item-line'>
                              С/Ф: {supplier.sf || '—'} | Сумма: {NumberFormat(supplier.summa) || '—'} | Акт: {supplier.akt || '—'}
                            </div>
                          }
                          {supplierIndex === 0 &&
                            <div className='allOrders-card-item-line allOrders-card-delivery'>
                              ИП: {order.orderjson.ip || '—'} | Водитель: {order.orderjson.driver || '—'} | Доставка: {NumberFormat(order.orderjson.cost) || '—'} | ОТК: {order.orderjson.otk || '—'}
                            </div>
                          }
                        </div>
                      ))}
                    </div>

                    <div className='allOrders-card-section'>
                      <div className='allOrders-card-section-title'>Покупатели</div>
                      {order.orderjson.buyers.map((buyer, buyerIndex) => (
                        <div className='allOrders-card-item' key={`buy-${order.id}-${buyerIndex}`}>
                          <div className='allOrders-card-item-title'>{buyer.name || 'Без имени'}</div>
                          <div className='allOrders-card-item-line'>Тип: {buyer.typeOfProduct || '—'} | Менеджер: {buyer.manager || '—'}</div>
                          <div className='allOrders-card-item-line'>
                            Л: {NumberFormat(buyer.liters) || '—'} | Т: {NumberFormat(buyer.tons) || '—'} | Цена: {NumberFormat(buyer.price) || '—'}
                          </div>
                          {user.rights.finBlockAccess &&
                            <div className='allOrders-card-item-line'>
                              С/Ф: {buyer.sf || '—'} | Сумма: {NumberFormat(buyer.summa) || '—'} | Акт: {buyer.akt || '—'}
                            </div>
                          }
                          {buyer.buyersH?.map((buyerH, indexBuyerH) => (
                            <div className='allOrders-card-subitem' key={`bh-${order.id}-${buyerIndex}-${indexBuyerH}`}>
                              <div className='allOrders-card-item-line'>
                                H: {buyerH.name || 'Без имени'} | {buyerH.typeOfProduct || 'Без типа'}
                              </div>
                              <div className='allOrders-card-item-line'>
                                Л: {NumberFormat(buyerH.liters) || '—'} | Т: {NumberFormat(buyerH.tons) || '—'} | Цена: {NumberFormat(buyerH.price) || '—'}
                              </div>
                              {user.rights.finBlockAccess &&
                                <div className='allOrders-card-item-line'>
                                  С/Ф: {buyerH.sf || '—'} | Сумма: {NumberFormat(buyerH.summa) || '—'} | Акт: {buyerH.akt || '—'}
                                </div>
                              }
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {order.orderjson.comments &&
                      <Form.Control className='allOrders-card-comments' as="textarea" rows={3} disabled type='number' defaultValue={order.orderjson.comments} />
                    }
                  </div>
                </Collapse>
              </div>
            );
          })}
        </div>
      }
      {!isPhone &&
      <div className='allOrdersTable noselect'>
        <Table
          className={`allOrders-main-table ${isPhone ? 'allOrders-main-table-compact' : ''}`}
          striped
          bordered
          hover
          style={{ width: '100%', margin: 0 }}
        >
          <colgroup>
            <col className="allOrders-col-num" />
            <col className="allOrders-col-date" />
            <col className="allOrders-col-buyers" />
            {!isPhone && <col className="allOrders-col-hsum" />}
            <col className="allOrders-col-suppliers" />
            <col className="allOrders-col-menu" />
          </colgroup>
          <thead>
            <tr>
              <th className="allOrders-head-num" style={{ textAlign: 'center' }}>№</th>
              <th className="allOrders-head-date">Дата</th>
              <th className="allOrders-head-buyers">Покупатели</th>
              {!isPhone && <th className="allOrders-head-hsum" title='Суммы подпокупателей (buyerH) без заполненного имени'>Суммы &quot;H&quot;</th>}
              <th className="allOrders-head-suppliers">Поставщики</th>
              <th className="allOrders-th-menu">Меню</th>
            </tr>
          </thead>
          <tbody>
        {
          filteredOrders.map((order) => {
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

                      <td className="allOrders-cell-num" style={{ overflow: "hidden", textAlign: 'center', backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>{order.id}</td>
                      <td className="allOrders-cell-date" style={{ overflow: "hidden", backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }} >{formatDate(order.orderjson.date)}</td>
                      <td className="allOrders-cell-buyers" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>{
                        <Stack direction="horizontal" gap={3} className="allOrders-buyers-stack" >
                          {
                            order.orderjson.haveEmptyBuyerH && < FaPeopleArrows style={{ color: 'rgba(16, 188, 45, 0.79)' }} />
                          }
                          {
                            spisok(order.orderjson.buyers)
                          }
                        </Stack>
                      }</td>

                      {!isPhone &&
                        <td className="allOrders-cell-hsum" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '', overflow: 'hidden', fontSize: '0.9em' }} title={emptyHSummas}>
                          {emptyHSummas}
                        </td>
                      }

                      <td className="allOrders-cell-suppliers" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                        {spisok(order.orderjson.suppliers)}
                      </td>
                      <td className="allOrders-td-menu" style={{ backgroundColor: order.orderjson.haveEmptyBuyerH ? bgColorH : '' }}>
                        <Stack direction="horizontal" gap={2} className="allOrders-menu-stack">
                          <FaPrint title='Печать заявки' size='1.3em' className='clickable icon' style={{ color: 'rgba(47, 79, 112, 0.95)' }} onClick={(e) => {
                            e.stopPropagation();
                            printOrder(order.id);
                          }} />
                          <div className="vr" />
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
                  <td colSpan={isPhone ? 5 : 6} className="p-0 border-top-0">
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
                                    <td style={{ display: display }}>
                                      <Stack gap={1} direction='horizontal'>
                                        {buyer.sf}
                                        {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, buyerIndex, 'buyers') }} /> */}
                                      </Stack>
                                    </td>
                                    <td style={{ display: display }}>{buyer.date}</td>
                                    <td style={{ display: display }}>{NumberFormat(buyer.summa)}</td>
                                    <td style={{ display: display }}>{buyer.akt}</td>
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
                                          <td style={{ backgroundColor: bgColorH, display: display }}>
                                            <Stack gap={1} direction='horizontal'>
                                              {buyerH.sf}
                                              {/* <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => { handleEditFinBlock(num, order.id, buyerIndex, 'buyers') }} /> */}
                                            </Stack>
                                          </td>
                                          <td style={{ backgroundColor: bgColorH, display: display }}>{buyerH.date}</td>
                                          <td style={{ backgroundColor: bgColorH, display: display }}>{NumberFormat(buyerH.summa)}</td>
                                          <td style={{ backgroundColor: bgColorH, display: display }}>{buyerH.akt}</td>
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
      }

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
