import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';




function BasicExample() {
let order = {
  suppliers:[],
  buyers:[],
};
let supplier = {
  supplierName:"ЮМА",
  typeOfProduct:"ДТ-Е-К5",
  leters:24057,
  tons:20.4,
  price:64300,
  driver:"",
  otk:0,
}
let buyer = {
  buyerName:"Слава",
  typeOfProduct:"ДТ-Е-К5",
  leters:24057,
  tons:"",
  price:47.6,
  manager:"Антон",
  otk:"",
}
order.suppliers.push({...supplier});
supplier.supplierName = "ТехРесурс";
order.suppliers.push({...supplier});

order.buyers.push({...buyer});
buyer.buyerName = "Вася";
order.buyers.push({...buyer});

  return (
  <>
<Table striped bordered hover>
      <thead align='center'>
        <tr>
          <th>Поставщик
                    <Button variant="primary" size="sm">+</Button>
          </th>
          <th>Вид продукта</th>
          <th>Литры</th>
          <th>Тонны</th>
          <th>Цена</th>
          <th>Водитель</th>
          <th>ОТК</th>
        </tr>
      </thead>
      <tbody>
      {order.suppliers.map( (supplier) => {
      return (
      <tr>
          <td><Button size="sm" variant="warning">Н</Button> {supplier.supplierName}</td>
          <td>{supplier.typeOfProduct}</td>
          <td>{supplier.liters}</td>
          <td>{supplier.tons}</td>
          <td>{supplier.price}</td>
          <td>{supplier.driver}</td>
          <td>{supplier.otk}</td>
        </tr>
      )})}
        
        </tbody>
          <thead>
        <tr>
          <th colspan='5'>Покупатель
           <Button variant="primary" size="sm">+</Button>
          </th>
          <th>Менеджер</th>
          <th>Доставка</th>
        </tr>
      </thead>
        <tbody>
      {order.buyers.map( (buyer) => {
      return (
      <tr>
          <td><Button size="sm" variant="warning">Н</Button>{buyer.buyerName}</td>
          <td>{buyer.typeOfProduct}</td>
          <td>{buyer.liters}</td>
          <td>{buyer.tons}</td>
          <td>{buyer.price}</td>
          <td>{buyer.manager}</td>
          <td>{buyer.otk}</td>
        </tr>
      )})}
      </tbody>
    </Table>
    <Button variant="success">Создать заявку</Button>
    </>
  );
}

export default BasicExample;