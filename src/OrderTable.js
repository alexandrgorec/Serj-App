import './OrderTable.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';

function OrderTable({ handleShowNewSupplier, handleShowNewBuyer, order }) {

  return (
    <div className='newOrderTable'>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th> <Button variant="primary" size="sm" onClick={handleShowNewSupplier}>+</Button> Поставщик </th>
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
                <td><Button size="sm" variant="warning">н</Button> {supplier.name}</td>
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
            <th colspan='5'><Button variant="primary" size="sm" onClick={handleShowNewBuyer}>+</Button> Покупатель </th>
            <th>Менеджер</th>
            <th>Доставка</th>
          </tr>
        </thead>
        <tbody>
          {order.buyers.map((buyer) => {
            return (
              <tr>
                <td><Button size="sm" variant="warning">Н</Button>{buyer.name}</td>
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
    </div>
  );
}


export default OrderTable;