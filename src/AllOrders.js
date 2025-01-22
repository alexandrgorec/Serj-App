import './AllOrders.css';
import Table from 'react-bootstrap/Table';
import { useEffect, useState } from 'react';
import Collapse from 'react-bootstrap/Collapse';
import Button from 'react-bootstrap/Button';
import axios from 'axios';

function AllOrders() {
  const [openAll, setOpenAll] = useState(false);
  const [state, reload] = useState(false);
  const [orders, setOrders] = useState([]);
  const [needRequest, setNeedRequest] = useState(true)
  if (needRequest) {
    axios.post(`http://${window.location.hostname}:3001/getallorders`)
      .then(function (response) {
        if (response.statusText === "OK") {
          if (needRequest) {
            setNeedRequest(false);
            setOrders(response.data.map((order) => {
              order.open = false;
              return (order);
            }));
            console.log("response is:", response.data);
          }
        }
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  console.log("orders is:", orders);
  return (
    <>
      <div style={{ backgroundColor: "rgb(25, 147, 188)", textAlign: "center", padding: "5px", userSelect: "none" }}>Все заявки</div>
      <Button style={{ marginTop: '5px', marginBottom: '5px' }}
        onClick={() => {
          setOrders( (orders) => {
            orders.map( order => {
              order.open = !openAll;
              return(order)
            })
            return(orders);
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
                <Table striped bordered hover onClick={() => {
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
                      <td style={{ textAlign: 'center' }}>{num + 1}</td>
                      <td>22.22.2025</td>
                      <td>{
                        order.suppliers.map((item) => {
                          return (item.name + "; ")
                        })
                      }</td>
                      <td>{
                        order.buyers.map((item) => {
                          return (item.name + "; ")
                        })
                      }</td>
                    </tr>
                  </tbody>
                </Table>
                <Collapse in={order.open}>
                  <Table striped bordered hover onClick={() => {
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
                      {order.suppliers.map((supplier) => {
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
                      {order.buyers.map((buyer) => {
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