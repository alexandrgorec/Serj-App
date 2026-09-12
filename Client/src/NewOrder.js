import OrderEditor from './OrderEditor';

function NewOrder({ order, setOrder }) {
  return <OrderEditor mode="new" order={order} setOrder={setOrder} />;
}

export default NewOrder;
