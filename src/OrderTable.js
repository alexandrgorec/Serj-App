import './OrderTable.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import { BiEditAlt } from "react-icons/bi";
import { useState, useEffect } from 'react';
import { MdDelete } from "react-icons/md";
import FinBlockEdit from './FinBlockEdit';


function OrderTable({ handleShowNewSupplier, handleShowNewBuyer, handleEditSupplier, handleEditBuyer, handleRefreshLitersForSale, setOrder, order, user, token, PORT, logOut }) {
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
              <th>Водитель</th>
              <th>ОТК</th>
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
                <tr key={index}>
                  <td>
                    <Stack gap={1} direction='horizontal'>
                      {supplier.name}
                      <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => handleEditSupplier(index)} />
                      {/* <Button size="sm" variant="warning" >н</Button> */}
                      <div className="vr" />
                      <MdDelete size='1.7em' className='icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                        setOrder(order => {
                          order.suppliers = order.suppliers.filter((item, ind) => ind != index)
                          return (order);
                        })
                        
                        reload(!state);
                        handleRefreshLitersForSale();
                      }}


                      />
                    </Stack>
                  </td>
                  <td>{supplier.typeOfProduct}</td>
                  <td>{supplier.liters}</td>
                  <td>{supplier.tons}</td>
                  <td>{supplier.price}</td>
                  <td>{supplier.driver}</td>
                  <td>{supplier.otk}</td>
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
                  <Button size={size} variant="warning" onClick={() => handleShowNewBuyer(true)}>н</Button>
                  Покупатель
                </Stack>
              </th>
              <th>Менеджер</th>
              <th>Доставка</th>
              {user.rights.finBlockAccess && <th style={{ display: display }} colSpan={4}></th>}
            </tr>
          </thead>
          <tbody>
            {order.buyers.map((buyer, index) => {
              return (
                <tr key={index}>
                  <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>
                    <Stack gap={1} direction='horizontal'>
                      {buyer.name}
                      <BiEditAlt style={{ color: 'rgba(1, 87, 248, 0.85)' }} className='icon ms-auto' size="2em" onClick={() => handleEditBuyer(index, buyer.buttonH)} />
                      {/* <Button size="sm" variant="warning" >н</Button> */}
                      <div className="vr" />
                      <MdDelete size='1.7em' className='icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                        setOrder(order => {
                          order.buyers = order.buyers.filter((item, ind) => ind != index)
                          return (order);
                        })
                        
                        reload(!state);
                        handleRefreshLitersForSale();
                      }}


                      />
                    </Stack>
                  </td>
                  <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.typeOfProduct}</td>
                  <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.liters}</td>
                  <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.tons}</td>
                  <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.price}</td>
                  <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}>{buyer.manager}</td>
                  <td style={{ backgroundColor: buyer.buttonH ? bgColorH : '' }}></td>
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
        PORT={PORT}
        suppliersOrBuyers={suppliersOrBuyers}
        logOut={logOut}
        token={token}
      />
    </>
  );
}


export default OrderTable;