import './OrderTable.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import { BiEditAlt } from "react-icons/bi";

function OrderTable({ handleShowNewSupplier, handleShowNewBuyer, handleEditSupplier, handleEditBuyer, order }) {
  let size = window.innerWidth < 500 ? 'sm' : ''
  return (
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
          </tr>
        </thead>
        <tbody>
          {order.suppliers.map((supplier, index) => {
            return (
              <tr key={index}>
                <td>
                  <Stack gap={1} direction='horizontal'>
                    {supplier.name}
                    <BiEditAlt style={{color:'rgba(1, 87, 248, 0.85)'}} className='icon ms-auto' size="2em" onClick={() => handleEditSupplier(index)} />
                    <Button size="sm" variant="warning" >н</Button>
                  </Stack>
                </td>
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
            <th colSpan='5'><Button variant="primary" size={size} onClick={handleShowNewBuyer}>+</Button> Покупатель </th>
            <th>Менеджер</th>
            <th>Доставка</th>
          </tr>
        </thead>
        <tbody>
          {order.buyers.map((buyer, index) => {
            return (
              <tr key={index}>
                <td>
                  <Stack gap={1} direction='horizontal'>
                    {buyer.name}
                    <BiEditAlt style={{color:'rgba(1, 87, 248, 0.85)'}} className='icon ms-auto' size="2em" onClick={() => handleEditBuyer(index)} />
                    <Button size="sm" variant="warning" >н</Button>
                  </Stack>
                </td>
                <td>{buyer.typeOfProduct}</td>
                <td>{buyer.liters}</td>
                <td>{buyer.tons}</td>
                <td>{buyer.price}</td>
                <td>{buyer.manager}</td>
                <td></td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  );
}


export default OrderTable;