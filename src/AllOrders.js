import './AllOrders.css';
import Table from 'react-bootstrap/Table';
import { useState } from 'react';
import Collapse from 'react-bootstrap/Collapse';
import Button from 'react-bootstrap/Button';
import axios from 'axios';

const PORT = window.location.port === '3000' ? 3001 : window.location.port;


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

function AllOrders({ setAuth }) {
  const [openAll, setOpenAll] = useState(false);
  const [state, reload] = useState(false);
  const [orders, setOrders] = useState([]);
  const [needRequest, setNeedRequest] = useState(true)
  if (needRequest) {
    axios.post(`http://${window.location.hostname}:${PORT}/getallorders`)
      .then(function (response) {
        if (response.status === 202) {
          if (needRequest) {
            setNeedRequest(false);
            setOrders(response.data.map((order) => {
              order.open = false;
              return (order);
            }));
          }
        }

      })
      .catch(function (error) {
        console.log(error);
      });
  }
  return (
    <>
      <Button style={{ marginTop: '5px', marginBottom: '5px' }}
        onClick={() => {
          setOrders((orders) => {
            orders.map(order => {
              order.open = !openAll;
              return (order)
            })
            return (orders);
          })
          setOpenAll(!openAll);
        }}
      > {`${openAll ? "Свернуть все" : "Развернуть все"}`}
      </Button>
      <div className='allOrdersTable'>
        {
          orders.map((order, num) => {
            return (
              <>
                <Table className='tableClickable colorborder' striped bordered hover onClick={() => {
                  setOrders((orders) => {
                    orders[num].open = !orders[num].open;
                    return (orders)
                  })
                  reload(!state);
                }}>
                  <thead>
                    <tr>
                      <th width='2%' style={{ textAlign: 'center' }}>№</th>
                      <th width='4%'>Дата</th>
                      <th width='47%'>Поставщики</th>
                      <th width='47%'>Покупатели</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center', backgroundColor: 'rgb(238, 255, 0)' }}>{num + 1}</td>
                      <td>{formatDate(order.orderdate)}</td>
                      <td>{
                        order.orderjson.suppliers.map((item) => {
                          return (item.name + "; ")
                        })
                      }</td>
                      <td>{
                        order.orderjson.buyers.map((item) => {
                          return (item.name + "; ")
                        })
                      }</td>
                    </tr>
                  </tbody>
                </Table>
                <Collapse in={order.open}>
                  <Table className='tableClickable' striped bordered hover onClick={() => {
                    setOrders((orders) => {
                      orders[num].open = !orders[num].open;
                      return (orders)
                    })
                    reload(!state);
                  }}>
                    <thead>
                      <tr>
                        <th>Поставщик </th>
                        <th>Вид продукта</th>
                        <th>Литры</th>
                        <th>Тонны</th>
                        <th>Цена</th>
                        <th>Водитель</th>
                        <th>ОТК</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.orderjson.suppliers.map((supplier) => {
                        return (
                          <tr>
                            <td>{supplier.name}</td>
                            <td>{supplier.typeOfProduct}</td>
                            <td>{supplier.liters}</td>
                            <td>{supplier.tons}</td>
                            <td>{supplier.price}</td>
                            <td>{supplier.driver}</td>
                            <td>{supplier.otk}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <thead>
                      <tr>
                        <th colspan='5'>Покупатель </th>
                        <th>Менеджер</th>
                        <th>Доставка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.orderjson.buyers.map((buyer) => {
                        return (
                          <tr>
                            <td>{buyer.name}</td>
                            <td>{buyer.typeOfProduct}</td>
                            <td>{buyer.liters}</td>
                            <td>{buyer.tons}</td>
                            <td>{buyer.price}</td>
                            <td>{buyer.manager}</td>
                            <td>{buyer.otk}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </Collapse>
              </>);
          })
        }
      </div>
    </>
  );
}


export default AllOrders;