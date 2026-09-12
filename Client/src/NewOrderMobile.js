import EditOrderMobile from './EditOrderMobile';

function NewOrderMobile({ order, setOrder, onSave = () => {} }) {
  return (
    <EditOrderMobile
      mode="new"
      order={order}
      setOrder={setOrder}
      onSave={onSave}
      saveLabel="Записать"
    />
  );
}

export default NewOrderMobile;
